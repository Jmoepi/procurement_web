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
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    
    async def get_active_tenants(self) -> list[dict]:
        """Get all active tenants."""
        response = self.client.table("tenants").select(
            "id, name, plan, digest_time"
        ).eq("is_active", True).execute()
        return response.data
    
    async def get_tenant_sources(self, tenant_id: str) -> list[dict]:
        """Get enabled sources for a tenant."""
        response = self.client.table("sources").select(
            "id, name, url, source_type, categories, requires_auth, auth_config"
        ).eq("tenant_id", tenant_id).eq("is_enabled", True).execute()
        return response.data
    
    async def get_tenant_subscribers(
        self, 
        tenant_id: str, 
        categories: Optional[list[str]] = None
    ) -> list[dict]:
        """Get active subscribers for a tenant."""
        query = self.client.table("subscriptions").select(
            "id, email, name, categories"
        ).eq("tenant_id", tenant_id).eq("is_active", True)
        
        response = query.execute()
        
        if categories:
            # Filter by categories on client side (Supabase array contains is limited)
            return [
                sub for sub in response.data
                if any(cat in sub["categories"] for cat in categories)
            ]
        return response.data
    
    async def check_tender_exists(
        self, 
        tenant_id: str, 
        reference_number: Optional[str] = None,
        title: str = "",
        source_url: str = ""
    ) -> bool:
        """Check if a tender already exists in the database."""
        if reference_number:
            response = self.client.table("tenders").select("id").eq(
                "tenant_id", tenant_id
            ).eq("reference_number", reference_number).limit(1).execute()
            if response.data:
                return True
        
        # Also check by source URL
        if source_url:
            response = self.client.table("tenders").select("id").eq(
                "tenant_id", tenant_id
            ).eq("source_url", source_url).limit(1).execute()
            if response.data:
                return True
        
        return False
    
    async def insert_tender(self, tenant_id: str, tender: CrawledTender) -> Optional[str]:
        """Insert a new tender into the database."""
        try:
            data = {
                "tenant_id": tenant_id,
                "title": tender.title,
                "reference_number": tender.reference_number,
                "description": tender.description,
                "issuer": tender.issuer,
                "source_url": str(tender.source_url),
                "closing_date": tender.closing_date.isoformat() if tender.closing_date else None,
                "published_date": tender.published_date.isoformat() if tender.published_date else None,
                "category": tender.category.value,
                "priority": tender.priority.value,
                "estimated_value": tender.estimated_value,
                "location": tender.location,
                "contact_email": tender.contact_email,
                "contact_phone": tender.contact_phone,
                "source_id": tender.source_id,
            }
            
            response = self.client.table("tenders").insert(data).execute()
            
            if response.data:
                tender_id = response.data[0]["id"]
                
                # Insert documents if any
                for doc_url in tender.document_urls:
                    self.client.table("tender_documents").insert({
                        "tender_id": tender_id,
                        "url": doc_url,
                        "doc_type": "specification" if "spec" in doc_url.lower() else "other",
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
            # Get current stats
            response = self.client.table("sources").select(
                "crawl_success_rate, tenders_found"
            ).eq("id", source_id).single().execute()
            
            current = response.data
            current_rate = current.get("crawl_success_rate") or 100
            current_tenders = current.get("tenders_found") or 0
            
            # Calculate new success rate (weighted average)
            new_rate = (current_rate * 0.9) + ((100 if success else 0) * 0.1)
            
            self.client.table("sources").update({
                "last_crawled_at": datetime.utcnow().isoformat(),
                "crawl_success_rate": round(new_rate, 1),
                "tenders_found": current_tenders + tenders_found,
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
        ).gte("created_at", since.isoformat()).order("priority", desc=True).order(
            "closing_date", desc=False
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
        response = self.client.table("digest_runs").insert({
            "tenant_id": tenant_id,
            "tender_count": tender_count,
            "recipient_count": recipient_count,
            "status": "pending",
        }).execute()
        return response.data[0]["id"]
    
    async def update_digest_run(
        self, 
        digest_id: str, 
        status: str,
        error_message: Optional[str] = None
    ):
        """Update digest run status."""
        data = {
            "status": status,
            "sent_at": datetime.utcnow().isoformat() if status == "completed" else None,
        }
        if error_message:
            data["error_message"] = error_message
        
        self.client.table("digest_runs").update(data).eq("id", digest_id).execute()


# Global database instance
db = Database()
