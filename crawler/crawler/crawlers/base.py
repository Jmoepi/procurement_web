"""Base crawler class with common functionality."""
import asyncio
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
import structlog
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..models import CrawledTender, TenderCategory, TenderPriority

logger = structlog.get_logger()


class BaseCrawler(ABC):
    """Base class for all tender crawlers."""
    
    def __init__(
        self,
        source_id: str,
        source_name: str,
        base_url: str,
        categories: list[str],
    ):
        self.source_id = source_id
        self.source_name = source_name
        self.base_url = base_url
        self.categories = categories
        self.client = httpx.AsyncClient(
            timeout=settings.request_timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-ZA,en;q=0.9",
            },
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.client.aclose()
    
    @retry(
        stop=stop_after_attempt(settings.retry_attempts),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a page with retry logic."""
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.warning("Failed to fetch page", url=url, error=str(e))
            raise
    
    @abstractmethod
    async def crawl(self) -> list[CrawledTender]:
        """Crawl the source and return discovered tenders."""
        pass
    
    def detect_category(self, title: str, description: str = "") -> TenderCategory:
        """Detect tender category based on keywords."""
        text = f"{title} {description}".lower()
        
        for category, keywords in settings.category_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return TenderCategory(category)
        
        return TenderCategory.GENERAL
    
    def detect_priority(
        self, 
        title: str, 
        description: str = "",
        closing_date: Optional[datetime] = None,
        estimated_value: Optional[float] = None,
    ) -> TenderPriority:
        """Determine tender priority."""
        text = f"{title} {description}".lower()
        
        # Check for urgent keywords
        if any(kw in text for kw in ["urgent", "emergency", "immediate"]):
            return TenderPriority.URGENT
        
        # Check closing date (< 7 days = high, < 14 days = medium)
        if closing_date:
            days_remaining = (closing_date - datetime.now()).days
            if days_remaining <= 3:
                return TenderPriority.URGENT
            elif days_remaining <= 7:
                return TenderPriority.HIGH
            elif days_remaining <= 14:
                return TenderPriority.MEDIUM
        
        # Check for high-value or multi-year
        if estimated_value and estimated_value > 1_000_000:
            return TenderPriority.HIGH
        
        if any(kw in text for kw in settings.high_priority_keywords):
            return TenderPriority.HIGH
        
        return TenderPriority.MEDIUM
    
    def is_relevant(self, title: str, description: str = "") -> bool:
        """Check if tender is relevant to our target categories."""
        text = f"{title} {description}".lower()
        
        for category in self.categories:
            if category in settings.category_keywords:
                keywords = settings.category_keywords[category]
                if any(kw.lower() in text for kw in keywords):
                    return True
        
        return False
    
    def parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse various date formats commonly used in SA tenders."""
        if not date_str:
            return None
        
        date_str = date_str.strip()
        
        # Common formats
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
            "%d %B %Y",
            "%d %b %Y",
            "%B %d, %Y",
            "%d-%b-%Y",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%SZ",
            "%d %B %Y %H:%M",
            "%d/%m/%Y %H:%M",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # Try to extract date using regex
        patterns = [
            r"(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})",  # DD/MM/YYYY or DD-MM-YYYY
            r"(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})",  # YYYY/MM/DD or YYYY-MM-DD
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                groups = match.groups()
                try:
                    if len(groups[0]) == 4:  # Year first
                        return datetime(int(groups[0]), int(groups[1]), int(groups[2]))
                    else:  # Day first
                        return datetime(int(groups[2]), int(groups[1]), int(groups[0]))
                except ValueError:
                    continue
        
        logger.debug("Could not parse date", date_str=date_str)
        return None
    
    def parse_value(self, value_str: str) -> Optional[float]:
        """Parse monetary value from string."""
        if not value_str:
            return None
        
        # Remove currency symbols and whitespace
        cleaned = re.sub(r"[R$,\s]", "", value_str)
        
        # Handle millions/billions abbreviations
        if "m" in cleaned.lower():
            cleaned = re.sub(r"[mM].*", "", cleaned)
            try:
                return float(cleaned) * 1_000_000
            except ValueError:
                pass
        
        if "b" in cleaned.lower():
            cleaned = re.sub(r"[bB].*", "", cleaned)
            try:
                return float(cleaned) * 1_000_000_000
            except ValueError:
                pass
        
        try:
            return float(cleaned)
        except ValueError:
            return None
    
    def absolute_url(self, relative_url: str) -> str:
        """Convert relative URL to absolute."""
        return urljoin(self.base_url, relative_url)
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        if not text:
            return ""
        # Remove extra whitespace
        text = " ".join(text.split())
        # Remove special characters that might cause issues
        text = text.replace("\xa0", " ").replace("\u200b", "")
        return text.strip()
    
    def extract_reference(self, text: str) -> Optional[str]:
        """Extract tender reference number from text."""
        patterns = [
            r"(?:ref(?:erence)?\.?\s*(?:no\.?|number)?:?\s*)([A-Z0-9\-/]+)",
            r"(?:tender\s*(?:no\.?|number)?:?\s*)([A-Z0-9\-/]+)",
            r"(?:bid\s*(?:no\.?|number)?:?\s*)([A-Z0-9\-/]+)",
            r"(?:RFQ\s*(?:no\.?|number)?:?\s*)([A-Z0-9\-/]+)",
            r"(?:RFP\s*(?:no\.?|number)?:?\s*)([A-Z0-9\-/]+)",
            r"\b([A-Z]{2,5}[\-/]\d{4}[\-/]\d{2,6})\b",  # Common format like GT-2024-0001
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).upper()
        
        return None
