"""Configuration and settings for the crawler."""
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment from project root
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)


class Settings(BaseModel):
    """Application settings loaded from environment."""
    
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Resend
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")
    email_from: str = os.getenv("EMAIL_FROM", "Procurement Radar <noreply@procurementradar.co.za>")
    
    # App
    app_base_url: str = os.getenv("APP_BASE_URL", "https://procurement-web-iota.vercel.app")
    
    # Crawler settings
    max_concurrent_requests: int = int(os.getenv("MAX_CONCURRENT_REQUESTS", "5"))
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    retry_attempts: int = int(os.getenv("RETRY_ATTEMPTS", "3"))
    
    # Categories to search for
    target_categories: list[str] = [
        "courier",
        "printing",
        "logistics",
        "stationery",
        "it_hardware",
    ]
    
    # Keywords for category detection
    category_keywords: dict[str, list[str]] = {
        "courier": [
            "courier", "delivery", "mail", "parcel", "package",
            "document delivery", "express delivery", "same day delivery",
            "postal", "freight", "dispatch", "messenger",
        ],
        "printing": [
            "printing", "print", "publication", "brochure", "flyer",
            "business cards", "booklet", "banner", "signage", "posters",
            "binding", "lamination", "copying", "photocopy",
        ],
        "logistics": [
            "logistics", "transport", "warehousing", "distribution",
            "supply chain", "fleet", "trucking", "haulage", "removal",
        ],
        "stationery": [
            "stationery", "office supplies", "paper", "pens", "files",
            "folders", "envelopes", "toner", "cartridge", "ink",
        ],
        "it_hardware": [
            "computer", "laptop", "desktop", "server", "printer",
            "scanner", "monitor", "hardware", "networking", "it equipment",
        ],
    }
    
    # Priority keywords
    high_priority_keywords: list[str] = [
        "urgent", "emergency", "immediate", "asap", "priority",
        "3 year", "three year", "multi-year", "framework",
        "national", "nationwide", "all provinces",
    ]
    
    # Deduplication threshold (0-100)
    dedup_threshold: int = int(os.getenv("DEDUP_THRESHOLD", "85"))


settings = Settings()
