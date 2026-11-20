const mongoose = require('mongoose');

const ActionButtonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  }
}, { _id: false });

const WebpushrCampaignSchema = new mongoose.Schema({
  campaignName: {
    type: String,
    required: [true, 'Campaign name is required'],
    trim: true,
    index: true
  },
  provider: {
    type: String,
    default: 'webpushr',
    immutable: true
  },
  notification: {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      maxlength: [255, 'Message cannot exceed 255 characters'],
      trim: true
    },
    target_url: {
      type: String,
      required: [true, 'Target URL is required'],
      maxlength: [255, 'Target URL cannot exceed 255 characters'],
      trim: true
    },
    icon: {
      type: String,
      trim: true,
      default: ''
    },
    expire_push: {
      type: String,
      trim: true,
      default: ''
    },
    auto_hide: {
      type: Boolean,
      default: true
    },
    send_at: {
      type: Date,
      default: null
    },
    action_buttons: [ActionButtonSchema]
  },
  totalSubscribers: {
    type: Number,
    default: 0
  },
  validSubscribers: {
    type: Number,
    default: 0
  },
  invalidSubscribers: {
    type: Number,
    default: 0
  },
  duplicateSubscribers: {
    type: Number,
    default: 0
  },
  pendingCount: {
    type: Number,
    default: 0
  },
  processingCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  campaignStatus: {
    type: String,
    enum: ['draft', 'scheduled', 'processing', 'paused', 'completed', 'completed_with_errors', 'failed'],
    default: 'draft',
    index: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'webpushr_campaigns'
});

WebpushrCampaignSchema.index({ campaignStatus: 1, createdAt: -1 });

module.exports = mongoose.model('WebpushrCampaign', WebpushrCampaignSchema);
