## Data Flow and Storage Map

This document maps where each frontend page/component loads/saves data, which backend endpoints are used, and which storage backends (Firestore, Google Sheets, Excel) are involved.

### Conventions
- BACKEND_URL = resolved by `frontend/src/lib/api.ts` from `NEXT_PUBLIC_BACKEND_URL` or healthcheck probing.
- All backend routes are mounted under `/api/*` in `backend/src/server.js`.

---

## Frontend Pages/Components → Backend Endpoints

### Dashboard: All Reports (`/dashboard/all-reports`)
- Fetch all reports: `GET {BACKEND_URL}/api/email-tracking/reports`
- Fallback fetch investors: `GET {BACKEND_URL}/api/investors?limit=100000`

### AI Email Campaign (`/dashboard/campaign/ai-email-campaign`)
- Schedule email: `POST {BACKEND_URL}/scheduled-emails`
- Send via client account: `POST {BACKEND_URL}/client-email/send-bulk`
- AI prefill: `POST {BACKEND_URL}/ai/extract-and-prefill`
- Matching: `POST {BACKEND_URL}/ai/match-investors`
- Score email: `POST {BACKEND_URL}/email/send-score`

### Add Client (`/dashboard/add-client`)
- Save client (Firebase): `POST {BACKEND_URL}/api/firebase/clients`
- Save campaign (Firebase): `POST {BACKEND_URL}/api/firebase/campaigns`

### Add Incubator (`/dashboard/add-incubator`)
- Upload Excel: `POST {BACKEND_URL}/api/incubators/upload`

### Investor/Incubator Matcher (`components/InvestorMatcher`)
- List investors: `GET {BACKEND_URL}/api/investors?limit=...`
- List incubators: `GET {BACKEND_URL}/api/incubators`
- Save matchmaking: `POST {BACKEND_URL}/api/firebase/matchmaking`

### Quick Email Sender (`components/QuickEmailSender`)
- Direct send: `POST {BACKEND_URL}/api/email/send-direct`

### Next.js API Routes (proxies)
- `app/api/campaign/[id]/send/route.ts` → `POST {BACKEND_URL}/api/campaign/:id/send`
- `app/api/email/send-direct/route.ts` → `POST {BACKEND_URL}/api/email/send-direct`

---

## Backend Route Mounts (Express)
Defined in `backend/src/server.js`:
- `/api/clients` → `routes/company.route.js`
- `/api/campaign` → `routes/campaign.route.js`
- `/api/contact-list` → `routes/contactList.route.js`
- `/api/ai` → `routes/ai.route.js`
- `/api/email` → `routes/email.route.js`
- `/api/investors` → `routes/investor.route.js`
- `/api/incubators` → `routes/incubator.route.js`
- `/api/match` → `routes/match.route.js`
- `/api/excel` → `routes/excel.route.js`
- `/api/document` → `routes/document.route.js`
- `/api/scheduled-emails` → `routes/scheduledEmail.route.js`
- `/api/sheets` → `routes/sheets.route.js`
- `/api/client-email` → `routes/clientEmail.route.js`
- `/api/firebase` → `routes/firebase.route.js`
- `/api/campaign-reports` → `routes/campaignReport.route.js`
- `/api/public-reports` → `routes/publicReport.route.js`
- `/api/email-tracking` → `routes/emailTracking.route.js`
- `/api/dashboard` → `routes/dashboardStats.route.js`
- `/api/deck-activity` → `routes/deckActivity.route.js`
- `/api/deal-rooms` → `routes/dealRoom.route.js`

---

## Firestore Collections (names and typical usage)
- `clients` — client/company records
- `campaigns` — campaign metadata
- `emailCampaigns` — per-campaign send batches and recipient states
- `emailLimits` — per-user daily/weekly counters
- `emailReplies` — parsed inbound replies
- `unsubscribes` — unsubscribe entries keyed by email
- `investors` — investor master data (synced from Sheets/Excel)
- `incubators` — incubator master data (synced from Excel)
- `dealRooms` — deal room data
- `matchResults` — saved matches per company
- `deckActivities` — deck activity tracking

Implementation references:
- Email flows: `backend/src/controllers/email.controller.js`
- Deal Room: `backend/src/controllers/dealRoom.controller.js`
- Matching: `backend/src/controllers/matchResult.controller.js`
- Excel sync: `backend/src/services/excel.service.js`

---

## Google Sheets Sources
- Investor Sheet ID: `process.env.SHEET_ID`
- Incubator Sheet ID: `process.env.SHEET_ID_INCUBATORS || process.env.SHEET_ID`
- Service account credentials JSON path: `process.env.EXCEL_JSON_PATH` (default `backend/src/config/excel.json`)

Controllers using Google Sheets:
- Investors: `backend/src/controllers/investor.controller.js`
- Incubators: `backend/src/controllers/incubator.controller.js`
- Excel controller (append/export): `backend/src/controllers/excel.controller.js`
- Sheets helper: `backend/src/controllers/sheets.controller.js`

---

## Local Excel Files
- Investors Excel path: `backend/data/investors.xlsx`
- Incubators Excel path: `backend/data/incubators.xlsx`
- Override investors path via `INVESTORS_DB_PATH`

Services reading/writing Excel:
- `backend/src/services/excel.service.js`
- `backend/src/services/file-db.service.js`

---

## Where Data is Saved vs. Fetched

### Saved To
- Firestore:
  - Clients/Campaigns/Matchmaking via `/api/firebase/*`
  - Email campaigns, limits, replies, unsubscribes via `/api/email*` and tracking routes
  - Deal rooms via `/api/deal-rooms/*`
- Google Sheets:
  - Append/update via `excel.controller.js` (requires `SHEET_ID` and `excel.json`)
- Excel files:
  - Investors and Incubators via `excel.service.js` and uploads in `incubator.route.js`/`investor.route.js`

### Fetched From
- Firestore:
  - Campaign/reporting, limits, matches, etc. via controllers
- Google Sheets:
  - Investor/Incubator lists (primary when configured)
- Excel files:
  - Investor/Incubator lists (fallback/local)

---

## Environment Variables (key ones)
- `NEXT_PUBLIC_BACKEND_URL` — frontend → backend base URL
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` — Firestore Admin
- `SHEET_ID`, `SHEET_ID_INCUBATORS` — Google Sheets IDs
- `EXCEL_JSON_PATH` — path to service account JSON for Sheets (default `backend/src/config/excel.json`)
- `INVESTORS_DB_PATH` — override path to investors Excel
- `PORT` — backend port (default 5000)

---

## Vercel Notes
- Frontend: `frontend/vercel.json` uses Next.js defaults.
- Backend: `backend/vercel.json` deploys `api/index.js` (
  it imports Express app from `src/server.js` and exports a handler).


