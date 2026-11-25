const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const WebpushrCampaign = require('../models/WebpushrCampaign');
const WebpushrCampaignSubscriber = require('../models/WebpushrCampaignSubscriber');
const WebpushrTestNotification = require('../models/WebpushrTestNotification');
const {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  retryFailedSubscribers,
  updateCampaignStats
} = require('../services/campaignQueueService');
const { sendWebpushrNotification, sendWebpushrSegmentNotification } = require('../services/webpushrService');

// Configure multer for file uploads in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
  fileFilter: (req, file, cb) => {
    // Be lenient with mimetypes as different browsers / OS report various types
    const isAllowedExt = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (isAllowedExt || !file.mimetype || file.mimetype === 'application/octet-stream') {
      return cb(null, true);
    }
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain',
      'application/octet-stream',
      'application/x-csv',
      'text/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values'
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type (${file.mimetype || 'unknown'}). Only .xlsx, .xls and .csv files are allowed.`));
    }
  }
});

/**
 * Helper to parse excel/csv buffer and extract headers & records preserving strings
 */
function parseExcelBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', raw: false, cellText: true, cellDates: true });
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { headers: [], dataRows: [] };
  }
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { headers: [], dataRows: [] };
  }

  // Convert to array of arrays or json preserving exact text values (prevents scientific notation)
  const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
  if (!rows || rows.length === 0) {
    return { headers: [], dataRows: [] };
  }

  // Find first non-empty row as header
  let headerRowIndex = 0;
  while (headerRowIndex < rows.length && rows[headerRowIndex].every(cell => !cell || String(cell).trim() === '')) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rows.length) {
    return { headers: [], dataRows: [] };
  }

  const rawHeaders = rows[headerRowIndex].map(h => String(h || '').trim());
  const dataRows = rows.slice(headerRowIndex + 1);

  return {
    headers: rawHeaders,
    dataRows
  };
}

/**
 * POST /api/webpushr/campaigns/parse-excel
 * Inspect uploaded file, detect subscriber_id column, validate records, return preview and counts
 */
router.post('/parse-excel', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Multer Upload Error]:', err);
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { headers, dataRows } = parseExcelBuffer(req.file.buffer);

    if (!headers || headers.length === 0) {
      return res.status(400).json({ error: 'The uploaded file contains no data or headers.' });
    }

    // Auto-detect subscriber_id column
    let detectedColumn = req.body.selectedColumn || '';
    if (!detectedColumn) {
      detectedColumn = headers.find(h => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === 'subscriberid' || clean === 'sid' || clean === 'subid' || clean === 'subscriber';
      }) || '';
    }

    let columnIndex = headers.indexOf(detectedColumn);
    if (columnIndex === -1 && headers.length > 0) {
      // If user didn't specify and auto-detect failed, use first column as candidate
      columnIndex = 0;
      detectedColumn = headers[0];
    }

    const validSubscribers = [];
    const invalidSubscribers = [];
    const duplicateSubscribers = [];
    const seenSet = new Set();

    let totalImported = 0;

    for (const row of dataRows) {
      const cellValue = columnIndex >= 0 && row[columnIndex] !== undefined ? String(row[columnIndex]).trim() : '';

      // Skip completely empty rows
      if (row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      totalImported++;

      if (!cellValue) {
        invalidSubscribers.push({ value: cellValue, reason: 'Empty subscriber ID' });
        continue;
      }

      // Validate numeric / alphanumeric SID string format
      // Webpushr SIDs are typically alphanumeric or numeric strings without whitespace
      const isNumeric = /^\d+$/.test(cellValue);
      if (!isNumeric) {
        invalidSubscribers.push({ value: cellValue, reason: 'Subscriber ID must be numeric' });
        continue;
      }

      // Check duplicates
      if (seenSet.has(cellValue)) {
        duplicateSubscribers.push({ value: cellValue, reason: 'Duplicate in file' });
        continue;
      }

      seenSet.add(cellValue);
      validSubscribers.push(cellValue);
    }

    res.json({
      success: true,
      headers,
      detectedColumn,
      totalImported,
      validCount: validSubscribers.length,
      invalidCount: invalidSubscribers.length,
      duplicateCount: duplicateSubscribers.length,
      preview: validSubscribers.slice(0, 20),
      invalidPreview: invalidSubscribers.slice(0, 50),
      duplicatePreview: duplicateSubscribers.slice(0, 50),
      // Valid list can be cached or sent back if needed
      validSubscribersList: validSubscribers
    });
  } catch (error) {
    console.error('Error parsing excel:', error);
    res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
});

/**
 * POST /api/webpushr/campaigns
 * Create campaign, validate fields, store campaign & subscriber records, start background queue
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    let campaignData;
    let validSubscribers = [];

    // Parse formData or JSON
    if (req.body.campaignData) {
      campaignData = typeof req.body.campaignData === 'string' ? JSON.parse(req.body.campaignData) : req.body.campaignData;
    } else {
      campaignData = req.body;
    }

    const { campaignName, notification, startImmediately, validSubscribersList } = campaignData;

    if (!campaignName || !campaignName.trim()) {
      return res.status(400).json({ error: 'Campaign Name is required' });
    }

    if (!notification || !notification.title || !notification.message || !notification.target_url) {
      return res.status(400).json({ error: 'Notification Title, Message and Target URL are required' });
    }

    // Determine subscriber list from file upload or pre-validated subscriber list
    if (Array.isArray(validSubscribersList) && validSubscribersList.length > 0) {
      validSubscribers = validSubscribersList;
    } else if (req.file) {
      const { headers, dataRows } = parseExcelBuffer(req.file.buffer);
      let detectedColumn = campaignData.selectedColumn || '';
      if (!detectedColumn) {
        detectedColumn = headers.find(h => {
          const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return clean === 'subscriberid' || clean === 'sid' || clean === 'subid' || clean === 'subscriber';
        }) || headers[0];
      }
      const colIdx = headers.indexOf(detectedColumn);
      const seen = new Set();
      for (const row of dataRows) {
        const val = colIdx >= 0 && row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
        if (val && /^\d+$/.test(val) && !seen.has(val)) {
          seen.add(val);
          validSubscribers.push(val);
        }
      }
    }

    if (validSubscribers.length === 0) {
      return res.status(400).json({ error: 'No valid numeric Subscriber IDs found' });
    }

    // Create Campaign document
    const newCampaign = new WebpushrCampaign({
      campaignName: campaignName.trim(),
      provider: 'webpushr',
      notification: {
        title: notification.title.trim().slice(0, 100),
        message: notification.message.trim().slice(0, 255),
        target_url: notification.target_url.trim().slice(0, 255),
        icon: (notification.icon || '').trim(),
        expire_push: (notification.expire_push || '').trim(),
        auto_hide: notification.auto_hide === true || notification.auto_hide === 'true' || notification.auto_hide === 1,
        send_at: notification.send_at ? new Date(notification.send_at) : null,
        action_buttons: Array.isArray(notification.action_buttons) ? notification.action_buttons : []
      },
      totalSubscribers: campaignData.totalImported || validSubscribers.length,
      validSubscribers: validSubscribers.length,
      invalidSubscribers: campaignData.invalidCount || 0,
      duplicateSubscribers: campaignData.duplicateCount || 0,
      pendingCount: validSubscribers.length,
      processingCount: 0,
      successCount: 0,
      failedCount: 0,
      campaignStatus: startImmediately ? 'processing' : 'draft',
      isPaused: false,
      startedAt: startImmediately ? new Date() : null
    });

    const savedCampaign = await newCampaign.save();

    // Bulk insert subscriber records in batches of 1000 for high performance
    const batchSize = 1000;
    for (let i = 0; i < validSubscribers.length; i += batchSize) {
      const slice = validSubscribers.slice(i, i + batchSize);
      const docs = slice.map(sid => ({
        campaignId: savedCampaign._id,
        subscriberId: sid,
        status: 'pending',
        retryCount: 0,
        attemptHistory: []
      }));
      await WebpushrCampaignSubscriber.insertMany(docs, { ordered: false });
    }

    // If start immediately, trigger queue processing
    if (startImmediately) {
      await startCampaign(savedCampaign._id);
    }

    res.status(201).json({
      success: true,
      campaign: savedCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

/**
 * GET /api/webpushr/campaigns/export-summary
 * Export campaign overview list to Excel (.xlsx)
 */
router.get('/export-summary', async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';

    const filter = {};
    if (status) {
      filter.campaignStatus = status;
    }
    if (search) {
      filter.campaignName = { $regex: search, $options: 'i' };
    }

    const campaigns = await WebpushrCampaign.find(filter).sort({ createdAt: -1 });

    const exportRows = campaigns.map(c => ({
      'Campaign Name': c.campaignName,
      'Notification Title': c.notification?.title || '',
      'Notification Message': c.notification?.message || '',
      'Target URL': c.notification?.target_url || '',
      'Total SIDs': c.validSubscribers || 0,
      'Pending': c.pendingCount || 0,
      'Processing': c.processingCount || 0,
      'Sent Successfully': c.successCount || 0,
      'Failed': c.failedCount || 0,
      'Status': c.campaignStatus,
      'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      'Started Date': c.startedAt ? new Date(c.startedAt).toLocaleString() : '',
      'Completed Date': c.completedAt ? new Date(c.completedAt).toLocaleString() : ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Campaigns Summary');

    const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Campaigns_Summary_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error exporting campaigns summary:', error);
    res.status(500).json({ error: error.message || 'Failed to export campaigns summary' });
  }
});

/**
 * GET /api/webpushr/campaigns
 * List campaigns with pagination, status filter and search
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';

    const filter = {};
    if (status) {
      filter.campaignStatus = status;
    }
    if (search) {
      filter.campaignName = { $regex: search, $options: 'i' };
    }

    const total = await WebpushrCampaign.countDocuments(filter);
    const campaigns = await WebpushrCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      campaigns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve campaigns' });
  }
});

/**
 * GET /api/webpushr/campaigns/test-logs
 * Fetch recent test notification history (including scheduled waiting pushes)
 */
router.get('/test-logs', async (req, res) => {
  try {
    const logs = await WebpushrTestNotification.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch test logs' });
  }
});

/**
 * DELETE /api/webpushr/campaigns/test-logs
 * Bulk delete selected test notification logs
 */
router.delete('/test-logs', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of test log IDs to delete.' });
    }

    const deleteResult = await WebpushrTestNotification.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} log(s).`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (err) {
    console.error('Error deleting test logs:', err);
    res.status(500).json({ error: err.message || 'Failed to delete test logs' });
  }
});

