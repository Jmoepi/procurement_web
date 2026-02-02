# 🇿🇦 Procurement Radar SA

A production-quality multi-tenant SaaS application for monitoring South African government and institutional procurement/tender opportunities. Automatically scans tender portals daily, deduplicates and ranks results, and sends email digests to subscribers.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)
![Python](https://img.shields.io/badge/Python-3.12-yellow)
![License](https://img.shields.io/badge/License-MIT-purple)

## ✨ Features

- **🔍 Automated Crawling**: Daily scanning of 35+ South African tender sources
- **🎯 Smart Categorization**: Automatic detection of courier, printing, logistics, and stationery tenders
- **📊 Priority Ranking**: AI-powered ranking based on value, urgency, and relevance
- **📧 Email Digests**: Daily digest emails with customizable category preferences
- **👥 Multi-tenant**: Secure tenant isolation with row-level security
- **💳 Subscription Plans**: Starter (R299/mo), Pro (R799/mo), Enterprise (R2499/mo)
- **📈 Analytics**: Comprehensive dashboards and trend analysis

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 15    │────▶│    Supabase     │◀────│  Python Crawler │
│   (Frontend)    │     │  (PostgreSQL)   │     │  (GitHub Actions)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │     Resend      │
                        │   (Email API)   │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Supabase account (free tier works)
- Resend account (free tier: 3,000 emails/month)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/procurement-radar-sa.git
cd procurement-radar-sa

# Install frontend dependencies
npm install

# Install crawler dependencies
cd crawler
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e .
cd ..
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Push migrations to Supabase
npx supabase db push

# Or run migrations manually in Supabase SQL Editor:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_seed_data.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test the Crawler

```bash
cd crawler
python -m crawler.run_daily --dry-run
```

## 📁 Project Structure

```
procurement-radar-sa/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Authenticated dashboard routes
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── tenders/        # Tender list & detail
│   │   │   ├── sources/        # Source management (admin)
│   │   │   ├── subscribers/    # Subscriber management
│   │   │   ├── digest/         # Digest preview
│   │   │   ├── analytics/      # Analytics dashboard
│   │   │   └── settings/       # User settings
│   │   ├── auth/               # Authentication pages
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── dashboard/          # Dashboard layout components
│   │   ├── tenders/            # Tender-related components
│   │   ├── sources/            # Source management components
│   │   ├── subscribers/        # Subscriber components
│   │   ├── digest/             # Digest preview components
│   │   ├── analytics/          # Analytics components
│   │   └── settings/           # Settings components
│   ├── lib/
│   │   ├── supabase/           # Supabase client modules
│   │   ├── utils.ts            # Utility functions
│   │   └── plans.ts            # Pricing configuration
│   └── types/                  # TypeScript type definitions
├── crawler/
│   ├── crawler/
│   │   ├── crawlers/           # Source-specific crawlers
│   │   │   ├── base.py         # Base crawler class
│   │   │   ├── etender.py      # eTender portal
│   │   │   ├── soe.py          # State-owned enterprises
│   │   │   ├── university.py   # Universities
│   │   │   └── metro.py        # Municipalities
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # Supabase client
│   │   ├── dedup.py            # Deduplication logic
│   │   ├── ranker.py           # Priority ranking
│   │   ├── sender.py           # Email sender
│   │   └── run_daily.py        # Main entry point
│   └── pyproject.toml          # Python dependencies
├── supabase/
│   └── migrations/             # SQL migrations
├── data/
│   └── sources.json            # Seed source data
├── .github/
│   └── workflows/
│       ├── daily-crawler.yml   # Daily cron job
│       └── deploy.yml          # Vercel deployment
└── package.json
```

## 💰 Pricing Plans

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| **Price** | R299/mo | R799/mo | R2,499/mo |
| **Sources** | 30 | 150 | Unlimited |
| **Subscribers** | 1 | 20 | Unlimited |
| **Categories** | 3 | All | All |
| **Email Digest** | Daily | Daily | Daily |
| **Analytics** | Basic | Advanced | Advanced |
| **API Access** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **Custom Sources** | ❌ | ❌ | ✅ |

## 🔐 Security

- **Row-Level Security (RLS)**: All data isolated by tenant
- **Auth**: Supabase Auth with email/password
- **Service Role**: Python crawler uses service role for cross-tenant operations
- **Environment Variables**: All secrets stored in environment variables

## 🌍 Data Sources

The application monitors 35+ South African procurement sources:

### Government
- eTender Portal (National)
- 9 Provincial Treasuries

### Metropolitan Municipalities
- City of Johannesburg
- City of Cape Town
- eThekwini (Durban)
- City of Tshwane (Pretoria)
- Ekurhuleni
- And more...

### State-Owned Enterprises
- Transnet
- Eskom
- SA Post Office
- PRASA
- SANRAL
- SAA, ACSA

### Universities
- UCT, UP, Wits, Stellenbosch
- UKZN, UJ, UNISA
- And more...

## 🛠️ Development

### Frontend Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
```

### Crawler Development

```bash
cd crawler
python -m crawler.run_daily --dry-run   # Test without saving
python -m crawler.run_daily --tenant-id xxx   # Single tenant
python -m pytest   # Run tests
```

### Database

```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id your-project-id > src/types/supabase.ts

# Reset database
npx supabase db reset
```

## 📧 Email Configuration

1. Sign up at [Resend](https://resend.com)
2. Add and verify your domain
3. Get your API key
4. Set `RESEND_API_KEY` in environment

## ⚙️ GitHub Actions Setup

Add these secrets to your repository:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

The daily crawler runs at 07:00 SAST (05:00 UTC).

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables
3. Deploy!

### Manual

```bash
npm run build
npm start
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- 📧 Email: support@procurementradar.co.za
- 📖 Docs: [docs.procurementradar.co.za](https://docs.procurementradar.co.za)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/procurement-radar-sa/issues)

---

Built with by KOENENG HUB in South Africa 🇿🇦
DANKO😊