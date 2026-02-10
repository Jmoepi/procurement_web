"""Check database for subscriptions, tenants, and tenders."""
import os
import sys
from pathlib import Path

# Add parent to path for dotenv
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from supabase import create_client

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("ERROR: Missing SUPABASE credentials in .env")
    sys.exit(1)

client = create_client(url, key)

# Check subscriptions
print("=== SUBSCRIPTIONS ===")
subs = client.table('subscriptions').select('*').execute()
for s in subs.data:
    print(f"  Email: {s.get('email')}, Active: {s.get('is_active')}, Tenant: {s.get('tenant_id')}")

if not subs.data:
    print("  NO SUBSCRIBERS FOUND! This is why you're not receiving emails.")

# Check tenants
print("\n=== TENANTS ===")
tenants = client.table('tenants').select('id, name').execute()
for t in tenants.data:
    print(f"  {t['id']}: {t['name']}")

if not tenants.data:
    print("  NO TENANTS FOUND!")

# Check recent tenders
print("\n=== RECENT TENDERS (last 5) ===")
tenders = client.table('tenders').select('id, title, created_at').order('created_at', desc=True).limit(5).execute()
for t in tenders.data:
    title = t['title'][:60] + '...' if len(t['title']) > 60 else t['title']
    print(f"  {t['created_at'][:10]}: {title}")

if not tenders.data:
    print("  NO TENDERS FOUND!")

# Check digest runs
print("\n=== RECENT DIGEST RUNS ===")
try:
    digests = client.table('digest_runs').select('*').order('created_at', desc=True).limit(5).execute()
    for d in digests.data:
        print(f"  {d.get('created_at', '')[:19]}: Status={d.get('status')}, Emails={d.get('emails_sent')}")
    if not digests.data:
        print("  No digest runs recorded yet")
except Exception as e:
    print(f"  (digest_runs table may not exist: {e})")