/**
 * DELETE /api/webpushr/campaigns/test-logs/:id
 * Delete a single test notification log
 */
router.delete('/test-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WebpushrTestNotification.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Log entry not found' });
    }
    res.json({ success: true, message: 'Log entry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting test log:', err);
    res.status(500).json({ error: err.message || 'Failed to delete test log' });
  }
});

/**
 * GET /api/webpushr/campaigns/:campaignId
 * Get single campaign info and live statistics
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await updateCampaignStats(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve campaign' });
  }
});

/**
 * PUT /api/webpushr/campaigns/:campaignId
 * Edit draft campaign
 */
router.put('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await WebpushrCampaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.campaignStatus !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be edited' });
    }

    const { campaignName, notification } = req.body;
    if (campaignName) campaign.campaignName = campaignName.trim();
    if (notification) {
      if (notification.title) campaign.notification.title = notification.title.trim().slice(0, 100);
      if (notification.message) campaign.notification.message = notification.message.trim().slice(0, 255);
      if (notification.target_url) campaign.notification.target_url = notification.target_url.trim().slice(0, 255);
      if (notification.icon !== undefined) campaign.notification.icon = notification.icon.trim();
      if (notification.expire_push !== undefined) campaign.notification.expire_push = notification.expire_push.trim();
      if (notification.auto_hide !== undefined) campaign.notification.auto_hide = notification.auto_hide === true || notification.auto_hide === 'true' || notification.auto_hide === 1;
      if (notification.send_at !== undefined) campaign.notification.send_at = notification.send_at ? new Date(notification.send_at) : null;
      if (notification.action_buttons !== undefined) campaign.notification.action_buttons = notification.action_buttons;
    }

    await campaign.save();
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update campaign' });
  }
});

