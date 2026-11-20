const mongoose = require('mongoose');
const WebpushrCampaign = require('../models/WebpushrCampaign');
const WebpushrCampaignSubscriber = require('../models/WebpushrCampaignSubscriber');
const { sendWebpushrNotification } = require('./webpushrService');

// In-memory active workers registry to manage concurrency and pause/resume per campaign
const activeCampaignWorkers = new Map();

/**
 * Helper to update campaign counts atomically in database
 */
async function updateCampaignStats(campaignId) {
  const objectId = typeof campaignId === 'string' ? new mongoose.Types.ObjectId(campaignId) : campaignId;

  const counts = await WebpushrCampaignSubscriber.aggregate([
    { $match: { campaignId: objectId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const stats = {
    pendingCount: 0,
    processingCount: 0,
    successCount: 0,
    failedCount: 0
  };

  counts.forEach(c => {
    if (c._id === 'pending') stats.pendingCount = c.count;
    if (c._id === 'processing') stats.processingCount = c.count;
    if (c._id === 'success') stats.successCount = c.count;
    if (c._id === 'failed') stats.failedCount = c.count;
  });

  const campaign = await WebpushrCampaign.findById(objectId);
  if (!campaign) return null;

  campaign.pendingCount = stats.pendingCount;
  campaign.processingCount = stats.processingCount;
  campaign.successCount = stats.successCount;
  campaign.failedCount = stats.failedCount;

  // Check overall campaign status
  if (stats.pendingCount === 0 && stats.processingCount === 0) {
    if (stats.failedCount > 0 && stats.successCount > 0) {
      campaign.campaignStatus = 'completed_with_errors';
    } else if (stats.failedCount > 0 && stats.successCount === 0) {
      campaign.campaignStatus = 'failed';
    } else if (stats.successCount > 0) {
      campaign.campaignStatus = 'completed';
    }
    if (!campaign.completedAt && (stats.failedCount > 0 || stats.successCount > 0)) {
      campaign.completedAt = new Date();
    }
    campaign.isPaused = false;
  }

  await campaign.save();
  return campaign;
}

/**
 * Worker runner loop for a campaign
 */
async function processCampaignQueue(campaignId) {
  const campaignKey = campaignId.toString();

  // Avoid running duplicate worker loops for the same campaign
  if (activeCampaignWorkers.has(campaignKey)) {
    console.log(`[Worker] Campaign ${campaignKey} already has an active worker.`);
    return;
  }

  activeCampaignWorkers.set(campaignKey, { shouldStop: false });
  console.log(`[Worker] Started worker loop for campaign ${campaignKey}`);

  const concurrency = parseInt(process.env.CONCURRENCY, 10) || 5;
  const maxRetries = parseInt(process.env.MAX_RETRIES, 10) || 3;
  const rateLimitDelayMs = parseInt(process.env.RATE_LIMIT_DELAY_MS, 10) || 200;

  try {
    while (true) {
      const workerState = activeCampaignWorkers.get(campaignKey);
      if (!workerState || workerState.shouldStop) {
        console.log(`[Worker] Worker loop stopped for campaign ${campaignKey} (Paused or Terminated).`);
        break;
      }

      // Check current campaign status in DB
      const currentCampaign = await WebpushrCampaign.findById(campaignId);
      if (!currentCampaign || currentCampaign.isPaused || currentCampaign.campaignStatus === 'paused') {
        console.log(`[Worker] Campaign ${campaignKey} is marked paused in DB. Halting loop.`);
        break;
      }

      // Fetch a batch of pending subscribers
      const pendingSubscribers = await WebpushrCampaignSubscriber.find({
        campaignId,
        status: 'pending'
      }).limit(concurrency);

      if (!pendingSubscribers || pendingSubscribers.length === 0) {
        console.log(`[Worker] No more pending subscribers for campaign ${campaignKey}.`);
        break;
      }

      // Mark this batch as processing
      const subscriberIds = pendingSubscribers.map(s => s._id);
      await WebpushrCampaignSubscriber.updateMany(
        { _id: { $in: subscriberIds } },
        { $set: { status: 'processing' } }
      );

      // Process batch with concurrency
      await Promise.all(
        pendingSubscribers.map(async (subscriber) => {
          let attemptSuccess = false;
          let retryCount = subscriber.retryCount || 0;
          let lastResult = null;

          // Attempt send with exponential backoff on retryable errors (e.g. 429)
          while (!attemptSuccess && retryCount <= maxRetries) {
            const sendParams = {
              sid: subscriber.subscriberId,
              title: currentCampaign.notification.title,
              message: currentCampaign.notification.message,
              target_url: currentCampaign.notification.target_url,
              icon: currentCampaign.notification.icon,
              expire_push: currentCampaign.notification.expire_push,
              auto_hide: currentCampaign.notification.auto_hide,
              send_at: currentCampaign.notification.send_at,
              action_buttons: currentCampaign.notification.action_buttons
            };

            const result = await sendWebpushrNotification(sendParams);
            lastResult = result;

            if (result.success) {
              attemptSuccess = true;
              break;
            }

            // If error is retryable (e.g. rate limit 429 or network glitch) and retry quota remains
            if (result.isRetryable && retryCount < maxRetries) {
              retryCount += 1;
              const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
              console.warn(`[Worker] Retryable error for SID ${subscriber.subscriberId} (attempt ${retryCount}). Waiting ${backoffMs}ms...`);
              await new Promise(r => setTimeout(r, backoffMs));
            } else {
              // Permanent error (e.g. invalid SID format, bad payload, or max retries exceeded)
              break;
            }
          }

          // Record attempt history item
          const attemptRecord = {
            attemptNumber: (subscriber.retryCount || 0) + 1,
            attemptedAt: new Date(),
            requestPayload: lastResult?.payload || null,
            responseStatusCode: lastResult?.statusCode || 0,
            responseBody: lastResult?.data || null,
            errorMessage: lastResult?.error || (attemptSuccess ? null : 'Failed to send notification'),
            status: attemptSuccess ? 'success' : 'failed'
          };

          // Save final subscriber status immediately in DB
          subscriber.status = attemptSuccess ? 'success' : 'failed';
          subscriber.requestPayload = lastResult?.payload || null;
          subscriber.responseStatusCode = lastResult?.statusCode || 0;
          subscriber.responseBody = lastResult?.data || null;
          subscriber.errorMessage = lastResult?.error || (attemptSuccess ? null : 'Notification send failed');
          subscriber.retryCount = retryCount;
          subscriber.lastAttemptAt = new Date();
          if (attemptSuccess) {
            subscriber.sentAt = new Date();
          }
          subscriber.attemptHistory.push(attemptRecord);

          await subscriber.save();
        })
      );

      // Update statistics after batch
      await updateCampaignStats(campaignId);

      // Polite delay between batches to respect rate limits
      if (rateLimitDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, rateLimitDelayMs));
      }
    }
  } catch (err) {
    console.error(`[Worker] Error processing campaign ${campaignKey}:`, err);
  } finally {
    activeCampaignWorkers.delete(campaignKey);
    await updateCampaignStats(campaignId);
    console.log(`[Worker] Cleaned up worker for campaign ${campaignKey}.`);
  }
}

/**
 * Start campaign sending process
 */
async function startCampaign(campaignId) {
  const campaign = await WebpushrCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.campaignStatus === 'completed' && campaign.pendingCount === 0) {
    throw new Error('Campaign is already completed');
  }

  campaign.campaignStatus = 'processing';
  campaign.isPaused = false;
  if (!campaign.startedAt) {
    campaign.startedAt = new Date();
  }
  await campaign.save();

  // Reset any stuck 'processing' records from previous crash/restart to 'pending'
  await WebpushrCampaignSubscriber.updateMany(
    { campaignId, status: 'processing' },
    { $set: { status: 'pending' } }
  );

  // Trigger worker asynchronously
  setImmediate(() => {
    processCampaignQueue(campaignId).catch(err => {
      console.error('[Worker] Fatal error in campaign worker:', err);
    });
  });

  return campaign;
}

/**
 * Pause campaign sending
 */
async function pauseCampaign(campaignId) {
  const campaignKey = campaignId.toString();
  const worker = activeCampaignWorkers.get(campaignKey);
  if (worker) {
    worker.shouldStop = true;
  }

  const campaign = await WebpushrCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  campaign.isPaused = true;
  campaign.campaignStatus = 'paused';
  await campaign.save();

  // Any currently processing in db will revert to pending once safe
  await WebpushrCampaignSubscriber.updateMany(
    { campaignId, status: 'processing' },
    { $set: { status: 'pending' } }
  );

  await updateCampaignStats(campaignId);
  return campaign;
}

/**
 * Resume campaign sending
 */
async function resumeCampaign(campaignId) {
  return await startCampaign(campaignId);
}

/**
 * Retry failed subscribers
 * @param {string} campaignId
 * @param {Array<string>} [selectedSubscriberIds] optional specific IDs to retry
 */
async function retryFailedSubscribers(campaignId, selectedSubscriberIds = null) {
  const campaign = await WebpushrCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  const query = {
    campaignId,
    status: 'failed'
  };

  if (Array.isArray(selectedSubscriberIds) && selectedSubscriberIds.length > 0) {
    query.subscriberId = { $in: selectedSubscriberIds };
  }

  // Reset failed to pending
  const result = await WebpushrCampaignSubscriber.updateMany(query, {
    $set: {
      status: 'pending',
      errorMessage: null
    }
  });

  await updateCampaignStats(campaignId);

  // Resume processing automatically
  await startCampaign(campaignId);

  return {
    retriedCount: result.modifiedCount,
    campaign
  };
}

module.exports = {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  retryFailedSubscribers,
  updateCampaignStats
};
