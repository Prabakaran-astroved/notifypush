const mongoose = require('mongoose');

const WebpushrTestNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['segment', 'sid'],
    required: true
  },
  target: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  target_url: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  expire_push: {
    type: String,
    default: ''
  },
  auto_hide: {
    type: Boolean,
    default: true
  },
  send_at: {
    type: String,
    default: null
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['sent', 'scheduled_waiting', 'failed'],
    default: 'sent'
  },
  responseStatusCode: {
    type: Number,
    default: null
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  payloadSent: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  collection: 'webpushr_test_notifications'
});

WebpushrTestNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WebpushrTestNotification', WebpushrTestNotificationSchema);