/**
 * GET /api/webpushr/campaigns/:campaignId/subscribers
 * Subscriber-level tracking with pagination, status filter, and search
 */
router.get('/:campaignId/subscribers', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const status = req.query.status ? String(req.query.status).trim() : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    const filter = { campaignId };
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.subscriberId = { $regex: search, $options: 'i' };
    }

    const total = await WebpushrCampaignSubscriber.countDocuments(filter);
    const subscribers = await WebpushrCampaignSubscriber.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      subscribers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve subscribers' });
  }
});

/**
 * POST /api/webpushr/campaigns/:campaignId/start
 */
router.post('/:campaignId/start', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await startCampaign(campaignId);
    res.json({ success: true, message: 'Processing started', campaign });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to start campaign' });
  }
});

/**
 * POST /api/webpushr/campaigns/:campaignId/pause
 */
router.post('/:campaignId/pause', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await pauseCampaign(campaignId);
    res.json({ success: true, message: 'Processing paused', campaign });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to pause campaign' });
  }
});

/**
 * POST /api/webpushr/campaigns/:campaignId/resume
 */
router.post('/:campaignId/resume', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await resumeCampaign(campaignId);
    res.json({ success: true, message: 'Processing resumed', campaign });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to resume campaign' });
  }
});

/**
 * POST /api/webpushr/campaigns/:campaignId/retry-failed
 */
