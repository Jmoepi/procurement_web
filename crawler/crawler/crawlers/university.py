"""Crawlers for South African universities."""
from typing import Optional
from datetime import datetime

import structlog
from bs4 import BeautifulSoup

from .base import BaseCrawler
from ..models import CrawledTender

logger = structlog.get_logger()


class UniversityCrawler(BaseCrawler):
    """Generic crawler for university tender pages."""
    
    def __init__(
        self,
        source_id: str,
        source_name: str,
        base_url: str,
        university_name: str,
        categories: list[str] = None,
    ):
        super().__init__(
            source_id=source_id,
            source_name=source_name,
            base_url=base_url,
            categories=categories or ["courier", "printing"],
        )
        self.university_name = university_name
    
    async def crawl(self) -> list[CrawledTender]:
        """Crawl university website for tenders."""
        tenders = []
        
        try:
            html = await self.fetch_page(self.base_url)
            if not html:
                return tenders
            
            soup = BeautifulSoup(html, "lxml")
            
            # Look for tender listings - various selectors for different uni sites
            selectors = [
                "a[href*='tender']",
                "a[href*='bid']",
                "a[href*='rfq']",
                "a[href*='quotation']",
                ".tender-item a",
                ".bid-item a",
                "table tr td a",
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
                        issuer=self.university_name,
                        source_url=url,
                        category=category,
                        priority=priority,
                        source_id=self.source_id,
                        source_name=self.source_name,
                    )
                    tenders.append(tender)
            
            logger.info(
                "University crawl complete",
                source=self.source_name,
                total_found=len(tenders),
            )
            
        except Exception as e:
            logger.error(
                "University crawl failed",
                source=self.source_name,
                error=str(e),
            )
            raise
        
        return tenders


# Pre-configured university crawlers
UNIVERSITY_CONFIGS = [
    {
        "name": "UCT",
        "full_name": "University of Cape Town",
        "url": "https://www.uct.ac.za/main/explore-uct/procurement/tenders",
    },
    {
        "name": "UP",
        "full_name": "University of Pretoria",
        "url": "https://www.up.ac.za/procurement-and-tenders",
    },
    {
        "name": "Wits",
        "full_name": "University of the Witwatersrand",
        "url": "https://www.wits.ac.za/finance/procurement/tenders/",
    },
    {
        "name": "Stellenbosch",
        "full_name": "Stellenbosch University",
        "url": "https://www.sun.ac.za/english/finance/procurement/tender-bulletin",
    },
    {
        "name": "UKZN",
        "full_name": "University of KwaZulu-Natal",
        "url": "https://scm.ukzn.ac.za/tenders/",
    },
    {
        "name": "UJ",
        "full_name": "University of Johannesburg",
        "url": "https://www.uj.ac.za/about/finance/scm/tenders/",
    },
    {
        "name": "NWU",
        "full_name": "North-West University",
        "url": "https://www.nwu.ac.za/tenders",
    },
    {
        "name": "UFS",
        "full_name": "University of the Free State",
        "url": "https://www.ufs.ac.za/procurement/tenders",
    },
    {
        "name": "Rhodes",
        "full_name": "Rhodes University",
        "url": "https://www.ru.ac.za/finance/procurement/tenders/",
    },
    {
        "name": "UNISA",
        "full_name": "University of South Africa",
        "url": "https://www.unisa.ac.za/sites/corporate/default/Procurement/Tenders",
    },
]


def create_university_crawler(
    source_id: str,
    university_key: str,
    categories: list[str] = None,
) -> Optional[UniversityCrawler]:
    """Factory function to create a university crawler by key."""
    for config in UNIVERSITY_CONFIGS:
        if config["name"].lower() == university_key.lower():
            return UniversityCrawler(
                source_id=source_id,
                source_name=f"{config['name']} Tenders",
                base_url=config["url"],
                university_name=config["full_name"],
                categories=categories,
            )
    return None
