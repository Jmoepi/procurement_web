"""Deduplication logic using fuzzy string matching."""
from typing import Optional

import structlog
from fuzzywuzzy import fuzz

from .config import settings
from .models import CrawledTender

logger = structlog.get_logger()


class TenderDeduplicator:
    """Deduplicate tenders using various matching strategies."""
    
    def __init__(self, threshold: int = None):
        self.threshold = threshold or settings.dedup_threshold
        self.seen_references: set[str] = set()
        self.seen_urls: set[str] = set()
        self.seen_titles: list[str] = []
    
    def reset(self):
        """Reset deduplication state."""
        self.seen_references.clear()
        self.seen_urls.clear()
        self.seen_titles.clear()
    
    def is_duplicate(self, tender: CrawledTender) -> bool:
        """Check if a tender is a duplicate of previously seen tenders."""
        # Check exact reference number match
        if tender.reference_number:
            ref_key = tender.reference_number.upper().strip()
            if ref_key in self.seen_references:
                logger.debug("Duplicate by reference", reference=ref_key)
                return True
        
        # Check exact URL match
        url_key = str(tender.source_url).lower().strip()
        if url_key in self.seen_urls:
            logger.debug("Duplicate by URL", url=url_key)
            return True
        
        # Check fuzzy title match
        title_normalized = self._normalize_title(tender.title)
        for seen_title in self.seen_titles:
            similarity = fuzz.ratio(title_normalized, seen_title)
            if similarity >= self.threshold:
                logger.debug(
                    "Duplicate by title similarity",
                    title=tender.title[:50],
                    similarity=similarity,
                )
                return True
        
        return False
    
    def add(self, tender: CrawledTender):
        """Add a tender to the deduplication index."""
        if tender.reference_number:
            self.seen_references.add(tender.reference_number.upper().strip())
        
        self.seen_urls.add(str(tender.source_url).lower().strip())
        self.seen_titles.append(self._normalize_title(tender.title))
    
    def _normalize_title(self, title: str) -> str:
        """Normalize title for comparison."""
        # Convert to lowercase
        normalized = title.lower()
        
        # Remove common prefixes
        prefixes_to_remove = [
            "tender:", "bid:", "rfq:", "rfp:", "request for",
            "invitation to", "notice:", "advert:",
        ]
        for prefix in prefixes_to_remove:
            if normalized.startswith(prefix):
                normalized = normalized[len(prefix):]
        
        # Remove extra whitespace
        normalized = " ".join(normalized.split())
        
        return normalized.strip()


def deduplicate_tenders(tenders: list[CrawledTender]) -> list[CrawledTender]:
    """Remove duplicate tenders from a list."""
    dedup = TenderDeduplicator()
    unique_tenders = []
    
    for tender in tenders:
        if not dedup.is_duplicate(tender):
            dedup.add(tender)
            unique_tenders.append(tender)
    
    removed_count = len(tenders) - len(unique_tenders)
    if removed_count > 0:
        logger.info(
            "Deduplication complete",
            original_count=len(tenders),
            unique_count=len(unique_tenders),
            removed_count=removed_count,
        )
    
    return unique_tenders
