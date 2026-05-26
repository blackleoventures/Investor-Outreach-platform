# Investor Outreach Platform

![Build](https://img.shields.io/github/actions/workflow/status/blackleoventures/Investor-Outreach-platform/cron-jobs.yml?label=CI&style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-11-FF6F00?style=flat-square&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-06B6D4?style=flat-square&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**A full-stack investor outreach automation platform that manages campaigns, matches startups to investors, sends personalized emails via SMTP, tracks engagement in real time, and surfaces AI-powered insights — all from a single admin dashboard.**

<!-- Add screenshot here -->

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Core Logic & Key Modules](#core-logic--key-modules)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Known Issues & Limitations](#known-issues--limitations)
- [License](#license)
- [Author / Credits](#author--credits)

---

## Overview

The Investor Outreach Platform is a multi-tenant SaaS tool built for early-stage startup accelerators and venture studios. It replaces manual spreadsheet-based investor outreach with an end-to-end automated workflow: from ingesting investor and incubator databases via Google Sheets, to scoring compatibility against a startup's profile, composing AI-improved emails, scheduling drip campaigns, and tracking every open, click, and reply.

The platform solves a specific operational bottleneck faced by startup support organizations: reaching hundreds of relevant investors at scale without sacrificing personalization. Traditional cold email tools lack the domain-specific matching logic needed to filter investors by sector, stage, geography, and check size. This platform embeds that logic natively and integrates directly with client-supplied SMTP credentials so every email is sent from the startup's own domain — not a shared sending IP.

It is designed for a team of operators (admins and sub-admins) who manage a portfolio of startup clients. Each client submits their company profile, configures their SMTP credentials, and then lets the platform run automated campaigns on their behalf. Investors and incubators receive outreach that is contextually relevant to their thesis, improving response rates and reducing noise.

---

## Features

### Campaign Management
- **Multi-step campaign wizard** — guided flow covering client selection, audience targeting, AI email composition, scheduling, and final review
- **AI-powered email improvement** — Google Gemini AI rewrites subject lines and email bodies with optional custom instructions
- **Flexible scheduling** — configurable daily limits, sending windows (start/end time), timezone support, and weekend pause toggles
- **Pause, resume, and complete** — campaigns can be paused mid-flight; pending emails queue is preserved
- **Edit email template post-creation** — subject and body can be updated at any time; changes apply only to unsent emails
- **Public report links** — shareable, token-authenticated campaign reports with no login required
- **CSV export** — full recipient and engagement data export per campaign

### Investor & Incubator Matching
- **Weighted scoring algorithm** — matches startups to investors/incubators using a 4-factor model: sector (40%), stage (30%), location (20%), ticket size (10%)
- **Google Sheets sync** — investor and incubator databases are pulled live from Google Sheets at match time
- **Dual-audience targeting** — campaigns can target investors, incubators, or both simultaneously
- **Score-based recipient ranking** — recipients are prioritized by match score for daily send ordering

### Email Delivery & Tracking
- **Client SMTP** — emails are sent via the client's own SMTP credentials (Gmail, Outlook, custom), never from a shared IP
- **Per-recipient tracking pixels** — unique 1×1 tracking pixel per email records open events with timestamp and device info
- **IMAP reply detection** — background cron polls the client's inbox via IMAP to detect and record investor replies
- **Retry with backoff** — failed deliveries are automatically retried with exponential backoff; errors are categorized (AUTH, QUOTA, SPAM, TIMEOUT, etc.)
- **Follow-up campaigns** — send targeted follow-ups to opened-but-no-reply or delivered-but-not-opened segments

### Dashboard & Analytics
- **Real-time engagement stats** — delivery rate, open rate, reply rate, and a full conversion funnel
- **Campaign alerts system** — automated health alerts (high failure rate, quota exceeded, SMTP errors)
- **Engagement details modal** — per-recipient timeline showing sends, opens, and replies
- **All-campaigns overview** — paginated table with status filters and aggregate metrics

### Client & Admin Management
- **Multi-role access control** — `admin`, `subadmin`, `client`, and `investor` roles with route-level enforcement
- **Client onboarding form** — startups self-submit company profile, SMTP credentials, and pitch deck
- **SMTP test utility** — validates SMTP configuration before any emails are sent
- **AI pitch deck analysis** — Gemini AI parses uploaded pitch decks and generates a structured investment summary
- **Deal room** — investor-facing portal with curated deal flow for invited investors

---

## Architecture & Design Decisions

### Architecture Diagram

```mermaid
graph TD
    A[Browser Client] -->|Firebase ID Token| B[Next.js App Router]
    B --> C[API Routes /api/**]
    C -->|verifyFirebaseToken| D[Firebase Admin SDK]
    D --> E[(Firestore Database)]
    C -->|Nodemailer| F[Client SMTP Server]
    C -->|Google Sheets API| G[Investor / Incubator Sheet]
    C -->|Gemini AI API| H[Google Gemini]
    C -->|AES-256-GCM| E
    I[GitHub Actions Cron] -->|Bearer CRON_SECRET| C
    F -->|Send Email + Tracking Pixel| J[Investor Inbox]
    J -->|Open Pixel Hit| C
    J -->|Reply via IMAP| C
    C --> E
```

### Architecture Pattern: Serverless Monolith

The platform uses Next.js App Router as both the frontend and backend. There is no separate API server. All business logic runs inside Next.js API routes (`/app/api/`), which Vercel deploys as individual serverless functions. This was chosen over a separate Express/NestJS backend to reduce infrastructure surface area while maintaining full Node.js capability (Nodemailer, IMAP, crypto).

**Key design decisions:**

| Decision | Choice | Rationale |
|---|---|---|
| Database | Firestore | Schema-free, real-time, no connection pooling needed in serverless |
| Auth | Firebase Auth | Eliminates custom session/JWT logic; integrates with Firestore security rules |
| Email sending | Client SMTP via Nodemailer | Emails originate from client's own domain, avoiding shared-IP deliverability issues |
| AI provider | Google Gemini | Lower cost per token than GPT-4 for high-volume email rewriting |
| Cron | GitHub Actions | Free for public repos; avoids Vercel cron limitations on hobby plan |
| Encryption | AES-256-GCM | Industry-standard authenticated encryption for SMTP passwords stored in Firestore |
| UI library | Ant Design 5 | Enterprise-grade table/form components needed for data-heavy admin views |

### Core Data Flow — Sending a Campaign Email

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant API as /api/cron/send-emails
    participant FS as Firestore
    participant SM as Nodemailer (SMTP)
    participant INV as Investor Inbox

    GH->>API: GET /api/cron/send-emails (every 30min)
    API->>API: Acquire in-process lock (isJobRunning)
    API->>FS: Query active campaigns
    loop For each active campaign
        API->>FS: Fetch today's pending recipients (limit: dailyLimit)
        API->>FS: Fetch client SMTP credentials (encrypted)
        API->>API: Decrypt SMTP password (AES-256-GCM)
        API->>SM: Send email with 1x1 tracking pixel
        SM->>INV: Deliver email
        API->>FS: Mark recipient as sent/delivered/failed
        API->>FS: Update campaign stats (atomic increment)
    end
    API->>API: Release lock
```

---

## Folder Structure

```
.
├── .github/
│   └── workflows/
│       └── cron-jobs.yml          # GitHub Actions: send-emails, check-replies, update-stats
├── public/                        # Static assets (logo, favicon, manifest)
├── scripts/
│   └── dev-local.cmd              # Windows LAN dev server helper
├── src/
│   ├── app/                       # Next.js App Router root
│   │   ├── layout.tsx             # Root layout (fonts, providers, top loader)
│   │   ├── page.tsx               # Landing / redirect to /login
│   │   ├── providers.tsx          # Ant Design + Auth context providers
│   │   ├── globals.css            # Global Tailwind base styles
│   │   │
│   │   ├── api/                   # All API routes (serverless functions)
│   │   │   ├── ai/
│   │   │   │   ├── analyze-pitch/ # POST — Gemini AI pitch deck analysis
│   │   │   │   ├── improve-body/  # POST — AI email body rewrite
│   │   │   │   └── improve-subject/ # POST — AI subject line rewrite
│   │   │   ├── auth/
│   │   │   │   ├── investor-login/  # POST — magic link login for investors
│   │   │   │   └── verify-magic-link/ # GET — validate magic link token
│   │   │   ├── campaigns/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── route.ts         # GET campaign | PATCH status | DELETE
│   │   │   │   │   ├── email-template/  # PUT — update subject & body post-creation
│   │   │   │   │   ├── alerts/          # GET campaign health alerts
│   │   │   │   │   ├── export/          # GET CSV export
│   │   │   │   │   ├── failed-recipients/ # GET failed emails
│   │   │   │   │   ├── followup-candidates/ # GET follow-up eligible recipients
│   │   │   │   │   ├── generate-followup/   # POST — AI follow-up email generation
│   │   │   │   │   ├── mark-complete/       # POST — mark campaign done
│   │   │   │   │   ├── recipients/          # GET paginated recipient list
│   │   │   │   │   ├── replies/             # GET detected replies
│   │   │   │   │   ├── reschedule/          # POST — reschedule pending emails
│   │   │   │   │   ├── retry-failed/        # POST — retry failed deliveries
│   │   │   │   │   └── send-followup/       # POST — dispatch follow-up emails
│   │   │   │   ├── activate/        # POST — create and launch campaign
│   │   │   │   ├── eligible-clients/ # GET — clients ready for a campaign
│   │   │   │   ├── list/            # GET — paginated campaign list
│   │   │   │   ├── match/           # POST — run investor/incubator matching
│   │   │   │   └── public/[token]/  # GET — public report (no auth)
│   │   │   ├── clients/             # CRUD for startup clients
│   │   │   ├── investors/           # CRUD for investor records
│   │   │   ├── incubators/          # CRUD for incubator records
│   │   │   ├── cron/
│   │   │   │   ├── send-emails/     # GET — main email dispatch job
│   │   │   │   ├── check-replies/   # GET — IMAP reply detection job
│   │   │   │   └── update-stats/    # GET — stats reconciliation job
│   │   │   ├── dashboard/stats/     # GET — aggregate dashboard metrics
│   │   │   ├── track/open/[id]/     # GET — tracking pixel endpoint
│   │   │   └── admin-users/         # Admin user management
│   │   │
│   │   ├── dashboard/               # Protected admin UI
│   │   │   ├── layout.tsx           # Dashboard shell (sidebar, nav)
│   │   │   ├── page.tsx             # Main dashboard with stats cards
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx         # All campaigns table
│   │   │   │   ├── [id]/page.tsx    # Campaign detail (tabs: overview, email, recipients, follow-ups)
│   │   │   │   └── create/          # 6-step campaign creation wizard
│   │   │   │       ├── components/
│   │   │   │       │   ├── ClientSelection.tsx   # Step 1
│   │   │   │       │   ├── TargetAudience.tsx    # Step 2
│   │   │   │       │   ├── MatchResults.tsx      # Step 3
│   │   │   │       │   ├── EmailTemplate.tsx     # Step 4 (AI editing)
│   │   │   │       │   ├── ScheduleConfig.tsx    # Step 5
│   │   │   │       │   └── FinalReview.tsx       # Step 6
│   │   │   │       └── page.tsx
│   │   │   ├── all-client/          # Client management table
│   │   │   ├── all-investors/       # Investor directory
│   │   │   ├── all-incubators/      # Incubator directory
│   │   │   ├── deal-room/           # Investor-facing deal flow portal
│   │   │   ├── pitch-deck-analysis/ # AI pitch deck analysis tool
│   │   │   ├── submit-information/  # Client self-onboarding form
│   │   │   └── account-management/  # Admin-only user management
│   │   │
│   │   ├── campaign-report/[token]/ # Public shareable campaign report
│   │   ├── auth/investor-login/     # Investor magic link login page
│   │   └── login/                   # Admin/subadmin login page
│   │
│   ├── components/
│   │   ├── campaigns/               # Campaign-specific components
│   │   │   ├── CampaignActions.tsx      # Pause/resume/complete buttons
│   │   │   ├── CampaignAlertsPanel.tsx  # Health alerts sidebar
│   │   │   ├── EditEmailModal.tsx       # Post-creation email template editor
│   │   │   ├── EngagementDetailsModal.tsx # Per-recipient engagement timeline
│   │   │   ├── EngagementStatsCards.tsx # Open/reply rate stat cards
│   │   │   ├── FailedRecipientsTab.tsx  # Failed delivery management
│   │   │   ├── FollowupTab.tsx          # Follow-up campaign manager
│   │   │   └── FollowupEmailModal.tsx   # AI follow-up email composer
│   │   ├── charts/
│   │   │   ├── EmailDistributionPie.tsx # Recharts pie chart
│   │   │   └── MonthlyEmailBarChart.tsx # Recharts bar chart
│   │   ├── ui/
│   │   │   ├── RichTextEditor.tsx       # TipTap-based WYSIWYG editor
│   │   │   └── RichTextToolbar.tsx      # Editor toolbar (bold, italic, align, link)
│   │   └── data-table.tsx               # Reusable sortable/filterable table
│   │
│   ├── lib/                         # Core business logic and utilities
│   │   ├── auth-middleware.ts        # verifyFirebaseToken, role guards
│   │   ├── matching.ts               # Investor/incubator scoring algorithm
│   │   ├── email.ts                  # Nodemailer helper, tracking pixel injection
│   │   ├── encryption.ts             # AES-256-GCM encrypt/decrypt for SMTP creds
│   │   ├── firebase.ts               # Client SDK initialization
│   │   ├── firebase-admin.ts         # Admin SDK initialization
│   │   ├── google-sheets.ts          # Google Sheets API integration
│   │   ├── cache.ts                  # In-process node-cache for cron job optimization
│   │   ├── imap/
│   │   │   ├── reply-checker.ts      # IMAP connection and mailbox polling
│   │   │   ├── reply-parser.ts       # Parse raw MIME messages into reply records
│   │   │   └── recipient-matcher.ts  # Match incoming replies to campaign recipients
│   │   ├── cron/
│   │   │   ├── auth.ts               # verifyCronRequest (CRON_SECRET validation)
│   │   │   └── cron-logger.ts        # Structured cron run logging to Firestore
│   │   ├── services/
│   │   │   ├── recipient-status-manager.ts  # Atomic status transitions for recipients
│   │   │   └── campaign-alert-logger.ts     # Campaign health alert creation
│   │   └── utils/
│   │       ├── date-helper.ts        # Timezone-aware date utilities
│   │       ├── email-helper.ts       # Email ID generation, dedup
│   │       ├── error-helper.ts       # SMTP error categorization, retry logic
│   │       ├── followup-helper.ts    # Follow-up eligibility logic
│   │       ├── retry-helper.ts       # withRetry() exponential backoff wrapper
│   │       └── stats-calculator.ts   # Engagement rate calculations
│   │
│   ├── types/                        # Shared TypeScript interfaces
│   │   ├── campaign.ts               # Campaign, CampaignStats, CampaignRecipient
│   │   ├── client.ts                 # Client profile, SMTP config
│   │   ├── investor.ts               # Investor record shape
│   │   ├── recipient.ts              # Recipient status machine
│   │   ├── followup.ts               # Follow-up email types
│   │   └── tracking.ts               # Open/reply tracking event types
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx           # Firebase auth state provider
│   └── middleware.ts                 # Next.js route-level RBAC (cookie-based role check)
│
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## Tech Stack

### Frontend

| Technology | Version | Purpose | Why Chosen |
|---|---|---|---|
| Next.js | 14.0.4 | React framework, App Router, API routes | Unified frontend + backend, serverless-ready |
| React | 18.2 | UI rendering | Required by Next.js |
| TypeScript | 5 | Static typing | Catches schema mismatches early, critical for Firestore ops |
| Tailwind CSS | 3.3 | Utility-first styling | Fast iteration on admin UI without CSS files |
| Ant Design | 5.21 | Component library | Enterprise tables, modals, forms required for data-heavy admin views |
| TipTap | 3.15 | Rich text editor | ProseMirror-based, outputs clean HTML for email bodies |
| Recharts | 2.15 | Charts | Lightweight, composable, integrates cleanly with React |
| Framer Motion | 10.16 | Animations | Smooth page transitions |

### Backend / API

| Technology | Version | Purpose | Why Chosen |
|---|---|---|---|
| Next.js API Routes | 14.0.4 | Serverless API layer | Co-located with frontend, no separate server |
| Firebase Admin SDK | 13.5 | Firestore + Auth server-side | Official SDK, supports token verification and admin writes |
| Nodemailer | 7.0 | SMTP email sending | Mature, supports all SMTP providers including Gmail OAuth |
| node-imap | 0.9.6 | IMAP reply polling | Low-level IMAP access for inbox monitoring |
| mailparser | 3.7 | MIME email parsing | Handles complex email structures, attachment extraction |
| Google Generative AI | 0.24 | Gemini AI integration | Subject/body rewriting, pitch deck analysis |
| node-cron | 4.2 | In-process cron (dev only) | Local development background job testing |
| node-cache | 5.1 | In-process cache | Reduces Firestore reads per cron execution |
| mammoth | 1.11 | DOCX parsing | Extracts text from pitch decks in Word format |
| pdf-parse | 2.1 | PDF parsing | Extracts text from pitch decks in PDF format |
| xlsx | 0.18 | Excel parsing | Reads investor data from uploaded spreadsheets |

### Database & Auth

| Technology | Version | Purpose | Why Chosen |
|---|---|---|---|
| Firebase Firestore | 11 | Primary database | Document model fits campaign/recipient hierarchy; real-time capable |
| Firebase Auth | 11 | Authentication | Handles token lifecycle, eliminates custom JWT implementation |
| Firebase Storage | 11 | File storage | Pitch deck and attachment hosting |

### External Services

| Service | Purpose |
|---|---|
| Google Sheets API | Live investor and incubator database source |
| Google Gemini AI | Email content improvement and pitch deck analysis |
| Client SMTP | Outbound email delivery (Gmail, Outlook, custom) |
| Client IMAP | Inbound reply detection |
| Vercel | Production hosting |
| GitHub Actions | Scheduled cron execution |

---

## Core Logic & Key Modules

### 1. `src/lib/matching.ts` — Investor Scoring Algorithm

The scoring engine matches a startup's profile against every investor/incubator record and returns a 0–100 match score. Weights are fixed: **sector 40%, stage 30%, location 20%, ticket size 10%**.

```typescript
// Rule weights — sum to 100
const WEIGHTS_INVESTOR = { sector: 40, stage: 30, location: 20, ticket: 10 };
```

**Sector matching** normalizes multi-value fields (comma/semicolon-separated strings or arrays) and awards full points for any intersection. **Stage matching** maps raw strings to a canonical ordering (`pre-seed → seed → series a → ...`) and awards partial credit for adjacent stages (±1 step = 50% score). **Location** performs substring matching — "Mumbai" matches "Mumbai, Maharashtra, India". **Ticket size** parses numeric amounts from strings like "₹50L–₹2Cr" and checks for range overlap.

Edge cases handled: missing fields default to zero score (not a match failure), normalized stage variants (`"pre seed"`, `"preseed"`, `"Pre-Seed"` all map to `"pre-seed"`), and Unicode-safe lowercase normalization.

### 2. `src/lib/auth-middleware.ts` — Token Verification & RBAC

Every API route calls `verifyFirebaseToken(request)` before any business logic. It:
1. Extracts the `Authorization: Bearer <token>` header
2. Calls `adminAuth.verifyIdToken(token, checkRevoked: true)` — the `checkRevoked` flag ensures revoked sessions are rejected even before token expiry
3. Fetches the user document from Firestore to get their `role` and `active` status
4. Returns a typed `AuthUser` object

Role guards (`verifyAdmin`, `verifyAdminOrSubadmin`) throw `AuthenticationError` with HTTP status codes, which API routes catch and return as structured JSON.

### 3. `src/app/api/cron/send-emails/route.ts` — Email Dispatch Cron

The most operationally critical module. Runs every 30 minutes via GitHub Actions. Key behaviors:

- **Concurrency lock** — an in-process `isJobRunning` flag prevents overlapping executions. A 4-minute timeout automatically releases the lock if a job hangs.
- **Daily limit enforcement** — counts emails sent today per campaign and stops when `dailyLimit` is reached.
- **Sending window** — skips execution if the current UTC time is outside the campaign's configured window.
- **Retry logic** — failed sends are categorized (`AUTH_FAILED`, `QUOTA_EXCEEDED`, `SPAM_BLOCKED`, etc.) and retried with exponential backoff via `withRetry()`.
- **Tracking pixel injection** — each outbound email gets a unique `<img src="/api/track/open/{trackingId}">` tag embedded in the HTML body.

```typescript
// In-process lock prevents concurrent cron executions on same instance
let isJobRunning = false;
if (isJobRunning) {
  if (Date.now() - jobStartTime > 240000) isJobRunning = false; // force-unlock after 4min
  else return NextResponse.json({ message: "Job already running" }, { status: 429 });
}
```

### 4. `src/lib/imap/reply-checker.ts` — IMAP Reply Detection

Polls the client's inbox via IMAP every 5 hours to detect investor replies. Fetches unseen messages from the last 7 days, parses them with `mailparser`, and attempts to match the sender email address against the campaign's recipient list. On a match, it:
1. Updates the recipient's `trackingData.replied = true`
2. Stores the reply content in a `replies` subcollection
3. Increments `campaign.stats.uniqueResponded`

SMTP-to-IMAP host conversion uses a known provider map (Gmail → `imap.gmail.com`, Outlook → `outlook.office365.com`, etc.) with a regex fallback for custom domains (`smtp.domain.com` → `imap.domain.com`).

### 5. `src/lib/encryption.ts` — AES-256-GCM SMTP Credential Encryption

SMTP passwords are encrypted before storage in Firestore using AES-256-GCM. Each encryption generates a fresh random IV and authentication tag; both are stored alongside the ciphertext as hex strings. The `ENCRYPTION_KEY` environment variable is the only secret needed for decryption.

```typescript
const ALGORITHM = "aes-256-gcm";
// IV is freshly generated per encryption — never reused
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
```

### 6. Campaign Wizard — `src/app/dashboard/campaigns/create/`

A 6-step wizard backed by local React state that is not committed to Firestore until Step 6 (Final Review). Steps:

1. **Client Selection** — pick the startup client
2. **Target Audience** — choose investors, incubators, or both
3. **Match Results** — run the scoring algorithm and select recipients
4. **Email Template** — write/AI-improve subject and body; attach files
5. **Schedule Config** — set dates, daily limit, sending window, timezone
6. **Final Review** — read-only summary → `POST /api/campaigns/activate`

---

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9+
- A Firebase project with Firestore and Authentication enabled
- A Google Cloud project with the Sheets API and Gemini API enabled
- A Google Sheets spreadsheet for investor data and one for incubator data

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/blackleoventures/Investor-Outreach-platform.git
cd Investor-Outreach-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see below)

# 4. Start the development server
npm run dev
```

Application runs at `http://localhost:3000`.

### Environment Variables

Create `.env.local` in the project root. All variables are required unless marked optional.

```env
# ─── Firebase Client SDK (exposed to browser) ─────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXX   # optional — Analytics

# ─── Firebase Admin SDK (server-side only) ─────────────────────────────────────
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
# Note: Wrap the private key in double quotes. Use \n for newlines (not literal newlines).

# ─── Google Sheets ──────────────────────────────────────────────────────────────
INVESTOR_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
INCUBATOR_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
# The service account (FIREBASE_CLIENT_EMAIL) must have Viewer access to both sheets.

# ─── Security ───────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=your-32-byte-hex-key-here
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CRON_SECRET=your-long-random-secret
# Used to authenticate GitHub Actions → cron API calls. Must match GitHub secret.

# ─── API ────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_BASE_URL=/api

# ─── AI ─────────────────────────────────────────────────────────────────────────
GEMINI_API_KEY=AIza...
# Google AI Studio: https://aistudio.google.com/app/apikey

# ─── Environment ────────────────────────────────────────────────────────────────
NODE_ENV=development
```

### Common Setup Errors

| Error | Cause | Fix |
|---|---|---|
| `FirebaseAppError: invalid-credential` | Malformed `FIREBASE_PRIVATE_KEY` | Ensure the key is in double quotes with `\n` for newlines, not literal line breaks |
| `Error: ENCRYPTION_KEY is not set` | Missing env var | Add `ENCRYPTION_KEY` to `.env.local` |
| `Google Sheets 403` | Service account not shared | Share both Google Sheets with `FIREBASE_CLIENT_EMAIL` as Viewer |
| `Cannot find module uuid` | Missing lockfile sync | Delete `node_modules` and run `npm install` again |
| `Gemini API 429` | Rate limit on free tier | Add a delay between AI improvement calls or upgrade to a paid tier |

---

## API Reference

All endpoints require `Authorization: Bearer <Firebase ID Token>` unless marked as public. Base URL: `/api`.

### Campaigns

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/campaigns/list` | Paginated list of all campaigns | Admin/Subadmin |
| `POST` | `/campaigns/activate` | Create and launch a new campaign | Admin/Subadmin |
| `POST` | `/campaigns/match` | Run investor/incubator matching for a client | Admin/Subadmin |
| `GET` | `/campaigns/:id` | Get full campaign details including stats | Admin/Subadmin |
| `PATCH` | `/campaigns/:id` | Pause or resume a campaign | Admin/Subadmin |
| `DELETE` | `/campaigns/:id` | Delete campaign and all associated data | Admin only |
| `PUT` | `/campaigns/:id/email-template` | Update campaign subject and body | Admin/Subadmin |
| `GET` | `/campaigns/:id/recipients` | Paginated recipient list with status | Admin/Subadmin |
| `POST` | `/campaigns/:id/retry-failed` | Retry failed recipient deliveries | Admin/Subadmin |
| `POST` | `/campaigns/:id/reschedule` | Reschedule pending emails | Admin/Subadmin |
| `POST` | `/campaigns/:id/send-followup` | Dispatch follow-up emails | Admin/Subadmin |
| `GET` | `/campaigns/:id/export` | Download recipients as CSV | Admin/Subadmin |
| `GET` | `/campaigns/public/:token` | Public campaign report | None (token-auth) |

### Cron (GitHub Actions only)

| Method | Endpoint | Schedule | Auth |
|---|---|---|---|
| `GET` | `/cron/send-emails` | Every 30 min | `CRON_SECRET` |
| `GET` | `/cron/check-replies` | Every 5 hours | `CRON_SECRET` |
| `GET` | `/cron/update-stats` | Every 6 hours | `CRON_SECRET` |

### Example: Activate Campaign

**Request**
```http
POST /api/campaigns/activate
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "clientId": "abc123",
  "targetType": "investors",
  "matchResults": [
    { "id": "inv_001", "name": "Sequoia Capital", "email": "deals@sequoia.com", "matchScore": 87 }
  ],
  "emailTemplate": {
    "currentSubject": "Curated Deal Flow | Black Leo Ventures",
    "currentBody": "<p>Dear Investor,</p><p>...</p>",
    "originalSubject": "Curated Deal Flow | Black Leo Ventures",
    "originalBody": "<p>Dear Investor,</p><p>...</p>",
    "subjectImproved": false,
    "bodyImproved": false
  },
  "scheduleConfig": {
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "dailyLimit": 50,
    "sendingWindow": { "start": "09:00", "end": "17:00", "timezone": "Asia/Kolkata" },
    "pauseOnWeekends": true
  }
}
```

**Response**
```json
{
  "success": true,
  "campaignId": "xYz789",
  "message": "Campaign created and activated successfully",
  "totalRecipients": 1
}
```

### Example: Update Email Template

**Request**
```http
PUT /api/campaigns/xYz789/email-template
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "subject": "Updated: Deal Flow Alignment | Black Leo Ventures",
  "emailBody": "<p>Dear Investor,</p><p>Updated content...</p>"
}
```

**Response**
```json
{
  "success": true,
  "message": "Email template updated successfully"
}
```

---

## Database Schema

All data is stored in Firebase Firestore. Collections use document IDs as primary keys.

### `users`
Stores platform operators (admins, subadmins) and clients.

| Field | Type | Description |
|---|---|---|
| `uid` | string | Firebase Auth UID |
| `email` | string | Login email |
| `role` | `"admin"` \| `"subadmin"` \| `"client"` \| `"investor"` | Access level |
| `active` | boolean | Account enabled flag |
| `displayName` | string | Display name |
| `createdAt` | string | ISO timestamp |

### `clients`
Startup companies enrolled in the platform.

| Field | Type | Description |
|---|---|---|
| `clientInformation` | object | Company profile (name, sector, stage, revenue, etc.) |
| `smtpConfig` | object | Encrypted SMTP credentials |
| `imapConfig` | object | Encrypted IMAP credentials |
| `pitchAnalysis` | object | AI-generated pitch deck summary |
| `status` | string | Onboarding status |

### `campaigns`
One document per outreach campaign.

| Field | Type | Description |
|---|---|---|
| `clientId` | string | Reference to `clients` doc |
| `status` | `"active"` \| `"paused"` \| `"completed"` \| `"failed"` | Current state |
| `targetType` | `"investors"` \| `"incubators"` \| `"both"` | Audience type |
| `emailTemplate` | object | `currentSubject`, `currentBody`, `originalSubject`, `originalBody`, improvement flags, attachments |
| `schedule` | object | Start/end dates, daily limit, sending window, timezone, weekend pause |
| `stats` | object | Delivery, open, reply counts and rates |
| `publicToken` | string | UUID for public report URL |
| `totalRecipients` | number | Total recipient count |

### `campaignRecipients` (subcollection under `campaigns/{id}/recipients`)

| Field | Type | Description |
|---|---|---|
| `originalContact` | object | `name`, `email`, `organization`, `title` |
| `status` | `"pending"` \| `"sent"` \| `"delivered"` \| `"failed"` \| `"skipped"` | Current delivery state |
| `matchScore` | number | 0–100 compatibility score |
| `scheduledFor` | string | ISO timestamp — when this email is due |
| `trackingData` | object | `opened`, `openCount`, `lastOpenedAt`, `replied`, `repliedAt` |
| `retryCount` | number | Number of delivery attempts |
| `errorCategory` | string | Last error type if failed |

### `campaignAuditLog`

| Field | Type | Description |
|---|---|---|
| `action` | string | e.g. `"campaign_paused"`, `"email_template_updated"` |
| `campaignId` | string | Reference campaign |
| `performedBy` | string | UID of actor |
| `performedByRole` | string | Role of actor |
| `timestamp` | string | ISO timestamp |

---

## Authentication Flow

### Admin / Subadmin Login

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FB as Firebase Auth
    participant API as Next.js API Route
    participant FS as Firestore

    U->>FB: signInWithEmailAndPassword(email, password)
    FB-->>U: Firebase ID Token (1 hour TTL)
    U->>U: Store role in cookie (userRole)
    U->>API: Request with Authorization: Bearer <token>
    API->>FB: adminAuth.verifyIdToken(token, checkRevoked=true)
    FB-->>API: Decoded token (uid, email)
    API->>FS: Get users/{uid} → fetch role + active status
    FS-->>API: User document
    API->>API: verifyAdminOrSubadmin(user)
    API-->>U: 200 OK + data
```

