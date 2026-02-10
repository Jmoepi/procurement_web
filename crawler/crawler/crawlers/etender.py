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
    API_URL = "https://www.etenders.gov.za/Home/PaginatedTenderOpportunities"
    
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
        """Crawl eTender portal for relevant tenders using the API."""
        tenders = []
        
        try:
            # Fetch all advertised tenders from the API
            all_tenders = await self._fetch_tenders_from_api()
            
            # Filter by relevance to our target categories
            for tender_data in all_tenders:
                tender = self._parse_api_tender(tender_data)
                if tender and self.is_relevant(tender.title, tender.description or ""):
                    tenders.append(tender)
            
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
                total_fetched=len(all_tenders),
                relevant_found=len(unique_tenders),
            )
            
            return unique_tenders
            
        except Exception as e:
            logger.error("eTender crawl failed", error=str(e))
            raise
    
    async def _fetch_tenders_from_api(self) -> list[dict]:
        """Fetch tenders from the eTenders API."""
        all_tenders = []
        start = 0
        page_size = 100  # Fetch 100 at a time
        max_pages = 10   # Safety limit
        
        for page in range(max_pages):
            try:
                params = {
                    'draw': page + 1,
                    'start': start,
                    'length': page_size,
                    'status': 1,  # 1 = advertised/published
                }
                
                # Add AJAX headers
                self.client.headers.update({
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': f'{self.PORTAL_URL}/Home/opportunities',
                })
                
                response = await self.client.get(self.API_URL, params=params)
                response.raise_for_status()
                
                data = response.json()
                records = data.get('data', [])
                
                if not records:
                    break
                
                all_tenders.extend(records)
                
                # Check if we've fetched all records
                total = data.get('recordsTotal', 0)
                if start + page_size >= total:
                    break
                
                start += page_size
                
                logger.debug(
                    "Fetched tender page",
                    page=page + 1,
                    records=len(records),
                    total=total,
                )
                
            except Exception as e:
                logger.warning("Failed to fetch tender page", page=page, error=str(e))
                break
        
        logger.info("Total tenders fetched from API", count=len(all_tenders))
        return all_tenders
    
    def _parse_api_tender(self, data: dict) -> Optional[CrawledTender]:
        """Parse a tender from API response."""
        try:
            title = data.get('description', '')
            if not title:
                return None
            
            reference = data.get('tender_No', '')
            issuer = data.get('organ_of_State', 'Government of South Africa')
            category_str = data.get('category', '')
            tender_type = data.get('type', '')
            
            # Parse dates
            closing_date = None
            closing_str = data.get('closing_Date')
            if closing_str:
                try:
                    closing_date = datetime.fromisoformat(closing_str.replace('Z', '+00:00'))
                except:
                    pass
            
            published_date = None
            published_str = data.get('date_Published')
            if published_str:
                try:
                    published_date = datetime.fromisoformat(published_str.replace('Z', '+00:00'))
                except:
                    pass
            
            # Build tender URL
            tender_id = data.get('id', '')
            source_url = f"{self.PORTAL_URL}/Home/TenderDetails/{tender_id}" if tender_id else self.PORTAL_URL
            
            # Location
            town = data.get('town', '')
            suburb = data.get('surburb', '')
            location = f"{suburb}, {town}".strip(', ') if suburb or town else None
            
            # Detect our category and priority
            category = self.detect_category(title, category_str)
            priority = self.detect_priority(title, category_str, closing_date)
            
            # Extract conditions/description
            description = data.get('conditions', '')
            
            return CrawledTender(
                title=title,
                description=description[:500] if description else None,
                reference_number=reference,
                issuer=issuer,
                source_url=source_url,
                closing_date=closing_date,
                published_date=published_date,
                category=category,
                priority=priority,
                location=location,
                source_id=self.source_id,
                source_name=self.source_name,
            )
            
        except Exception as e:
            logger.debug("Failed to parse API tender", error=str(e))
            return None


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