router.post('/:campaignId/retry-failed', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { selectedSubscriberIds } = req.body;
    const result = await retryFailedSubscribers(campaignId, selectedSubscriberIds);
    res.json({
      success: true,
      message: `Retrying ${result.retriedCount} failed subscribers`,
      retriedCount: result.retriedCount,
      campaign: result.campaign
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to retry subscribers' });
  }
});

/**
 * DELETE /api/webpushr/campaigns/:campaignId
 * Delete draft campaign only
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await WebpushrCampaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.campaignStatus !== 'draft') {
      return res.status(400).json({ error: 'Only draft campaigns can be deleted' });
    }

    // Delete associated subscribers
    await WebpushrCampaignSubscriber.deleteMany({ campaignId });
    await WebpushrCampaign.findByIdAndDelete(campaignId);

    res.json({ success: true, message: 'Draft campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete campaign' });
  }
});

/**
 * GET /api/webpushr/campaigns/:campaignId/export
 * POST /api/webpushr/campaigns/:campaignId/export
 * Export subscriber results to Excel (.xlsx) with optional status filter or selected subscriber IDs
 */
const handleExport = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const statusFilter = (req.query.status || req.body.status) ? String(req.query.status || req.body.status).trim() : '';
    const selectedSids = req.body.selectedSids || (req.query.sids ? req.query.sids.split(',').map(s => s.trim()) : null);

    const campaign = await WebpushrCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const query = { campaignId };
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (selectedSids && Array.isArray(selectedSids) && selectedSids.length > 0) {
      query.subscriberId = { $in: selectedSids };
    }

    const subscribers = await WebpushrCampaignSubscriber.find(query).sort({ subscriberId: 1 });

    const exportRows = subscribers.map(s => ({
      'Campaign Name': campaign.campaignName,
      'Subscriber ID': s.subscriberId,
      'Notification Title': campaign.notification.title,
      'Status': s.status,
      'HTTP Response Code': s.responseStatusCode || '',
      'Webpushr API Response': s.responseBody ? JSON.stringify(s.responseBody) : '',
      'Error Message': s.errorMessage || '',
      'Retry Count': s.retryCount || 0,
      'Last Attempt Date': s.lastAttemptAt ? new Date(s.lastAttemptAt).toISOString() : '',
      'Successful Sent Date': s.sentAt ? new Date(s.sentAt).toISOString() : ''
    }));

    const worksheet = xlsx.utils.json_to_sheet(exportRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Subscribers Report');

    const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const sanitizedTitle = campaign.campaignName.replace(/[^a-z0-9_-]/gi, '_');
    const filterSuffix = selectedSids?.length ? `_selected_${selectedSids.length}` : (statusFilter ? `_${statusFilter}` : '_all');
    const filename = `${sanitizedTitle}${filterSuffix}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error exporting campaign report:', error);
    res.status(500).json({ error: error.message || 'Failed to export report' });
  }
};

router.get('/:campaignId/export', handleExport);
router.post('/:campaignId/export', handleExport);

/**
 * POST /api/webpushr/campaigns/send-segment
 * Send push notification to one or more Webpushr Segment IDs
 */
router.post('/send-segment', async (req, res) => {
  try {
    const {
      segment,
      title,
      message,
      target_url,
      name,
      icon,
      image,
      expire_push,
      auto_hide,
      send_at,
      action_buttons
    } = req.body;

    if (!segment || (Array.isArray(segment) && segment.length === 0)) {
      return res.status(400).json({ error: 'At least one Segment ID is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification Title is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification Message is required' });
    }

    if (!target_url || !target_url.trim()) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    const result = await sendWebpushrSegmentNotification({
      segment,
      title: title.trim(),
      message: message.trim(),
      target_url: target_url.trim(),
      name,
      icon,
      image,
      expire_push,
      auto_hide,
      send_at,
      action_buttons
    });

    // Record in test notifications collection
    const isScheduled = !!send_at;
    let scheduledDate = null;
    if (send_at) {
      const d = new Date(send_at);
      if (!isNaN(d.getTime())) scheduledDate = d;
    }

    const testRecord = new WebpushrTestNotification({
      type: 'segment',
      target: Array.isArray(segment) ? segment.join(', ') : String(segment),
      title: title.trim(),
      message: message.trim(),
      target_url: target_url.trim(),
      icon: icon || '',
      image: image || '',
      expire_push: expire_push || '',
      auto_hide: auto_hide === true || auto_hide === 'true' || auto_hide === 1,
      send_at: result.payload?.send_at || send_at || null,
      isScheduled,
      scheduledTime: scheduledDate,
      status: result.success ? (isScheduled ? 'scheduled_waiting' : 'sent') : 'failed',
      responseStatusCode: result.statusCode,
      responseBody: result.data,
      payloadSent: result.payload
    });
    await testRecord.save().catch(e => console.error('Error saving test record:', e));

    if (result.success) {
      res.json({
        success: true,
        message: 'Segment notification sent successfully!',
        data: result.data,
        payload: result.payload,
        statusCode: result.statusCode,
        record: testRecord
      });
    } else {
      res.status(result.statusCode >= 400 && result.statusCode < 600 ? result.statusCode : 400).json({
        success: false,
        error: result.error || 'Failed to send segment notification',
        statusCode: result.statusCode,
        data: result.data,
        payload: result.payload
      });
    }
  } catch (err) {
    console.error('Error in send-segment route:', err);
    res.status(500).json({ error: err.message || 'Internal server error while sending segment notification' });
  }
});

/**
 * POST /api/webpushr/campaigns/send-sid-test
 * Send test push notification to a specific single Subscriber ID
 */
router.post('/send-sid-test', async (req, res) => {
  try {
    const {
      sid,
      title,
      message,
      target_url,
      icon,
      expire_push,
      auto_hide,
      send_at,
      action_buttons
    } = req.body;

    if (!sid || !String(sid).trim()) {
      return res.status(400).json({ error: 'Subscriber ID (SID) is required' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification Title is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification Message is required' });
    }

    if (!target_url || !target_url.trim()) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    const result = await sendWebpushrNotification({
      sid: String(sid).trim(),
      title: title.trim(),
      message: message.trim(),
      target_url: target_url.trim(),
      icon,
      expire_push,
      auto_hide,
      send_at,
      action_buttons
    });

    // Record in test notifications collection
    const isScheduled = !!send_at;
    let scheduledDate = null;
    if (send_at) {
      const d = new Date(send_at);
      if (!isNaN(d.getTime())) scheduledDate = d;
    }

    const testRecord = new WebpushrTestNotification({
      type: 'sid',
      target: String(sid).trim(),
      title: title.trim(),
      message: message.trim(),
      target_url: target_url.trim(),
      icon: icon || '',
      expire_push: expire_push || '',
      auto_hide: auto_hide === true || auto_hide === 'true' || auto_hide === 1,
      send_at: result.payload?.send_at || send_at || null,
      isScheduled,
      scheduledTime: scheduledDate,
      status: result.success ? (isScheduled ? 'scheduled_waiting' : 'sent') : 'failed',
      responseStatusCode: result.statusCode,
      responseBody: result.data,
      payloadSent: result.payload
    });
    await testRecord.save().catch(e => console.error('Error saving test record:', e));

    if (result.success) {
      res.json({
        success: true,
        message: 'SID test notification sent successfully!',
        data: result.data,
        payload: result.payload,
        statusCode: result.statusCode,
        record: testRecord
      });
    } else {
      res.status(result.statusCode >= 400 && result.statusCode < 600 ? result.statusCode : 400).json({
        success: false,
        error: result.error || 'Failed to send SID test notification',
        statusCode: result.statusCode,
        data: result.data,
        payload: result.payload
      });
    }
  } catch (err) {
    console.error('Error in send-sid-test route:', err);
    res.status(500).json({ error: err.message || 'Internal server error while sending SID test notification' });
  }
});

module.exports = router;
