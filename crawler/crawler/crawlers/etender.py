"""eTender Portal crawler - the main SA government tender portal."""
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

import structlog
from bs4 import BeautifulSoup

from .base import BaseCrawler
from ..models import CrawledTender, TenderCategory

logger = structlog.get_logger()


class ETenderCrawler(BaseCrawler):
    """Crawler for the eTender Portal (etenders.gov.za)."""
    
    PORTAL_URL = "https://www.etenders.gov.za"
    
    def __init__(
        self,
        source_id: str,
        source_name: str = "eTender Portal",
        categories: list[str] = None,
    ):
        super().__init__(
            source_id=source_id,
            source_name=source_name,
            base_url=self.PORTAL_URL,
            categories=categories or ["courier", "printing"],
        )
    
    async def crawl(self) -> list[CrawledTender]:
        """Crawl eTender portal for relevant tenders."""
        tenders = []
        
        try:
            # Search for each target keyword
            search_terms = []
            for cat in self.categories:
                if cat in ["courier", "printing", "logistics", "stationery"]:
                    search_terms.append(cat)
            
            for term in search_terms:
                page_tenders = await self._search_tenders(term)
                tenders.extend(page_tenders)
            
            # Deduplicate by reference number
            seen = set()
            unique_tenders = []
            for t in tenders:
                key = t.reference_number or t.title
                if key not in seen:
                    seen.add(key)
                    unique_tenders.append(t)
            
            logger.info(
                "eTender crawl complete",
                source=self.source_name,
                total_found=len(unique_tenders),
            )
            
            return unique_tenders
            
        except Exception as e:
            logger.error("eTender crawl failed", error=str(e))
            raise
    
    async def _search_tenders(self, search_term: str) -> list[CrawledTender]:
        """Search for tenders matching a term."""
        tenders = []
        
        # eTender uses a complex ASP.NET form, simplified approach
        search_url = f"{self.PORTAL_URL}/Home/opportunities"
        
        try:
            html = await self.fetch_page(search_url)
            if not html:
                return tenders
            
            soup = BeautifulSoup(html, "lxml")
            
            # Find tender listings
            tender_rows = soup.select("table.table tbody tr")
            
            for row in tender_rows:
                try:
                    tender = self._parse_tender_row(row, search_term)
                    if tender and self.is_relevant(tender.title, tender.description or ""):
                        tenders.append(tender)
                except Exception as e:
                    logger.debug("Failed to parse tender row", error=str(e))
                    continue
            
        except Exception as e:
            logger.warning("Search failed", search_term=search_term, error=str(e))
        
        return tenders
    
    def _parse_tender_row(self, row, search_term: str) -> Optional[CrawledTender]:
        """Parse a tender from a table row."""
        cells = row.select("td")
        if len(cells) < 4:
            return None
        
        # Extract data from cells
        title_cell = cells[1]
        title_link = title_cell.select_one("a")
        
        if not title_link:
            return None
        
        title = self.clean_text(title_link.get_text())
        detail_url = self.absolute_url(title_link.get("href", ""))
        
        # Check if relevant
        if search_term.lower() not in title.lower():
            return None
        
        # Extract other fields
        reference = self.clean_text(cells[0].get_text()) if len(cells) > 0 else None
        issuer = self.clean_text(cells[2].get_text()) if len(cells) > 2 else "Government of South Africa"
        closing_str = self.clean_text(cells[3].get_text()) if len(cells) > 3 else None
        
        closing_date = self.parse_date(closing_str) if closing_str else None
        
        # Detect category and priority
        category = self.detect_category(title)
        priority = self.detect_priority(title, "", closing_date)
        
        return CrawledTender(
            title=title,
            reference_number=reference or self.extract_reference(title),
            issuer=issuer,
            source_url=detail_url,
            closing_date=closing_date,
            category=category,
            priority=priority,
            source_id=self.source_id,
            source_name=self.source_name,
        )


class ProvincialTreasuryCrawler(BaseCrawler):
    """Crawler for provincial treasury portals."""
    
    PROVINCIAL_URLS = {
        "gauteng": "https://www.treasury.gpg.gov.za/Pages/SupplyChainManagement.aspx",
        "western_cape": "https://www.westerncape.gov.za/tenders",
        "kwazulu_natal": "https://www.kzntreasury.gov.za/index.php/tenders",
        "eastern_cape": "https://ectreasury.gov.za/tenders/",
        "free_state": "https://provincialgovernment.co.za/units/view/104/free-state/treasury",
        "mpumalanga": "https://www.mpumalanga.gov.za/departments/treasury/tenders",
        "limpopo": "https://www.treasury.limpopo.gov.za",
        "north_west": "https://www.nwpg.gov.za/treasury",
        "northern_cape": "https://www.northern-cape.gov.za/treasury",
    }
    
    def __init__(
        self,
        source_id: str,
        source_name: str,
        province: str,
        base_url: str,
        categories: list[str] = None,
    ):
        super().__init__(
            source_id=source_id,
            source_name=source_name,
            base_url=base_url,
            categories=categories or ["courier", "printing"],
        )
        self.province = province
    
    async def crawl(self) -> list[CrawledTender]:
        """Crawl provincial treasury for tenders."""
        tenders = []
        
        try:
            html = await self.fetch_page(self.base_url)
            if not html:
                return tenders
            
            soup = BeautifulSoup(html, "lxml")
            
            # Generic approach - look for tender links
            tender_links = soup.select("a[href*='tender'], a[href*='bid'], a[href*='rfq']")
            
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
                    issuer=f"{self.province.replace('_', ' ').title()} Provincial Treasury",
                    source_url=url,
                    category=category,
                    priority=priority,
                    location=self.province.replace("_", " ").title(),
                    source_id=self.source_id,
                    source_name=self.source_name,
                )
                tenders.append(tender)
            
            logger.info(
                "Provincial treasury crawl complete",
                province=self.province,
                total_found=len(tenders),
            )
            
        except Exception as e:
            logger.error(
                "Provincial treasury crawl failed",
                province=self.province,
                error=str(e),
            )
            raise
        
        return tenders