### Investor Magic Link Login

```mermaid
sequenceDiagram
    participant I as Investor (Browser)
    participant API as Next.js API
    participant FS as Firestore
    participant EM as Email (Nodemailer)

    I->>API: POST /api/auth/investor-login {email}
    API->>FS: Create magic link token (TTL: 15min)
    API->>EM: Send login email with link
    I->>API: GET /api/auth/verify-magic-link?token=xxx
    API->>FS: Validate token, fetch investor record
    API-->>I: Set session cookie, redirect to /dashboard/deal-room
```

### Route-Level Access Control

Next.js middleware (`src/middleware.ts`) reads a `userRole` cookie on every request to dashboard routes:

| Role | Permitted Routes |
|---|---|
| `admin` | All routes |
| `subadmin` | All routes except `/dashboard/account-management` |
| `client` | `/dashboard/submit-information` only |
| `investor` | `/dashboard/deal-room/**` only |

---

## Deployment

### Vercel (Production)

```bash
# Install Vercel CLI
npm i -g vercel

# Link project (first time)
vercel link

# Deploy to production
vercel --prod
```

### Environment Variables on Vercel

Add all variables from `.env.local` to the Vercel dashboard under **Settings → Environment Variables**. Critical notes:

- `FIREBASE_PRIVATE_KEY`: Paste the raw key including `-----BEGIN PRIVATE KEY-----`. Vercel handles multi-line values correctly in the dashboard editor — do **not** manually escape newlines.
- `NODE_ENV`: Set to `production` — this suppresses stack traces in API error responses.
- `CRON_SECRET`: Must match the `CRON_SECRET` secret stored in GitHub Actions secrets.

