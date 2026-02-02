"""Crawlers for State-Owned Enterprises (SOEs)."""
from typing import Optional
from datetime import datetime

import structlog
from bs4 import BeautifulSoup

from .base import BaseCrawler
from ..models import CrawledTender

logger = structlog.get_logger()


class GenericSOECrawler(BaseCrawler):
    """Generic crawler for SOE tender pages."""
    
    def __init__(
        self,
        source_id: str,
        source_name: str,
        base_url: str,
        issuer: str,
        categories: list[str] = None,
        tender_selector: str = "a[href*='tender'], a[href*='bid'], a[href*='rfq']",
    ):
        super().__init__(
            source_id=source_id,
            source_name=source_name,
            base_url=base_url,
            categories=categories or ["courier", "printing"],
        )
        self.issuer = issuer
        self.tender_selector = tender_selector
    
    async def crawl(self) -> list[CrawledTender]:
        """Crawl SOE website for tenders."""
        tenders = []
        
        try:
            html = await self.fetch_page(self.base_url)
            if not html:
                return tenders
            
            soup = BeautifulSoup(html, "lxml")
            
            # Use configurable selector
            tender_links = soup.select(self.tender_selector)
            
            for link in tender_links:
                title = self.clean_text(link.get_text())
                if not title or len(title) < 10:
                    continue
                
                if not self.is_relevant(title):
                    continue
                
                href = link.get("href", "")
                url = self.absolute_url(href)
                
                category = self.detect_category(title)
                priority = self.detect_priority(title)
                
                tender = CrawledTender(
                    title=title,
                    reference_number=self.extract_reference(title),
                    issuer=self.issuer,
                    source_url=url,
                    category=category,
                    priority=priority,
                    source_id=self.source_id,
                    source_name=self.source_name,
                )
                tenders.append(tender)
            
            logger.info(
                "SOE crawl complete",
                source=self.source_name,
                total_found=len(tenders),
            )
            
        except Exception as e:
            logger.error("SOE crawl failed", source=self.source_name, error=str(e))
            raise
        
        return tenders


class TransnetCrawler(GenericSOECrawler):
    """Crawler for Transnet tenders."""
    
    def __init__(self, source_id: str, categories: list[str] = None):
        super().__init__(
            source_id=source_id,
            source_name="Transnet",
            base_url="https://www.transnet.net/TenderProcess/Pages/CurrentAdvertisedTenders.aspx",
            issuer="Transnet SOC Ltd",
            categories=categories,
        )


class EskomCrawler(GenericSOECrawler):
    """Crawler for Eskom tenders."""
    
    def __init__(self, source_id: str, categories: list[str] = None):
        super().__init__(
            source_id=source_id,
            source_name="Eskom",
            base_url="https://www.eskom.co.za/eskom-tenders/",
            issuer="Eskom Holdings SOC Ltd",
            categories=categories,
        )


class SAAPostOfficeCrawler(GenericSOECrawler):
    """Crawler for SA Post Office tenders."""
    
    def __init__(self, source_id: str, categories: list[str] = None):
        super().__init__(
            source_id=source_id,
            source_name="SA Post Office",
            base_url="https://www.postoffice.co.za/tenders",
            issuer="South African Post Office SOC Ltd",
            categories=categories,
        )


class PrAsACrawler(GenericSOECrawler):
    """Crawler for PRASA (Passenger Rail Agency) tenders."""
    
    def __init__(self, source_id: str, categories: list[str] = None):
        super().__init__(
            source_id=source_id,
            source_name="PRASA",
            base_url="https://www.prasa.com/Tenders.html",
            issuer="Passenger Rail Agency of South Africa",
            categories=categories,
        )


class SANRALCrawler(GenericSOECrawler):
    """Crawler for SANRAL (roads agency) tenders."""
    
    def __init__(self, source_id: str, categories: list[str] = None):
        super().__init__(
            source_id=source_id,
            source_name="SANRAL",
            base_url="https://www.nra.co.za/live/content.php?Category_ID=130",
            issuer="South African National Roads Agency Limited",
            categories=categories,
        )
