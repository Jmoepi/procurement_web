"""Priority ranking logic for tenders."""
from datetime import datetime
from typing import Optional

import structlog

from .config import settings
from .models import CrawledTender, TenderPriority

logger = structlog.get_logger()


class TenderRanker:
    """Rank tenders by priority based on various factors."""
    
    def __init__(self):
        self.high_priority_keywords = settings.high_priority_keywords
    
    def calculate_score(self, tender: CrawledTender) -> int:
        """Calculate a priority score for a tender (higher = more important)."""
        score = 50  # Base score
        
        # Factor 1: Closing date urgency
        if tender.closing_date:
            days_remaining = (tender.closing_date - datetime.now()).days
            if days_remaining <= 3:
                score += 40
            elif days_remaining <= 7:
                score += 30
            elif days_remaining <= 14:
                score += 20
            elif days_remaining <= 30:
                score += 10
        
        # Factor 2: Estimated value
        if tender.estimated_value:
            if tender.estimated_value >= 10_000_000:  # R10M+
                score += 30
            elif tender.estimated_value >= 1_000_000:  # R1M+
                score += 20
            elif tender.estimated_value >= 100_000:  # R100K+
                score += 10
        
        # Factor 3: Keywords in title/description
        text = f"{tender.title} {tender.description or ''}".lower()
        for keyword in self.high_priority_keywords:
            if keyword.lower() in text:
                score += 15
                break  # Only count once
        
        # Factor 4: Multi-year or framework contracts
        if any(term in text for term in ["3 year", "three year", "multi-year", "framework"]):
            score += 25
        
        # Factor 5: National scope
        if any(term in text for term in ["national", "nationwide", "all provinces"]):
            score += 15
        
        # Factor 6: Category relevance (courier/printing are high value)
        if tender.category.value in ["courier", "printing"]:
            score += 10
        
        return score
    
    def assign_priority(self, tender: CrawledTender) -> TenderPriority:
        """Assign priority based on calculated score."""
        score = self.calculate_score(tender)
        
        if score >= 90:
            return TenderPriority.URGENT
        elif score >= 70:
            return TenderPriority.HIGH
        elif score >= 50:
            return TenderPriority.MEDIUM
        else:
            return TenderPriority.LOW
    
    def rank_tenders(self, tenders: list[CrawledTender]) -> list[CrawledTender]:
        """Sort tenders by priority score (descending)."""
        # Calculate and update priorities
        for tender in tenders:
            tender.priority = self.assign_priority(tender)
        
        # Sort by score
        return sorted(
            tenders,
            key=lambda t: self.calculate_score(t),
            reverse=True,
        )


def rank_tenders(tenders: list[CrawledTender]) -> list[CrawledTender]:
    """Convenience function to rank a list of tenders."""
    ranker = TenderRanker()
    return ranker.rank_tenders(tenders)