### GitHub Actions Cron Setup

The `cron-jobs.yml` workflow calls three API endpoints on the production Vercel URL. Configure these GitHub secrets:

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value as `CRON_SECRET` in Vercel env vars |

The production URL is hardcoded in the workflow (`PRODUCTION_URL`). Update it if your Vercel project URL changes.

### Cron Schedule

| Job | Frequency | GitHub Actions trigger |
|---|---|---|
| `send-emails` | Every 30 minutes | `*/30 * * * *` |
| `check-replies` | Every 5 hours | Runs at 30-min intervals, skips if not at 5-hour boundary |
| `update-stats` | Every 6 hours | Runs at 30-min intervals, skips if not at 6-hour boundary |

### Post-Deployment Checklist

- [ ] `GET /api/dashboard/stats` returns 200 with valid data
- [ ] Login flow works end-to-end (email + password → dashboard)
- [ ] Campaign list page loads without errors
- [ ] Manually trigger `send-emails` cron via GitHub Actions → `workflow_dispatch`
- [ ] Confirm tracking pixel fires: open a test email and verify `opened` status updates in Firestore
- [ ] Verify SMTP test utility passes for at least one client

---

## Scripts Reference

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start local dev server on port 3000 |
| `dev:lan` | `scripts/dev-local.cmd` | Start dev server accessible on local network (Windows) |
| `build` | `next build` | Compile and optimize for production |
| `start` | `next start` | Run production build locally |
| `lint` | `eslint .` | Run ESLint across all source files |
| `analyze` | `cross-env ANALYZE=true next build` | Build with bundle analyzer output |

