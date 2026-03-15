# Procurement Radar SA

Procurement Radar SA is a multi-tenant SaaS application for monitoring South African tender opportunities. It crawls configured procurement sources, saves new tenders to Supabase, and delivers digest emails to tenant subscribers through a queued digest pipeline.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149ECA)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)
![Python](https://img.shields.io/badge/Python-3.12-yellow)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

## Overview

The system is split into three clear responsibilities:

1. Next.js app
- dashboard, tenant admin, source management, subscriber management, tender views, analytics, and digest operations
- Supabase Auth signup/login with email OTP verification
- API routes for authenticated tenant actions

2. Python crawler
- crawls configured sources
- deduplicates and ranks tenders
- saves only new tenders
- queues pending digest runs when new tenders are found

3. Digest dispatcher and executor
- GitHub Actions triggers the dispatcher every 10 minutes
- Next.js claims pending digest jobs, executes delivery, and marks runs `success` or `fail`
- stale `running` jobs are recovered automatically

## Current Architecture

```text
┌─────────────────────┐
│     Next.js App     │
│  UI + API + Auth    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│      Supabase       │
│ Auth + Postgres +   │
│ RLS + Storage       │
└───────┬─────┬───────┘
        │     │
        │     └────────────────────────────┐
        ▼                                  ▼
┌─────────────────────┐            ┌─────────────────────┐
│   Python Crawler    │            │ Digest Dispatcher   │
│ crawl -> dedupe ->  │            │ claim -> send ->    │
│ rank -> save ->     │            │ mark success/fail   │
│ queue digest job    │            │                     │
└─────────────────────┘            └─────────────────────┘
                                                │
                                                ▼
                                      ┌─────────────────────┐
                                      │       Resend        │
                                      │ Digest / invite     │
                                      │ email delivery      │
                                      └─────────────────────┘
```

## Key Features

- Multi-tenant isolation with tenant-scoped reads and row-level security
- Supabase-native signup and login flow
- 6-digit email OTP verification handled by Supabase Auth
- Daily crawler that saves only new tenders
- Queued digest system with pending, running, success, and fail states
- Canonical tender category model:
  `courier`, `printing`, `logistics`, `stationery`, `it_hardware`, `general`
- Shared tender read model via `public.tender_read_model`
- Admin-managed sources, subscribers, digests, and invites
- Plan limits for sources and subscribers

## Auth and Roles

Authentication is handled by Supabase Auth.

Signup flow:
- user signs up from the Next.js app
- Supabase sends the 6-digit verification code
- `/auth/verify` verifies the OTP with `supabase.auth.verifyOtp(...)`
- after verification, the user is redirected to `/dashboard`

Role model in the current schema:
- `admin`
- `member`

Current repo migrations expect:
- self-serve signup creates a new tenant and assigns the new user `admin`
- invite signup joins an existing tenant and uses the invited role

That behavior is defined by `supabase/migrations/011_make_self_serve_signup_admin.sql`. Existing databases need that migration applied to match the repo.

## Digest Pipeline

The digest flow is intentionally decoupled:

1. crawler discovers and ranks tenders
2. crawler inserts only new tenders
3. crawler creates a pending `digest_runs` row with `metadata.tender_ids`
4. GitHub Actions calls `/api/internal/digests/dispatch`
5. dispatcher claims pending runs, sends emails, and updates run status

This keeps collection and delivery separate and makes retries safe.

## Tender Read Model

UI and API tender reads are normalized through `public.tender_read_model`, introduced in:

- `supabase/migrations/010_add_tender_read_model_view.sql`

The app-side query layer lives in:

- `src/lib/tender-queries.ts`

This is the canonical read path for:
- dashboard tender summaries
- `/tenders`
- digest preview
- API tender listing

## Tech Stack

- Next.js 16.1
- React 19
- TypeScript 5.7
- Supabase Auth + Postgres
- Python 3.12 crawler
- Resend for digest and operational email delivery
- GitHub Actions for scheduled crawling and digest dispatch

## Quick Start

### Prerequisites

- Node.js 20+
- `pnpm`
- Python 3.12+
- Supabase project
- Supabase CLI recommended for migrations
- Resend account if you want digest or invite emails

### 1. Install dependencies

```bash
pnpm install

cd crawler
python -m venv .venv
.venv\Scripts\activate
pip install -e .
cd ..
```

On macOS or Linux:

```bash
source crawler/.venv/bin/activate
```

### 2. Create environment variables

This repo does not currently ship a committed `.env.example`, so create `.env` manually.

Minimum local app configuration:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000

DIGEST_JOB_SECRET=replace-with-a-long-random-secret
DIGEST_JOB_STALE_MINUTES=30
DIGEST_JOB_MAX_RETRIES=2

EMAIL_TRANSPORT=auto
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Procurement Radar <noreply@your-domain.com>
EMAIL_FROM=Procurement Radar <noreply@your-domain.com>
```

Crawler configuration:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_BASE_URL=http://localhost:3000
RESEND_API_KEY=re_xxx
EMAIL_FROM=Procurement Radar <noreply@your-domain.com>
```

Notes:
- the crawler accepts `SUPABASE_URL` and falls back to `NEXT_PUBLIC_SUPABASE_URL`
- signup OTP emails come from Supabase Auth, not from Resend
- Resend is used for digest and other transactional emails sent by the app

### 3. Apply database migrations

Apply all SQL migrations in `supabase/migrations`.

If you are setting up a new project:

```bash
npx supabase db push
```

If you are upgrading an existing project, make sure these newer migrations are included:

- `010_add_tender_read_model_view.sql`
- `011_make_self_serve_signup_admin.sql`
- `012_add_plan_limit_helper_functions.sql`

### 4. Run the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

### 5. Run the crawler locally

```bash
cd crawler
python -m crawler.run_daily --dry-run
```

Run for a single tenant:

```bash
python -m crawler.run_daily --tenant-id <tenant-uuid>
```

## Development Commands

Frontend:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test
```

Crawler:

```bash
cd crawler
python -m crawler.run_daily --dry-run
python -m pytest
```

Database type generation:

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

## Project Structure

```text
src/
  app/
    (dashboard)/
      analytics/
      dashboard/
      digest/
      settings/
      sources/
      subscribers/
      tenders/
    api/
    auth/
  components/
  lib/
    digest-execution.ts
    digest-jobs.ts
    tender-categories.ts
    tender-queries.ts
    supabase/
  types/
    supabase.ts

crawler/
  crawler/
    crawlers/
    categories.py
    config.py
    database.py
    dedup.py
    ranker.py
    run_daily.py

supabase/
  migrations/

.github/
  workflows/
    daily-crawler.yml
    digest-dispatch.yml
```

## Background Jobs

GitHub Actions workflows included in the repo:

- `.github/workflows/daily-crawler.yml`
  - scheduled for `0 5 * * *`
  - runs the Python crawler daily
- `.github/workflows/digest-dispatch.yml`
  - scheduled for `*/10 * * * *`
  - dispatches queued digest jobs every 10 minutes

## Plans and Limits

Application plan configuration currently defines:

| Plan | Sources | Subscribers | Tenders / day |
|------|---------|-------------|---------------|
| Starter | 30 | 1 | 100 |
| Pro | 150 | 20 | 1000 |
| Enterprise | Unlimited | Unlimited | Unlimited |

App pricing configuration lives in:

- `src/lib/plans.ts`

Database helper compatibility for limit checks lives in:

- `supabase/migrations/012_add_plan_limit_helper_functions.sql`

## Email Setup

Two separate email systems are involved:

1. Supabase Auth email
- used for signup verification OTPs
- configure this in your Supabase project auth settings

2. Resend
- used for digest and transactional emails sent by the app
- verify a sending domain before using real recipients

If you use the Resend test sender, delivery is restricted to your own Resend account email.

## Operational Notes

- `/api/sources` is the supported path for source creation and updates from the UI
- the browser should not write directly to `rest/v1/sources`
- digest execution reads queued `tender_ids` and no longer relies on a loose time window
- the app uses generated-style Supabase types from `src/types/supabase.ts`
- `useSearchParams()` on `/auth/verify` is wrapped in `Suspense` for Next.js 16 build compatibility

## Deployment

Typical production deployment:

1. deploy the Next.js app
2. configure Supabase Auth and database
3. apply all migrations
4. configure Resend sender domain
5. add GitHub Actions secrets
6. enable the scheduled workflows

Recommended secrets:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
APP_BASE_URL
DIGEST_JOB_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
EMAIL_FROM
```

## License

MIT. See [LICENSE](LICENSE).
