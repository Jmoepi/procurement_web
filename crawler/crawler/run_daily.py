"""Main daily crawler orchestrator."""
import asyncio
import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

from .config import settings
from .database import db
from .dedup import deduplicate_tenders
from .ranker import rank_tenders
from .models import CrawledTender, CrawlResult
from .crawlers.etender import ETenderCrawler, ProvincialTreasuryCrawler
from .crawlers.soe import (
    TransnetCrawler,
    EskomCrawler,
    SAAPostOfficeCrawler,
    PrAsACrawler,
    SANRALCrawler,
    GenericSOECrawler,
)
from .crawlers.university import UniversityCrawler, UNIVERSITY_CONFIGS
from .crawlers.metro import MetroCrawler, METRO_CONFIGS


def setup_logging(verbose: bool = False) -> None:
    """Configure structured logging with file and console output."""
    # Create logs directory
    logs_dir = Path(__file__).parent.parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    # Log filename with timestamp
    log_file = logs_dir / f"crawler_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    # Set up standard logging handlers
    log_level = logging.DEBUG if verbose else logging.INFO
    
    # Console handler (with colors)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # File handler (JSON format for processing)
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)  # Always capture everything to file
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Configure structlog
    # Shared processors for both handlers
    shared_processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Set formatters for handlers
    console_formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.dev.ConsoleRenderer(colors=True),
        foreign_pre_chain=shared_processors,
    )
    file_formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
        foreign_pre_chain=shared_processors,
    )
    
    console_handler.setFormatter(console_formatter)
    file_handler.setFormatter(file_formatter)
    
    structlog.get_logger().info("Logging initialized", log_file=str(log_file))

logger = structlog.get_logger()


async def queue_tenant_digest(tenant_id: str, tender_ids: list[str]) -> Optional[str]:
    """Queue a pending digest job for the tenant."""
    subscribers = await db.get_tenant_subscribers(tenant_id)

    if not subscribers:
        logger.info("No subscribers for tenant", tenant_id=tenant_id)
        return None

    if not tender_ids:
        logger.info("No tender IDs available to queue digest", tenant_id=tenant_id)
        return None

    digest_id = await db.create_pending_digest_run(
        tenant_id=tenant_id,
        tenders_found=len(tender_ids),
        recipient_count=len(subscribers),
        metadata={
            "triggered_by": "crawler",
            "triggered_at": datetime.utcnow().isoformat(),
            "tender_ids": tender_ids,
            "tenders_included": len(tender_ids),
            "subscriber_count": len(subscribers),
        },
    )

    if digest_id:
        logger.info(
            "Queued digest run",
            tenant_id=tenant_id,
            digest_id=digest_id,
            tenders=len(tender_ids),
            subscribers=len(subscribers),
        )

    return digest_id


async def create_crawler_for_source(source: dict) -> Optional[object]:
    """Create appropriate crawler based on source type and URL."""
    source_id = source["id"]
    source_name = source["name"]
    source_url = source["url"]
    source_type = source.get("type") or source.get("source_type") or "other"
    categories = source.get("categories", ["courier", "printing"])
    
    # Match by source type or URL patterns
    url_lower = source_url.lower()
    
    if "etenders.gov.za" in url_lower or source_type == "government":
        return ETenderCrawler(source_id, source_name, categories)
    
    # Provincial treasuries
    if "treasury" in url_lower or source_type == "treasury":
        province = None
        for p in ["gauteng", "western_cape", "kwazulu_natal", "eastern_cape", 
                  "free_state", "mpumalanga", "limpopo", "north_west", "northern_cape"]:
            if p.replace("_", "") in url_lower or p.replace("_", "-") in url_lower:
                province = p
                break
        
        if province:
            return ProvincialTreasuryCrawler(
                source_id, source_name, province, source_url, categories
            )
    
    # SOEs
    if "transnet" in url_lower:
        return TransnetCrawler(source_id, categories)
    if "eskom" in url_lower:
        return EskomCrawler(source_id, categories)
    if "postoffice" in url_lower:
        return SAAPostOfficeCrawler(source_id, categories)
    if "prasa" in url_lower:
        return PrAsACrawler(source_id, categories)
    if "sanral" in url_lower or "nra.co.za" in url_lower:
        return SANRALCrawler(source_id, categories)
    
    # Universities
    for uni in UNIVERSITY_CONFIGS:
        if uni["name"].lower() in source_name.lower() or uni["url"] in source_url:
            return UniversityCrawler(
                source_id, source_name, uni["url"], uni["full_name"], categories
            )
    
    # Metros
    for metro in METRO_CONFIGS:
        if metro["short_name"] in url_lower or metro["name"].lower() in source_name.lower():
            return MetroCrawler(
                source_id, source_name, metro["url"], metro["name"], categories
            )
    
    # Default: generic SOE crawler
    return GenericSOECrawler(
        source_id, source_name, source_url, source_name, categories
    )


