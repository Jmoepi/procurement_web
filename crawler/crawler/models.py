"""Data models for the crawler."""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional


class TenderCategory(str, Enum):
    COURIER = "courier"
    PRINTING = "printing"
    LOGISTICS = "logistics"
    STATIONERY = "stationery"
    IT_HARDWARE = "it_hardware"
    GENERAL = "general"


class TenderPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class CrawledTender(BaseModel):
    """A tender discovered during crawling."""
    
    title: str = Field(..., min_length=1, max_length=500)
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    issuer: str = Field(..., min_length=1, max_length=255)
    source_url: HttpUrl
    closing_date: Optional[datetime] = None
    published_date: Optional[datetime] = None
    category: TenderCategory = TenderCategory.GENERAL
    priority: TenderPriority = TenderPriority.MEDIUM
    estimated_value: Optional[float] = None
    location: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    document_urls: list[str] = Field(default_factory=list)
    
    # Metadata
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    crawled_at: datetime = Field(default_factory=datetime.utcnow)
    raw_html: Optional[str] = None


class CrawlResult(BaseModel):
    """Result from crawling a single source."""
    
    source_id: str
    source_name: str
    source_url: str
    success: bool
    tenders_found: int = 0
    new_tenders: int = 0
    error_message: Optional[str] = None
    duration_seconds: float = 0.0
    crawled_at: datetime = Field(default_factory=datetime.utcnow)


class DigestData(BaseModel):
    """Data prepared for email digest."""
    
    tenant_id: str
    tenant_name: str
    subscriber_email: str
    subscriber_name: Optional[str] = None
    subscriber_categories: list[str]
    tenders: list[CrawledTender]
    generated_at: datetime = Field(default_factory=datetime.utcnow)
