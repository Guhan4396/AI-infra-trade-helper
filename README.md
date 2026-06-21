# AI Infra Tracker

A hosted web app for tracking the AI infrastructure supply chain. Deployed on Vercel, connected to GitHub.

## Features

1. **Supply Chain Map** — ~85 company entries across 14 tiers with chokepoint weights
2. **Custom Silicon** — Hyperscaler chip programs (Google TPU, Amazon Trainium, Meta MTIA, Microsoft Maia) mapped to partners
3. **Daily News Cron** — Runs at 08:00 IST (02:30 UTC), tiered news sourcing, pushes signals to ntfy.sh
4. **Signal Dashboard** — Per-company price/volume + deal flags. Never synthesizes into advice.
5. **AI Research Tool** — On-demand only, button-triggered, uses Claude with web search

> **No investment advice is ever generated.** All pages display raw data and signals only.

---

## Quick Start

```bash
git clone <repo>
cd ai-infra-tracker
npm install
cp .env.local.example .env.local
# fill in .env.local (see below)
npm run dev
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values.

### Required

| Variable | Description |
|---|---|
| `CRON_SECRET` | Bearer token protecting cron + cron-test routes. Generate: `openssl rand -base64 32` |
| `NTFY_TOPIC` | Long, unguessable ntfy.sh topic name. Treat like a password. |
| `ANTHROPIC_API_KEY` | Required for the AI Research Tool only |

### Optional (Google Sheets — primary price data)

| Variable | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` | Base64-encoded service account JSON key |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Spreadsheet ID from the URL |
| `GOOGLE_SHEETS_TAB_NAME` | Sheet tab name (default: `Prices`) |

If Google Sheets is not configured, Yahoo Finance is used automatically as a fallback (no key needed).

---

## Google Sheets Setup (Optional)

If you want price data from your own GOOGLEFINANCE spreadsheet:

1. Create a Google Cloud project and enable the **Google Sheets API**
2. Create a **Service Account** and download the JSON key
3. Share your spreadsheet with the service account email (Viewer role)
4. Encode the key: `base64 -w0 service-account-key.json`
5. Set `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` to that base64 string

**Spreadsheet format** (columns A–F, row 1 = header):

| A: ticker | B: googleTicker | C: price | D: change1d% | E: change5d% | F: volume |
|---|---|---|---|---|---|
| NVDA | NASDAQ:NVDA | `=GOOGLEFINANCE("NASDAQ:NVDA","price")` | `=...` | ... | ... |

Use `GOOGLEFINANCE(B2,"price")`, `GOOGLEFINANCE(B2,"changepct")`, etc.

---

## ntfy.sh Setup

1. Choose a long, unguessable topic name (e.g. `ai-infra-signals-x7k2m9p4q8r3n6w1`)
2. Set `NTFY_TOPIC=<your-topic>` in `.env.local`
3. Subscribe on your phone: open `https://ntfy.sh/<your-topic>` or use the ntfy app

---

## Cron Job

The daily cron runs at **02:30 UTC (08:00 IST)** via Vercel Cron.

Schedule is in `vercel.json`:
```json
{ "path": "/api/cron/daily-check", "schedule": "30 2 * * *" }
```

To test manually:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/daily-check
```

The cron job:
- Fetches news from PR wires (tier 1) → SEC EDGAR (tier 2) → Google News (tier 3)
- Detects deal keywords (deal, partnership, contract, acquisition, etc.)
- Detects cross-company deals (same headline mentioning multiple tracked companies)
- Pushes up to 8 notifications per run to ntfy.sh (bundles overflow)
- **Never calls any LLM/AI API**

---

## News Tiering

| Priority | Source | Method |
|---|---|---|
| 1 | PR Wires | Google News RSS filtered to `businesswire.com`, `prnewswire.com`, `globenewswire.com`, etc. |
| 2 | SEC EDGAR | Full-text search on 8-K/6-K filings via `efts.sec.gov` (free, no key) |
| 3 | Google News | Unrestricted RSS catch-all |

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in Vercel dashboard
3. Set all environment variables in Vercel → Settings → Environment Variables
4. Deploy — Vercel picks up `vercel.json` for the cron schedule automatically

---

## Cost

| Feature | Cost |
|---|---|
| Supply Chain Map | Free forever (static) |
| Custom Silicon | Free forever (static) |
| Daily Cron | Free forever (no LLM) |
| Signal Dashboard | Free forever (Yahoo Finance fallback needs no key) |
| AI Research Tool | ~$0.025–$0.15 per query (Claude claude-opus-4-8 with web search) |

---

## Important Disclaimers

- **No investment advice.** This app displays raw supply chain data and news signals only.
- The AI Research Tool outputs factual research, not investment recommendations.
- Price data is for informational purposes only.
- Deal flags indicate news activity, not buy/sell signals.
- The app has no login system — anyone with the URL can view the supply chain map.
- The ntfy topic acts as an access token for notifications — keep it secret.

---

## File Structure

```
app/
  layout.tsx                    # Root layout with nav
  page.tsx                      # Redirects to /supply-chain
  globals.css                   # Plain CSS (no Tailwind)
  supply-chain/page.tsx         # Tier grid with chokepoint weights
  hyperscaler-silicon/page.tsx  # Custom silicon partner maps
  signal-dashboard/page.tsx     # Price + deal flag table
  research-tool/page.tsx        # On-demand AI research UI
  api/
    cron/daily-check/route.ts   # Vercel Cron handler (no LLM)
    market-data/route.ts        # Sheets + Yahoo Finance
    research/route.ts           # Anthropic API (on-demand only)

lib/
  companies.js                  # Canonical company list (DO NOT auto-edit)
  hyperscaler-silicon.js        # Custom silicon programs
  chokepoint-weights.js         # Tier weights
  cache.ts                      # In-memory deal flag store
  ntfy.ts                       # ntfy.sh helper
  news-fetcher.ts               # Tiered news fetching (no LLM)
  market-data.ts                # Sheets + Yahoo Finance data

components/
  NavLinks.tsx                  # Client-side nav with active state

research-suggestions.json       # Written by research tool (never auto-merged)
vercel.json                     # Cron schedule
.env.local.example              # Environment variable template
```