---

## Contributing

### Setup

```bash
git clone https://github.com/blackleoventures/Investor-Outreach-platform.git
cd Investor-Outreach-platform
npm install
cp .env.example .env.local
# Fill in .env.local with dev credentials
npm run dev
```

### Branch Naming

```
feat/short-description       # New feature
fix/short-description        # Bug fix
refactor/short-description   # Refactoring, no behavior change
chore/short-description      # Dependency updates, config changes
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add investor reply detection via IMAP
fix: correct timezone offset in sending window check
refactor: extract SMTP error categorization to error-helper
chore: upgrade firebase-admin to 13.5
```

### Pull Request Process

1. Branch from `main`
2. Keep PRs focused — one feature or fix per PR
3. Run `npx tsc --noEmit` and `npm run build` before opening a PR — both must pass
4. Describe what changed and why in the PR body
5. Tag a reviewer

### Code Style

- TypeScript strict mode is enabled — no `any` without justification
- ESLint config from `eslint-config-next` — run `npm run lint` before pushing
- No comments explaining what code does — only comments explaining non-obvious WHY

---

## Roadmap

### Current (v0.1.0)
- [x] Multi-step campaign creation wizard
- [x] Weighted investor/incubator matching
- [x] SMTP-based email delivery with tracking pixels
- [x] IMAP reply detection
- [x] AI email improvement via Gemini
- [x] Follow-up campaign support
- [x] Public shareable campaign reports
- [x] Campaign pause/resume/complete
- [x] Post-creation email template editing
- [x] Campaign health alerts
- [x] Pitch deck analysis via AI

