const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const webpushrCampaignRoutes = require('./routes/webpushrCampaigns');
const WebpushrCampaignSubscriber = require('./models/WebpushrCampaignSubscriber');
const WebpushrCampaign = require('./models/WebpushrCampaign');
const { startCampaign } = require('./services/campaignQueueService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'AstroVed PushHub - Webpushr SID Campaign Manager'
  });
});

// Webpushr Campaign Routes
app.use('/api/webpushr/campaigns', webpushrCampaignRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Database connection and Server startup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/astroved_pushhub';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log(`✅ Connected to MongoDB at ${MONGODB_URI}`);

    // Server crash recovery & resumability:
    // If server restarted while campaigns were 'processing', resume them or revert stuck 'processing' subscribers
    try {
      const activeProcessingCampaigns = await WebpushrCampaign.find({
        campaignStatus: 'processing',
        isPaused: { $ne: true }
      });

      if (activeProcessingCampaigns.length > 0) {
        console.log(`[Recovery] Found ${activeProcessingCampaigns.length} interrupted campaigns. Resuming...`);
        for (const camp of activeProcessingCampaigns) {
          console.log(`[Recovery] Resuming campaign: ${camp.campaignName} (${camp._id})`);
          await startCampaign(camp._id);
        }
      }
    } catch (recErr) {
      console.error('[Recovery Error]', recErr);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 AstroVed PushHub Backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });
