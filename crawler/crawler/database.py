"""Supabase database client for the crawler."""
import structlog
from supabase import create_client, Client
from datetime import datetime
from typing import Optional

from .config import settings
from .models import CrawledTender, CrawlResult

logger = structlog.get_logger()


class Database:
    """Database client for crawler operations."""
    
    def __init__(self):
        if not settings.supabase_url:
            raise ValueError(
                "SUPABASE_URL environment variable is required. "
                "Set it in your .env file or as a GitHub Actions secret."
            )
        if not settings.supabase_service_role_key:
            raise ValueError(
                "SUPABASE_SERVICE_ROLE_KEY environment variable is required. "
                "Set it in your .env file or as a GitHub Actions secret."
            )
        
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    
    async def get_active_tenants(self) -> list[dict]:
        """Get all active tenants."""
        response = self.client.table("tenants").select(
            "id, name, plan, settings"
        ).execute()
        # Filter active tenants and extract digest_time from settings
        tenants = []
        for t in response.data:
            # Check is_active (default to True if not set)
            is_active = t.get("is_active", True)
            if not is_active:
                continue
            # Get digest_time from settings or use default
            settings = t.get("settings") or {}
            t["digest_time"] = settings.get("digest_time", "08:00")
            tenants.append(t)
        return tenants
    
    async def get_tenant_sources(self, tenant_id: str) -> list[dict]:
        """Get enabled sources for a tenant."""
        response = self.client.table("sources").select(
            "id, name, url, type, tags, requires_js, metadata"
        ).eq("tenant_id", tenant_id).eq("enabled", True).execute()
        # Map to expected format
        sources = []
        for s in response.data:
            s["source_type"] = s.pop("type", "portal")
            s["categories"] = s.pop("tags", ["courier", "printing"])
            metadata = s.pop("metadata", {}) or {}
            s["requires_auth"] = metadata.get("requires_auth", False)
            s["auth_config"] = metadata.get("auth_config")
            sources.append(s)
        return sources
    
    async def get_tenant_subscribers(
        self, 
        tenant_id: str, 
        categories: Optional[list[str]] = None
    ) -> list[dict]:
        """Get active subscribers for a tenant."""
        query = self.client.table("subscriptions").select(
            "id, email, preferences, unsubscribe_token"
        ).eq("tenant_id", tenant_id).eq("is_active", True)
        
        response = query.execute()
        
        # Extract categories from preferences JSONB
        subscribers = []
        for sub in response.data:
            prefs = sub.get("preferences") or {}
            sub["categories"] = prefs.get("categories", ["courier", "printing", "both"])
            sub["name"] = prefs.get("name", sub["email"].split("@")[0])
            subscribers.append(sub)
        
        if categories:
            # Filter by categories on client side
            return [
                sub for sub in subscribers
                if any(cat in sub["categories"] for cat in categories)
            ]
        return subscribers
    
    async def check_tender_exists(
        self, 
        tenant_id: str, 
        reference_number: Optional[str] = None,
        title: str = "",
        source_url: str = ""
    ) -> bool:
        """Check if a tender already exists in the database."""
        import hashlib
        
        # Check by content hash (most reliable)
        if source_url:
            content_str = f"{title}:{source_url}"
            content_hash = hashlib.sha256(content_str.encode()).hexdigest()[:32]
            
            response = self.client.table("tenders").select("id").eq(
                "tenant_id", tenant_id
            ).eq("content_hash", content_hash).limit(1).execute()
            if response.data:
                return True
        
        # Also check by URL directly
        if source_url:
            response = self.client.table("tenders").select("id").eq(
                "tenant_id", tenant_id
            ).eq("url", source_url).limit(1).execute()
            if response.data:
                return True
        
        # Check by reference number in metadata
        if reference_number:
            response = self.client.table("tenders").select("id, metadata").eq(
                "tenant_id", tenant_id
            ).execute()
            for tender in response.data:
                meta = tender.get("metadata") or {}
                if meta.get("reference_number") == reference_number:
                    return True
        
        return False
    
    async def insert_tender(self, tenant_id: str, tender: CrawledTender) -> Optional[str]:
        """Insert a new tender into the database."""
        try:
            import hashlib
            
            # Generate content hash for deduplication
            content_str = f"{tender.title}:{tender.source_url}"
            content_hash = hashlib.sha256(content_str.encode()).hexdigest()[:32]
            
            data = {
                "tenant_id": tenant_id,
                "title": tender.title,
                "url": str(tender.source_url),  # Schema uses 'url' not 'source_url'
                "category": tender.category.value,
                "priority": tender.priority.value,
                "closing_at": tender.closing_date.isoformat() if tender.closing_date else None,
                "summary": tender.description,
                "content_hash": content_hash,
                "source_id": tender.source_id,
                "metadata": {
                    "reference_number": tender.reference_number,
                    "issuer": tender.issuer,
                    "published_date": tender.published_date.isoformat() if tender.published_date else None,
                    "estimated_value": tender.estimated_value,
                    "location": tender.location,
                    "contact_email": tender.contact_email,
                    "contact_phone": tender.contact_phone,
                }
            }
            
            response = self.client.table("tenders").upsert(
                data, 
                on_conflict="tenant_id,content_hash"
            ).execute()
            
            if response.data:
                tender_id = response.data[0]["id"]
                
                # Insert documents if any
                for doc_url in tender.document_urls:
                    self.client.table("tender_documents").insert({
                        "tender_id": tender_id,
                        "doc_type": "pdf" if doc_url.lower().endswith(".pdf") else "html",
                        "filename": doc_url.split("/")[-1],
                        "metadata": {"url": doc_url}
                    }).execute()
                
                return tender_id
            
            return None
            
        except Exception as e:
            logger.error("Failed to insert tender", error=str(e), tender_title=tender.title)
            return None
    
    async def update_source_crawl_stats(
        self, 
        source_id: str, 
        success: bool, 
        tenders_found: int
    ):
        """Update source crawl statistics."""
        try:
            # Get current metadata
            response = self.client.table("sources").select(
                "metadata, last_crawled_at"
            ).eq("id", source_id).single().execute()
            
            current = response.data
            metadata = current.get("metadata") or {}
            current_rate = metadata.get("crawl_success_rate", 100)
            current_tenders = metadata.get("tenders_found", 0)
            
            # Calculate new success rate (weighted average)
            new_rate = (current_rate * 0.9) + ((100 if success else 0) * 0.1)
            
            # Update metadata with crawl stats
            metadata["crawl_success_rate"] = round(new_rate, 1)
            metadata["tenders_found"] = current_tenders + tenders_found
            metadata["last_crawl_success"] = success
            
            self.client.table("sources").update({
                "last_crawled_at": datetime.utcnow().isoformat(),
                "last_crawl_status": "success" if success else "failed",
                "crawl_success_rate": round(new_rate, 1),
                "tenders_found": current_tenders + tenders_found,
                "metadata": metadata,
            }).eq("id", source_id).execute()
            
        except Exception as e:
            logger.error("Failed to update source stats", error=str(e), source_id=source_id)
    
    async def get_recent_tenders(
        self, 
        tenant_id: str, 
        since: datetime,
        categories: Optional[list[str]] = None
    ) -> list[dict]:
        """Get tenders created since a given time."""
        query = self.client.table("tenders").select("*").eq(
            "tenant_id", tenant_id
        ).gte("first_seen", since.isoformat()).order("priority", desc=True).order(
            "closing_at", desc=False
        )
        
        if categories:
            query = query.in_("category", categories)
        
        response = query.execute()
        return response.data
    
    async def create_digest_run(
        self, 
        tenant_id: str, 
        tender_count: int,
        recipient_count: int
    ) -> str:
        """Create a digest run record."""
        from datetime import date
        response = self.client.table("digest_runs").insert({
            "tenant_id": tenant_id,
            "run_date": date.today().isoformat(),
            "tenders_found": tender_count,
            "emails_sent": 0,  # Will be updated after sending
            "status": "pending",
            "metadata": {"recipient_count": recipient_count}
        }).execute()
        return response.data[0]["id"]
    
    async def update_digest_run(
        self, 
        digest_id: str, 
        status: str,
        emails_sent: int = 0,
        error_message: Optional[str] = None
    ):
        """Update digest run status."""
        data = {
            "status": "success" if status in {"completed", "success"} else status,
            "finished_at": datetime.utcnow().isoformat(),
            "emails_sent": emails_sent,
        }
        if error_message:
            data["error_message"] = error_message
            data["status"] = "fail"
        elif data["status"] == "failed":
            data["status"] = "fail"
        
        self.client.table("digest_runs").update(data).eq("id", digest_id).execute()


# Lazy-loaded global database instance
_db_instance: Optional[Database] = None


def get_db() -> Database:
    """Get the database instance (lazy initialization)."""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance


# Module-level db - initialized on first import
# Will raise clear error if env vars not set
db = Database()
