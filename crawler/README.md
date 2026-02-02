# Procurement Radar SA - Daily Crawler

Python-based tender crawler that scans South African government and institutional 
procurement portals for courier and printing tenders.

## Setup

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -e .
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
```

## Running

```bash
# Run full daily crawler
python -m crawler.run_daily

# Run for specific tenant
python -m crawler.run_daily --tenant-id <tenant-id>

# Dry run (no database writes)
python -m crawler.run_daily --dry-run
```

## Architecture

- `run_daily.py` - Main entry point, orchestrates crawling and email sending
- `crawlers/base.py` - Base crawler class with common functionality
- `crawlers/etender.py` - eTender portal crawler
- `crawlers/treasury.py` - Provincial treasury crawlers
- `crawlers/soe.py` - SOE (Eskom, Transnet, etc.) crawlers
- `parsers/` - HTML and PDF parsers
- `dedup.py` - Deduplication logic using fuzzy matching
- `ranker.py` - Priority ranking based on keywords and closing dates
- `sender.py` - Resend email sender with HTML template
