const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { protect } = require('../middleware/auth');

/**
 * GET /api/settings/config
 * Return masked provider credentials and queue settings
 */
router.get('/config', protect, (req, res) => {
  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  res.json({
    success: true,
    settings: {
      appName: 'AstroVed PushHub',
      version: '2.0.0',
      webpushr: {
        apiKeyMasked: maskKey(process.env.WEBPUSHR_REST_API_KEY),
        hasApiKey: !!process.env.WEBPUSHR_REST_API_KEY,
        authTokenMasked: maskKey(process.env.WEBPUSHR_AUTH_TOKEN),
        hasAuthToken: !!process.env.WEBPUSHR_AUTH_TOKEN
      },
      queue: {
        concurrency: parseInt(process.env.CONCURRENCY, 10) || 5,
        maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
        rateLimitDelayMs: parseInt(process.env.RATE_LIMIT_DELAY_MS, 10) || 200
      },
      database: {
        connected: true,
        host: '127.0.0.1:27017',
        database: 'astroved_pushhub'
      }
    }
  });
});

module.exports = router;
