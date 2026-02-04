"""Test script to send a sample digest email."""
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Add crawler to path
sys.path.insert(0, str(Path(__file__).parent / "crawler"))

from crawler.sender import EmailSender
from crawler.models import DigestData, CrawledTender, TenderCategory, TenderPriority


async def send_test_email(to_email: str):
    """Send a test digest email with sample tenders."""
    
    # Create sample tenders
    sample_tenders = [
        CrawledTender(
            title="Supply of Courier Services for Government Department",
            source_url="https://www.etenders.gov.za/sample-tender-1",
            category=TenderCategory.COURIER,
            priority=TenderPriority.HIGH,
            reference_number="DOT/2026/COURIER/001",
            issuer="Department of Transport",
            closing_date=datetime.now() + timedelta(days=5),
            description="Provision of courier and document delivery services for 12 months",
            location="Gauteng",
        ),
        CrawledTender(
            title="Printing Services: Annual Reports and Publications",
            source_url="https://www.etenders.gov.za/sample-tender-2",
            category=TenderCategory.PRINTING,
            priority=TenderPriority.URGENT,
            reference_number="SARS/2026/PRINT/042",
            issuer="South African Revenue Service",
            closing_date=datetime.now() + timedelta(days=3),
            description="Printing of annual reports, brochures and promotional materials",
            location="Pretoria",
            estimated_value=500000.0,
        ),
        CrawledTender(
            title="Logistics and Warehousing Services",
            source_url="https://www.etenders.gov.za/sample-tender-3",
            category=TenderCategory.LOGISTICS,
            priority=TenderPriority.MEDIUM,
            reference_number="TRANSNET/2026/LOG/015",
            issuer="Transnet",
            closing_date=datetime.now() + timedelta(days=14),
            description="Warehousing and distribution services for port operations",
            location="Durban",
        ),
    ]
    
    # Create digest
    digest = DigestData(
        tenant_id="test-tenant-123",
        tenant_name="Procurement Radar SA",
        subscriber_email=to_email,
        subscriber_name="Test User",
        subscriber_categories=["courier", "printing", "logistics"],
        tenders=sample_tenders,
    )
    
    # Send email
    sender = EmailSender()
    success = await sender.send_digest(digest)
    
    if success:
        print(f"✅ Test email sent successfully to {to_email}")
        print(f"   Included {len(sample_tenders)} sample tenders")
    else:
        print(f"❌ Failed to send email to {to_email}")
    
    return success


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_email.py <your-email@example.com>")
        print("\nThis will send a test digest email with sample tenders.")
        sys.exit(1)
    
    email = sys.argv[1]
    print(f"\n📧 Sending test digest email to: {email}")
    print("-" * 50)
    
    asyncio.run(send_test_email(email))
