"""Crawlers for South African metropolitan municipalities."""
from typing import Optional
from datetime import datetime

import structlog
from bs4 import BeautifulSoup

from .base import BaseCrawler
from ..models import CrawledTender

logger = structlog.get_logger()


class MetroCrawler(BaseCrawler):
    """Generic crawler for metropolitan municipality tender pages."""
    
    def __init__(
        self,
        source_id: str,
        source_name: str,
        base_url: str,
        metro_name: str,
        categories: list[str] = None,
    ):
        super().__init__(
            source_id=source_id,
            source_name=source_name,
            base_url=base_url,
            categories=categories or ["courier", "printing"],
        )
        self.metro_name = metro_name
    
    async def crawl(self) -> list[CrawledTender]:
        """Crawl metro website for tenders."""
        tenders = []
        
        try:
            html = await self.fetch_page(self.base_url)
            if not html:
                return tenders
            
            soup = BeautifulSoup(html, "lxml")
            
            # Look for tender listings
            selectors = [
                "a[href*='tender']",
                "a[href*='bid']",
                "a[href*='rfq']",
                ".tender a",
                ".bid a",
                "table.tenders tr td a",
            ]
            
            seen_urls = set()
            
            for selector in selectors:
                links = soup.select(selector)
                
                for link in links:
                    title = self.clean_text(link.get_text())
                    if not title or len(title) < 10:
                        continue
                    
                    href = link.get("href", "")
                    url = self.absolute_url(href)
                    
                    if url in seen_urls:
                        continue
                    seen_urls.add(url)
                    
                    if not self.is_relevant(title):
                        continue
                    
                    category = self.detect_category(title)
                    priority = self.detect_priority(title)
                    
                    tender = CrawledTender(
                        title=title,
                        reference_number=self.extract_reference(title),
                        issuer=self.metro_name,
                        source_url=url,
                        category=category,
                        priority=priority,
                        location=self.metro_name,
                        source_id=self.source_id,
                        source_name=self.source_name,
                    )
                    tenders.append(tender)
            
            logger.info(
                "Metro crawl complete",
                source=self.source_name,
                total_found=len(tenders),
            )
            
        except Exception as e:
            logger.error("Metro crawl failed", source=self.source_name, error=str(e))
            raise
        
        return tenders


# Pre-configured metro crawlers
METRO_CONFIGS = [
    {
        "name": "City of Johannesburg",
        "short_name": "joburg",
        "url": "https://www.joburg.org.za/work/Pages/Tenders/Tenders.aspx",
    },
    {
        "name": "City of Cape Town",
        "short_name": "capetown",
        "url": "https://www.capetown.gov.za/work%20and%20business/Tenders-and-supplier-management/Tenders",
    },
    {
        "name": "eThekwini Municipality (Durban)",
        "short_name": "ethekwini",
        "url": "https://www.durban.gov.za/City_Services/BSU/Pages/Tenders.aspx",
    },
    {
        "name": "City of Tshwane (Pretoria)",
        "short_name": "tshwane",
        "url": "https://www.tshwane.gov.za/sites/business/Tenders/Pages/default.aspx",
    },
    {
        "name": "Ekurhuleni Municipality",
        "short_name": "ekurhuleni",
        "url": "https://www.ekurhuleni.gov.za/tenders-and-quotations/",
    },
    {
        "name": "Nelson Mandela Bay Municipality",
        "short_name": "nmbm",
        "url": "https://www.nelsonmandelabay.gov.za/page/tenders",
    },
    {
        "name": "Buffalo City Municipality",
        "short_name": "buffalocity",
        "url": "https://www.buffalocity.gov.za/tenders.php",
    },
    {
        "name": "Mangaung Municipality",
        "short_name": "mangaung",
        "url": "https://www.mangaung.co.za/tenders/",
    },
]


def create_metro_crawler(
    source_id: str,
    metro_key: str,
    categories: list[str] = None,
) -> Optional[MetroCrawler]:
    """Factory function to create a metro crawler by key."""
    for config in METRO_CONFIGS:
        if config["short_name"].lower() == metro_key.lower():
            return MetroCrawler(
                source_id=source_id,
                source_name=f"{config['name']} Tenders",
                base_url=config["url"],
                metro_name=config["name"],
                categories=categories,
            )
    return None