### In Progress
- [ ] Email open rate by time-of-day heatmap
- [ ] Bulk CSV import for investor databases (alternative to Google Sheets)
- [ ] Per-campaign unsubscribe link and suppression list

### Planned
- [ ] Multi-language email templates
- [ ] WhatsApp outreach channel
- [ ] LinkedIn outreach integration
- [ ] A/B subject line testing within a single campaign
- [ ] Client-facing dashboard (read-only campaign view for startup founders)
- [ ] Webhook support for CRM integrations (HubSpot, Pipedrive)

---

## Known Issues & Limitations

- **Concurrency lock is in-process** — the `isJobRunning` flag in the send-emails cron lives in server memory. If Vercel spins up multiple function instances simultaneously (unlikely but possible under high load), two instances could run concurrently. A Firestore-based distributed lock would be more robust.
- **IMAP polling is stateless** — the reply checker fetches emails from the last 7 days on every run. This is intentionally conservative but increases IMAP bandwidth. A cursor-based approach storing the last checked UID would be more efficient.
- **No test suite** — the project currently has no automated tests. API routes should be covered with integration tests before expanding the team.
- **Google Sheets as investor DB** — the matching engine pulls the full sheet on every match request. For sheets with 10,000+ rows, this adds latency. A Firestore-synced cache would resolve this.
- **Single region** — Vercel functions deploy to a single region by default. For international campaigns, latency to Firestore (also single-region) is acceptable but not optimal.

