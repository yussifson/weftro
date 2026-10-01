# CliPad Intelligence V3

> **Enterprise Knowledge Capture, Meeting Intelligence & Async Collaboration Platform**

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Route Reference](#route-reference)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

---

## Overview

CliPad is an advanced AI-powered capture and intelligence platform built for modern enterprise teams. It enables executives and remote teams to:

- **Record meetings** (async video or live sessions) and automatically generate transcripts, decisions, and action items.
- **Navigate organizational memory** via Knowledge Graph, Timeline, and Decision Ledger.
- **Query the collective brain** of their organization with Orbit AI — the intelligent search hub.
- **Work offline-first** with instant sync via PowerSync.

CliPad V3 introduces the OmniImpressive theme, Cross-Space Intelligence, Predictive Risk Analysis, and Commitment Tracking — bringing a new dimension of proactive insight to every team.

---

## Core Features

| Feature | Route | Description |
|---|---|---|
| **Dashboard** | `/dashboard` | Central hub showing recent spaces, knowledge health, and team activity |
| **Spaces** | `/spaces` | Workspace containers per team/project |
| **Space Detail** | `/spaces/:id` | Full view of a space's meetings, assets, and insights |
| **Meeting Capture** | `/capture` | Record video messages, upload recordings, auto-transcribe |
| **Orbit AI Search** | `/search` | Intelligent search across all organizational memory |
| **Knowledge Timeline** | `/timeline` | Chronological view of decisions and knowledge evolution |
| **Decision Ledger** | `/decisions` | All decisions extracted from meetings in one place |
| **Knowledge Graph** | `/graph` | Visual graph of people, topics, and decisions |
| **Action Items** | `/action-items` | All commitments made across every space |
| **Commitment Intelligence** | `/commitment-intelligence` | Track promises made vs. fulfilled |
| **Predictive Risk** | `/predictive-risk` | Proactive risk flags before issues become critical |
| **Org Health Pulse** | `/org-health-pulse` | Team wellbeing and collaboration health score |
| **Cross-Space Intelligence** | `/cross-space-intelligence` | AI insights that connect patterns across all spaces |
| **Decision Replay** | `/decision-replay` | Re-experience key decisions in their original context |
| **Analytics** | `/analytics` | Video usage, engagement, and knowledge metrics |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 + Vite 6 |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **State Management** | TanStack React Query |
| **Routing** | React Router v6 |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Offline Sync** | PowerSync |
| **i18n** | i18next + Locize |
| **PWA** | vite-plugin-pwa |

### Brand Colors

| Name | Hex | Usage |
|---|---|---|
| Deep Green | `#006065` | Sidebar, TopNav background |
| Teal | `#00BEAC` | Main content background |
| Active Yellow | `#FAD503` | Active sidebar items, accents |
| Logo Green | `#00a851` | CliPad logo fill |
| Alert Red | `#ef4444` | Logo dot, error states |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/optavel/clipad.git
cd clipad
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the keys listed below.

### 4. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

---

## Project Architecture

```
clipad/
├── public/                          # Static assets (favicons, SVGs)
│   ├── clipad-favicon-round.svg
│   └── clipad-logo-green.svg
│
├── src/
│   ├── App.jsx                      # Root router — CliPad routes ONLY
│   ├── main.jsx                     # App entry point + PWA setup
│   ├── index.css                    # Global styles + Tailwind
│   │
│   ├── pages/clipad/                # All CliPad page components
│   │   ├── CliPadDashboard.jsx
│   │   ├── CliPadLogin.jsx
│   │   ├── CliPadSignUp.jsx
│   │   ├── SearchHub.jsx            # Orbit AI search
│   │   ├── MeetingRecord.jsx        # Video capture
│   │   ├── SpacesList.jsx
│   │   ├── SpaceDashboard.jsx
│   │   ├── KnowledgeGraph.jsx
│   │   ├── KnowledgeTimeline.jsx
│   │   ├── DecisionLedger.jsx
│   │   ├── ActionItems.jsx
│   │   ├── KnowledgeJourney.jsx
│   │   ├── VideoAnalytics.jsx
│   │   ├── DecisionReplay.jsx
│   │   ├── CommitmentIntelligence.jsx
│   │   ├── PredictiveRisk.jsx
│   │   ├── OrgHealthPulse.jsx
│   │   ├── CrossSpaceIntelligence.jsx
│   │   └── admin/
│   │       ├── Overview.jsx
│   │       ├── CompanyManagement.jsx
│   │       ├── PricingTags.jsx
│   │       ├── AuditMonitor.jsx
│   │       ├── LiveSupport.jsx
│   │       ├── AdminAI.jsx
│   │       └── CustomRequests.jsx
│   │
│   ├── components/
│   │   ├── clipad/                  # CliPad layout components
│   │   │   ├── ClipadSidebar.jsx
│   │   │   ├── ClipadTopNav.jsx
│   │   │   └── ClipadMobileNav.jsx
│   │   ├── layout/
│   │   │   ├── ClipadLayout.jsx
│   │   │   └── ClipadAdminLayout.jsx
│   │   └── ui/
│   │       └── CliPadLogo.jsx
│   │
│   ├── lib/                         # Contexts and utilities
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── domainUtils.js
│   │
│   └── api/
│       ├── supabaseClient.js
│       └── PowerSyncConnector.js
│
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Route Reference

### Public Routes

| Route | Component |
|---|---|
| `/login` | CliPadLogin |
| `/signup` | CliPadSignUp |
| `/custom-pricing` | CliPadCustomPricing |

### Authenticated Routes

| Route | Component |
|---|---|
| `/dashboard` | CliPadDashboard |
| `/analytics` | VideoAnalytics (Enterprise users get EnterpriseDashboard) |
| `/spaces` | SpacesList |
| `/spaces/:spaceId` | SpaceDashboard |
| `/capture` | MeetingRecord |
| `/search` | SearchHub (Orbit AI) |
| `/timeline` | KnowledgeTimeline |
| `/decisions` | DecisionLedger |
| `/graph` | KnowledgeGraph |
| `/action-items` | ActionItems |
| `/knowledge-journey` | KnowledgeJourney |
| `/integrations` | IntegrationsHub |
| `/settings` | CliPadSettings |
| `/decision-replay` | DecisionReplay |
| `/commitment-intelligence` | CommitmentIntelligence |
| `/predictive-risk` | PredictiveRisk |
| `/org-health-pulse` | OrgHealthPulse |
| `/cross-space-intelligence` | CrossSpaceIntelligence |

### Admin Routes

| Route | Component |
|---|---|
| `/admin` | Overview |
| `/admin/companies` | CompanyManagement |
| `/admin/pricing` | PricingTags |
| `/admin/audit` | AuditMonitor |
| `/admin/support` | LiveSupport |
| `/admin/ai` | AdminAI |
| `/admin/custom-requests` | CustomRequests |

---

## Environment Variables

Add these in `.env.local` locally, and in your **Vercel Project Settings** for deployment:

```env
# Supabase — Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth — Required for SSO login
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Payments
VITE_PAYSTACK_PUBLIC_KEY=your-paystack-public-key

# i18n (Locize)
VITE_LOCIZE_PROJECT_ID=your-locize-project-id
VITE_LOCIZE_API_KEY=your-locize-api-key

# AI
VITE_CLOUDFLARE_AI_TOKEN=your-cloudflare-ai-token

# Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Deployment

CliPad is optimized for **Vercel**.

1. Push code to `https://github.com/optavel/clipad`
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `optavel/clipad`
3. Add all environment variables in Vercel Project Settings
4. Deploy!

**Build Command:** `npm run build`
**Output Directory:** `dist`

---

> Built with love by the Optavel team.
