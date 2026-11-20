const mongoose = require('mongoose');

const AttemptHistorySchema = new mongoose.Schema({
  attemptNumber: {
    type: Number,
    required: true
  },
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  requestPayload: {
    type: mongoose.Schema.Types.Mixed
  },
  responseStatusCode: {
    type: Number
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed
  },
  errorMessage: {
    type: String
  },
  status: {
    type: String,
    enum: ['success', 'failed']
  }
}, { _id: false });

const WebpushrCampaignSubscriberSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebpushrCampaign',
    required: true,
    index: true
  },
  subscriberId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending',
    index: true
  },
  requestPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  responseStatusCode: {
    type: Number,
    default: null
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  attemptHistory: [AttemptHistorySchema]
}, {
  timestamps: true,
  collection: 'webpushr_campaign_subscribers'
});

// Unique compound index on campaignId + subscriberId
WebpushrCampaignSubscriberSchema.index({ campaignId: 1, subscriberId: 1 }, { unique: true });
WebpushrCampaignSubscriberSchema.index({ campaignId: 1, status: 1 });

module.exports = mongoose.model('WebpushrCampaignSubscriber', WebpushrCampaignSubscriberSchema);