---

---

## Deal Room — Complete Reference

The Deal Room is the investor-facing sub-product embedded inside the platform. It gives invited investors a curated, read-only view of startup opportunities, complete with pitch deck previews and AI-generated investment analysis. It is a separate access layer from the main admin dashboard — investors never see campaigns, client settings, or admin tools.

### Overview

```
Investor receives email invite
        ↓
Opens magic link → /auth/investor-login?token=xxx
        ↓
Backend verifies token, issues Firebase custom token
        ↓
Browser signs into Firebase, sets sessionStorage flag
        ↓
Redirect to /dashboard/deal-room (startup listing)
        ↓
Click startup card → /dashboard/deal-room/:id (founder profile)
        ↓
Click "AI Analyze Deck" → GET /api/deal-room/analysis/:id
```

---

### Pages

#### `src/app/auth/investor-login/page.tsx` — Magic Link Landing

**Route:** `/auth/investor-login?token=<uuid>`

This is the entry point for every investor. It is a stateless page — no form, no password. It fires automatically when the investor opens their invite link.

**What it does:**
1. Reads `token` from the URL query string
2. Calls `POST /api/auth/verify-magic-link` with the token
3. On success, receives a Firebase custom token from the backend
4. Calls `signInWithCustomToken(auth, customToken)` to create a Firebase session in the browser
5. Writes `sessionStorage.setItem('dealRoomAccess', 'granted')` — this flag gates access to all deal room routes
6. Redirects to `/dashboard/deal-room` after 1.5 seconds

**States rendered:**
| State | UI |
|---|---|
| `loading` | Full-screen spinner — "Accessing Deal Room..." |
| `error` | Ant Design `Result` error card — "Access Denied" with Go Home button |
| `success` | Green spinner — "Welcome Back! Redirecting..." |

**Key detail — `sessionStorage` gate:** The magic link token is single-use and backend-verified. After login, the `dealRoomAccess` flag is the only client-side signal that controls access. If the investor refreshes in a new tab or clears sessionStorage, they are redirected to `/dashboard`. This is intentional — investors must re-enter via their link rather than bookmarking the URL.

