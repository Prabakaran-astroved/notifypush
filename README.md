# AstroVed PushHub – Webpushr Subscriber ID Campaign Management Module

A complete, production-grade campaign-based Webpushr notification management module built for AstroVed PushHub to deliver push notifications targeted directly to Webpushr Subscriber IDs (SIDs).

---

## 🌟 Key Features

1. **Campaign Management Dashboard**:
   - Navigation: **Webpushr → Subscriber ID Campaigns**.
   - Real-time campaign listing with status badges, subscriber counts (Total, Pending, Processing, Success, Failed), creation dates, and action controls (View, Edit Draft, Start, Pause, Resume, Retry Failed, Delete Draft).
   - Server-side search by campaign name and status filtering.

2. **Excel / CSV Upload & SID Validation**:
   - Accepts `.xlsx`, `.xls`, and `.csv` files.
   - Preserves Subscriber IDs as string representations to avoid scientific notation or decimal distortion.
   - Auto-detects columns (`subscriber_id`, `sid`, `subid`, `subscriber`) with manual override dropdown.
   - Enforces numeric SID validation, removes empty rows, deduplicates entries, and provides instant metrics (Total Imported, Valid SIDs, Duplicates, Invalid).
   - Generates and downloads Excel reports for Invalid and Duplicate records directly from the preview screen.

3. **Notification Configuration Form**:
   - Strict adherence to Webpushr SID specifications:
     - Title (max 100 characters)
     - Message (max 255 characters)
     - Target URL (max 255 characters)
     - Subscriber Icon URL (192×192 PNG)
     - Expire Push (`5m`, `12h`, `5d`)
     - Auto Hide (`0` or `1`)
     - Send At (Scheduling)
     - Dynamic Action Buttons (Title + URL)
   - **Image URL Notice**: Clarifies and enforces that Webpushr SID endpoints accept the `icon` parameter but do not support the large `image` parameter.

4. **Background Worker & Resilience**:
   - High-throughput asynchronous batch processing with configurable concurrency (`CONCURRENCY=5`).
   - Exponential backoff retry handling for HTTP 429 (rate-limit) and transient 5xx / network errors.
   - Non-retryable classification for permanent API format errors.
   - Pause / Resume capabilities.
   - Crash-proof resumability: active campaigns and interrupted processing jobs safely resume on server startup.
   - Complete attempt history stored per subscriber without overwriting earlier attempt logs.

5. **Live Tracking & Excel Reporting**:
   - Live campaign progress bar and real-time statistics cards.
   - Subscriber-level tracking table with HTTP status code, full API response payload, error message, retry count, and timestamps.
   - Batch or individual retry for failed subscribers.
   - Full Excel report export with status filtering.

---

## 📁 Project Structure (`/var/www/html/notifypush`)

```
notifypush/
├── backend/
│   ├── .env
│   ├── server.js
│   ├── package.json
│   ├── models/
│   │   ├── WebpushrCampaign.js
│   │   └── WebpushrCampaignSubscriber.js
│   ├── routes/
│   │   └── webpushrCampaigns.js
│   └── services/
│       ├── campaignQueueService.js
│       └── webpushrService.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/
        │   └── campaignApi.js
        └── components/
            ├── Sidebar.jsx
            ├── CampaignList.jsx
            ├── CreateCampaign.jsx
            ├── CampaignDetails.jsx
            └── EditDraftCampaign.jsx
```

---

## 🚀 Running the Application

### 1. Backend

```bash
cd /var/www/html/notifypush/backend
# Update WEBPUSHR_REST_API_KEY and WEBPUSHR_AUTH_TOKEN in .env
npm start
```
Default backend port: `http://localhost:5000`

### 2. Frontend

```bash
cd /var/www/html/notifypush/frontend
npm run dev
```
Default frontend port: `http://localhost:3000`