async def crawl_source(source: dict) -> tuple[list[CrawledTender], CrawlResult]:
    """Crawl a single source and return results."""
    start_time = datetime.now()
    tenders = []
    
    try:
        crawler = await create_crawler_for_source(source)
        if not crawler:
            return [], CrawlResult(
                source_id=source["id"],
                source_name=source["name"],
                source_url=source["url"],
                success=False,
                error_message="No suitable crawler found",
                duration_seconds=(datetime.now() - start_time).total_seconds(),
            )
        
        async with crawler:
            tenders = await crawler.crawl()
        
        return tenders, CrawlResult(
            source_id=source["id"],
            source_name=source["name"],
            source_url=source["url"],
            success=True,
            tenders_found=len(tenders),
            duration_seconds=(datetime.now() - start_time).total_seconds(),
        )
        
    except Exception as e:
        logger.error("Source crawl failed", source=source["name"], error=str(e))
        return [], CrawlResult(
            source_id=source["id"],
            source_name=source["name"],
            source_url=source["url"],
            success=False,
            error_message=str(e),
            duration_seconds=(datetime.now() - start_time).total_seconds(),
        )


async def process_tenant(tenant_id: str, dry_run: bool = False) -> dict:
    """Process crawling and digest for a single tenant."""
    logger.info("Processing tenant", tenant_id=tenant_id)
    
    # Get tenant sources
    sources = await db.get_tenant_sources(tenant_id)
    logger.info("Found sources", count=len(sources))
    
    if not sources:
        return {"tenant_id": tenant_id, "status": "no_sources"}
    
    # Crawl all sources (with concurrency limit)
    all_tenders: list[CrawledTender] = []
    results: list[CrawlResult] = []
    
    semaphore = asyncio.Semaphore(settings.max_concurrent_requests)
    
    async def crawl_with_semaphore(source: dict):
        async with semaphore:
            return await crawl_source(source)
    
    # Run crawlers concurrently
    tasks = [crawl_with_semaphore(source) for source in sources]
    crawl_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in crawl_results:
        if isinstance(result, Exception):
            logger.error("Crawler exception", error=str(result))
            continue
        
        tenders, crawl_result = result
        all_tenders.extend(tenders)
        results.append(crawl_result)
        
        # Update source stats
        if not dry_run:
            await db.update_source_crawl_stats(
                crawl_result.source_id,
                crawl_result.success,
                crawl_result.tenders_found,
            )
    
    logger.info(
        "Crawling complete",
        total_tenders=len(all_tenders),
        successful_sources=sum(1 for r in results if r.success),
    )
    
    # Deduplicate
    unique_tenders = deduplicate_tenders(all_tenders)
    logger.info("After deduplication", count=len(unique_tenders))
    
    # Rank by priority
    ranked_tenders = rank_tenders(unique_tenders)
    
    # Save new tenders to database
    new_tenders: list[CrawledTender] = []
    new_tender_ids: list[str] = []
    for tender in ranked_tenders:
        if dry_run:
            new_tenders.append(tender)
            continue
        
        # Check if already exists
        exists = await db.check_tender_exists(
            tenant_id,
            tender.reference_number,
            tender.title,
            str(tender.source_url),
        )
        
        if not exists:
            tender_id = await db.insert_tender(tenant_id, tender)
            if tender_id:
                new_tenders.append(tender)
                new_tender_ids.append(tender_id)
    
    logger.info("New tenders saved", count=len(new_tenders))
    
    if not new_tenders:
        return {
            "tenant_id": tenant_id,
            "status": "no_new_tenders",
            "crawl_results": results,
        }
    
    digest_id = None
    if not dry_run:
        digest_id = await queue_tenant_digest(tenant_id, new_tender_ids)
    
    return {
        "tenant_id": tenant_id,
        "status": "success",
        "new_tenders": len(new_tenders),
        "digest_id": digest_id,
        "crawl_results": results,
    }


async def run_daily_crawl(tenant_id: Optional[str] = None, dry_run: bool = False):
    """Run the daily crawl for all tenants or a specific tenant."""
    logger.info(
        "Starting daily crawl",
        tenant_id=tenant_id or "all",
        dry_run=dry_run,
    )
    
    start_time = datetime.now()
    
    if tenant_id:
        # Process single tenant
        result = await process_tenant(tenant_id, dry_run)
        results = [result]
    else:
        # Process all active tenants
        tenants = await db.get_active_tenants()
        logger.info("Found active tenants", count=len(tenants))
        
        results = []
        for tenant in tenants:
            result = await process_tenant(tenant["id"], dry_run)
            results.append(result)
    
    duration = (datetime.now() - start_time).total_seconds()
    
    # Summary
    successful = sum(1 for r in results if r.get("status") == "success")
    total_new = sum(r.get("new_tenders", 0) for r in results)
    
    logger.info(
        "Daily crawl complete",
        duration_seconds=round(duration, 2),
        tenants_processed=len(results),
        successful=successful,
        total_new_tenders=total_new,
    )
    
    # Optional: still warn loudly if no sources so you notice in logs
    if all(r.get("status") == "no_sources" for r in results):
        logger.warning("No sources configured for any tenant. Nothing crawled.")

    return results


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Procurement Radar SA - Daily Tender Crawler"
    )
    parser.add_argument(
        "--tenant-id",
        type=str,
        help="Process only this tenant ID",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't save to database or queue digest jobs",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )
    
    args = parser.parse_args()
    
    # Initialize logging first
    setup_logging(args.verbose)
    
    # Validate settings
    if not settings.supabase_url or not settings.supabase_service_role_key:
        logger.error("Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)
    
    # Run
    results = asyncio.run(
        run_daily_crawl(args.tenant_id, args.dry_run)
    )
    
    # Exit with error only if there were real crawl attempts and all failed
    ok_statuses = {"success", "no_new_tenders", "no_sources"}

    if all(r.get("status") not in ok_statuses for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