**Dependencies:**
- `signInWithCustomToken` from `firebase/auth`
- `POST /api/auth/verify-magic-link`
- Ant Design: `Spin`, `Result`, `Button`

---

#### `src/app/dashboard/deal-room/page.tsx` — Startup Listing (`DealRoomDashboard`)

**Route:** `/dashboard/deal-room`

**Access:** Requires `sessionStorage.dealRoomAccess === 'granted'`. On mount, if the flag is absent, immediately redirects to `/dashboard`.

The main deal room view. Fetches all clients via `GET /api/clients` and renders them as a responsive card grid. All filtering is client-side — no additional API calls after the initial load.

**State:**
| Variable | Type | Purpose |
|---|---|---|
| `startups` | `Client[]` | Raw list from API |
| `filteredStartups` | `Client[]` | Derived filtered list, re-computed on every filter change |
| `searchText` | `string` | Free-text search across company name, founder name, industry |
| `industryFilter` | `string \| null` | Selected industry (multi-value industries are split on `,;/`) |
| `stageFilter` | `string \| null` | Selected funding stage |
| `cityFilter` | `string \| null` | Selected city |
| `loading` | `boolean` | Controls full-screen spinner |

**Filtering logic (`filterStartups`):**
- Text search: case-insensitive substring match against `companyName`, `founderName`, `industry`
- Industry filter: splits `startup.industry` on `/[,;/]+/` (handles "AI, Deep-Tech / SaaS") and checks for exact match at the token level
- Stage and city filters: exact string match
- All active filters are composed with AND logic (each narrows the previous result)
- Filter dropdowns are populated dynamically from the loaded data — `uniqueIndustries`, `uniqueStages`, `uniqueCities` are derived with `Array.from(new Set(...))` to deduplicate

**City filter UX note:** Uses a controlled `showSearch` Select that only opens the dropdown when the user has typed at least one character (`open={citySearchValue.length > 0}`). This prevents accidental dropdown opening on focus.

**Card layout:**
- Responsive: 1 column (xs), 2 columns (sm), 3 columns (lg) via Ant Design `Row`/`Col`
- Each card shows: company name, industry tag, funding stage badge, 3-line truncated description, city, investment ask
- "View Profile" button and card `onClick` both navigate to `/dashboard/deal-room/:id`

**Components used:** `Input.Search`, `Select`, `Card`, `Row`, `Col`, `Tag`, `Empty`, `Spin`, `Typography`

---

#### `src/app/dashboard/deal-room/[id]/page.tsx` — Founder Profile (`FounderProfilePage`)

**Route:** `/dashboard/deal-room/:id`

**Access:** Same `sessionStorage` gate as the listing page.

A detailed two-column profile page for a single startup. Left column shows company and founder details; right column shows the pitch deck and AI analysis.

**State:**
| Variable | Type | Purpose |
|---|---|---|
| `client` | `TransformedClient \| null` | Full startup profile from `GET /api/clients/:id` |
| `latestAnalysis` | `PitchAnalysis \| null` | AI analysis result, populated on button click |
| `loading` | `boolean` | Page-level skeleton loader |
| `analyzing` | `boolean` | "AI Analyze Deck" button loading state |

**Left column — Founder & Company card:**
- Black header band with company name
- Founder name, email, phone
- Four metric tiles (funding stage, investment ask, current revenue, primary industry)
- Location with pin icon

**Right column — Pitch Deck:**
- Renders pitch deck PDF in an `<iframe>` with `src="${pitchDeckFileUrl}#toolbar=0"` (toolbar suppressed)
- 16:9 aspect ratio container, min-height 300px on mobile
- "Open Full PDF" overlay button links to the raw Firebase Storage URL in a new tab
- Falls back to Ant Design `Empty` if no pitch deck was uploaded

**Right column — AI Investment Analysis:**
- "AI Analyze Deck" button is disabled if `client.dealRoomPermission === false` (admin controls this per client)
- On click calls `GET /api/deal-room/analysis/:id` which returns the most recent `PitchAnalysis` stored on the client document
- Analysis renders in four sections:

| Section | Content |
|---|---|
| Score Overview | Total score `/100`, investment readiness status (GREEN/YELLOW/RED) as a colored tag |
| Scorecard Metrics | First 4 scorecard dimensions as labeled progress bars (`value × 10 = percent`) |
| Key Highlights | Bulleted list of top 3 highlights from the AI analysis |
| Suggested Questions | Numbered list of due-diligence questions for the founder |

**Permission gate on the analyze button:**
```typescript
disabled={!client.dealRoomPermission}
className={`${!client.dealRoomPermission ? 'bg-gray-400' : 'bg-black'} ...`}
```
The button is visually grayed and non-interactive if the admin has not granted deal room permission for that startup. The API enforces the same check server-side.

**Components used:** `Card`, `Row`, `Col`, `Divider`, `Tag`, `Button`, `Space`, `Empty`, `Spin`, `Progress`, `Typography`

---

#### `src/app/deal/[id]/page.tsx` — Admin Deal Detail (`DealDetailPage`)

**Route:** `/deal/:id`

**Access:** Admin/subadmin only (no `sessionStorage` gate — this is an internal route, not investor-facing).

This is the admin's version of the founder profile. Unlike the investor-facing deal room page, it does not require deal room permission and shows the full AI analysis without restriction. It is used by admins to review a startup's full investment case before deciding whether to grant deal room access to investors.

**Differences from the investor view (`/dashboard/deal-room/[id]`):**

| Feature | Admin `/deal/:id` | Investor `/dashboard/deal-room/:id` |
|---|---|---|
| Access gate | Firebase auth only | `sessionStorage` flag |
| AI analysis | Auto-loaded from `pitchAnalyses` array on the client doc | Loaded on demand via API call |
| `dealRoomPermission` check | Not enforced | Enforced — button disabled |
| Scorecard display | Full scorecard, all dimensions with `<Progress>` bars | First 4 dimensions only |
| Executive summary | Full 4-panel grid (Problem, Solution, Market, Traction) | Condensed (solution shown as italic quote) |
| Company avatar | Initial letter in a circular gray badge | No avatar |

**AI analysis rendering — scorecard:**
```typescript
// Admin view: all dimensions
Object.entries(latestAnalysis.scorecard).map(([key, score]) => (
    <Progress percent={score * 10} strokeColor="#1890ff" />
))

// Investor view: first 4 only
Object.entries(latestAnalysis.scorecard).slice(0, 4).map(...)
```

**Score status colors:**
```typescript
const getProgressColor = (score: number) => {
    if (score >= 70) return "#52c41a"; // green
    if (score >= 40) return "#faad14"; // yellow
    return "#ff4d4f";                  // red
};
```

**Components used:** `Card`, `Row`, `Col`, `Divider`, `Tag`, `Button`, `Progress`, `Space`, `Typography`

---

### API Endpoints

#### `GET /api/deal-room/analysis/:id` — `src/app/api/deal-room/analysis/[id]/route.ts`

Retrieves the most recent AI pitch analysis for a startup. This is the only deal-room-specific API endpoint — all other data access goes through the shared `/api/clients/:id` endpoint.

**Auth:** Firebase ID token required. Allowed roles: `admin`, `subadmin`, `investor`.

**Permission logic:**
```typescript
// Investors are additionally checked against the per-client flag
if (user.role === "investor" && !client.dealRoomPermission) {
    return 403; // "You do not have permission to view analysis for this startup."
}
```

Admins and subadmins bypass the `dealRoomPermission` check entirely. Only investors are restricted.

**Response — success:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "problem": "...",
      "solution": "...",
      "market": "...",
      "traction": "...",
      "status": "GREEN",
      "total_score": 74
    },
    "scorecard": {
      "Problem & Solution Fit": 8,
      "Market Size & Opportunity": 7,
      "Business Model": 6,
      "Traction & Metrics": 5,
      "Team": 8,
      "Competitive Advantage": 7,
      "Go-To-Market Strategy": 6,
      "Financials & Ask": 7,
      "Exit Potential": 6,
      "Alignment with Investor": 7
    },
    "suggested_questions": ["What is your CAC payback period?", "..."],
    "highlights": ["Strong founding team with domain expertise", "..."]
  }
}
```

**Response — no analysis:**
```json
{
  "success": false,
  "error": { "code": "CLIENT_NOT_FOUND", "message": "No analysis available for this startup." }
}
```

**Response — investor without permission:**
```json
{
  "success": false,
  "error": { "code": "ACCESS_DENIED", "message": "You do not have permission to view analysis for this startup." }
}
```

---

### TypeScript Types — `src/types/client.ts`

All deal room data flows through these shared types:

| Type | Used In | Purpose |
|---|---|---|
| `TransformedClient` | `/dashboard/deal-room/[id]` | Flattened client object returned by `GET /api/clients/:id` |
| `PitchAnalysis` | Both detail pages, analysis API | Single AI analysis result — summary, scorecard, questions, highlights |
| `PitchSummary` | Nested in `PitchAnalysis` | Problem/solution/market/traction + status + total score |
| `PitchScorecard` | Nested in `PitchAnalysis` | 10 named dimensions, each scored 0–10 |
| `ApiResponse<T>` | All API routes | Generic success/error envelope |
| `ErrorCode` | API routes | Enum of error codes (`ACCESS_DENIED`, `CLIENT_NOT_FOUND`, etc.) |

**`PitchScorecard` dimensions:**
```typescript
interface PitchScorecard {
  "Problem & Solution Fit": number;     // 0-10
  "Market Size & Opportunity": number;
  "Business Model": number;
  "Traction & Metrics": number;
  "Team": number;
  "Competitive Advantage": number;
  "Go-To-Market Strategy": number;
  "Financials & Ask": number;
  "Exit Potential": number;
  "Alignment with Investor": number;
}
```

**`dealRoomPermission` flag:**
Stored on the `ClientDocument` in Firestore. Set by an admin via `PATCH /api/clients/:id` with `{ dealRoomPermission: true/false }`. Controls whether investors can click "AI Analyze Deck" on the deal room profile. The PDF preview and company details are always visible regardless of this flag.

---

### Deal Room Access Flow — Full Sequence

```mermaid
sequenceDiagram
    participant A as Admin
    participant API as Next.js API
    participant FS as Firestore
    participant EM as Nodemailer
    participant I as Investor (Browser)

    A->>API: POST /api/admin/invite-investor {email}
    API->>FS: Create investor user (role: "investor")
    API->>FS: Create magic link token (TTL: 15min)
    API->>EM: Send invite email with /auth/investor-login?token=xxx
    I->>API: POST /api/auth/verify-magic-link {token}
    API->>FS: Validate token (not expired, not used)
    API->>API: adminAuth.createCustomToken(uid)
    API-->>I: { customToken: "..." }
    I->>I: signInWithCustomToken(auth, customToken)
    I->>I: sessionStorage.setItem('dealRoomAccess', 'granted')
    I->>I: router.push('/dashboard/deal-room')
    I->>API: GET /api/clients (Authorization: Bearer <token>)
    API->>FS: Query all clients with dealRoomPermission = true
    API-->>I: Startup listing
    I->>API: GET /api/clients/:id
    API-->>I: Full TransformedClient
    I->>API: GET /api/deal-room/analysis/:id
    API->>FS: Check client.dealRoomPermission
    API-->>I: PitchAnalysis data
```

---

### Component Dependency Map

```
/auth/investor-login
  └── signInWithCustomToken (firebase/auth)
  └── POST /api/auth/verify-magic-link

/dashboard/deal-room (DealRoomDashboard)
  └── GET /api/clients
  └── Ant Design: Search, Select, Card, Row, Col, Tag, Empty, Spin
  └── → /dashboard/deal-room/:id on card click

/dashboard/deal-room/[id] (FounderProfilePage)
  └── GET /api/clients/:id → TransformedClient
  └── GET /api/deal-room/analysis/:id → PitchAnalysis (on button click)
  └── Ant Design: Card, Row, Col, Divider, Tag, Button, Space, Empty, Spin
  └── PDF viewer: native <iframe> with Firebase Storage URL

/deal/[id] (DealDetailPage) — admin only
  └── GET /api/clients/:id → pitchAnalyses[] (last element)
  └── Ant Design: Card, Row, Col, Divider, Tag, Button, Progress, Space
  └── No separate API call for analysis — reads from client document directly

/api/deal-room/analysis/[id]
  └── verifyFirebaseToken → verifyRole(['admin','subadmin','investor'])
  └── dbHelpers.getById('clients', id)
  └── Returns last element of client.pitchAnalyses[]
```

---

## License

This project is licensed under the **MIT License**.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## Author / Credits

**Tushar Bhowal** — architecture, full-stack development, and deployment.

**Acknowledgements:**
- [Next.js](https://nextjs.org/) — React framework and serverless API runtime
- [Firebase](https://firebase.google.com/) — authentication, database, and storage
- [TipTap](https://tiptap.dev/) — rich text editor engine
- [Ant Design](https://ant.design/) — enterprise component library
- [Nodemailer](https://nodemailer.com/) — SMTP transport
- [Google Gemini](https://ai.google.dev/) — AI content generation

---

<div align="center">
  Built for startup accelerators and venture studios that take outreach seriously.
</div>
