"""Email sender using Resend API."""
from __future__ import annotations

import os
from datetime import datetime

import resend
import structlog

from .config import settings
from .models import CrawledTender, DigestData

logger = structlog.get_logger()


def _get_resend_api_key() -> str:
    # Prefer settings, fall back to env
    key = getattr(settings, "resend_api_key", None) or os.getenv("RESEND_API_KEY")
    if not key:
        raise RuntimeError("Missing RESEND_API_KEY (set in settings or environment)")
    return key


def _get_from_email() -> str:
    """
    Support both names:
    - RESEND_FROM_EMAIL (recommended)
    - EMAIL_FROM (legacy/backward compatible)
    """
    val = (
        getattr(settings, "resend_from_email", None)
        or getattr(settings, "email_from", None)
        or os.getenv("RESEND_FROM_EMAIL")
        or os.getenv("EMAIL_FROM")
    )
    if not val:
        raise RuntimeError(
            "Missing sender email. Set RESEND_FROM_EMAIL (recommended) or EMAIL_FROM."
        )
    return val


class EmailSender:
    """Send digest emails using Resend."""

    def __init__(self):
        resend.api_key = _get_resend_api_key()
        self.from_email = _get_from_email()

    async def send_digest(self, digest: DigestData) -> bool:
        """Send a digest email to a subscriber."""
        try:
            html_content = self._generate_html(digest)

            response = resend.Emails.send(
                {
                    "from": self.from_email,
                    "to": [digest.subscriber_email],
                    "subject": f"🇿🇦 Procurement Radar: {len(digest.tenders)} New Tenders - {datetime.now().strftime('%d %b %Y')}",
                    "html": html_content,
                }
            )

            logger.info(
                "Digest email sent",
                to=digest.subscriber_email,
                tender_count=len(digest.tenders),
                email_id=(response or {}).get("id"),
            )
            return True

        except Exception as e:
            logger.error(
                "Failed to send digest email",
                to=digest.subscriber_email,
                error=str(e),
            )
            return False

    def _generate_html(self, digest: DigestData) -> str:
        """Generate HTML email content."""
        today = datetime.now().strftime("%A, %d %B %Y")
        unsubscribe_url = (
            f"{settings.app_base_url}/unsubscribe?token={digest.unsubscribe_token}"
            if digest.unsubscribe_token
            else f"{settings.app_base_url}/unsubscribe"
        )

        # Group tenders by priority
        urgent = [t for t in digest.tenders if t.priority.value == "urgent"]
        high = [t for t in digest.tenders if t.priority.value == "high"]
        other = [
            t for t in digest.tenders if t.priority.value not in ["urgent", "high"]
        ]

        # Generate tender sections
        urgent_html = self._generate_tender_section(
            urgent, "🔥 Urgent Opportunities", "#dc2626"
        )
        high_html = self._generate_tender_section(high, "⚡ High Priority", "#ea580c")
        other_html = self._generate_tender_section(other, "📋 Other Tenders", "#16a34a")

        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Procurement Radar SA - Daily Digest</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #16a34a; padding: 30px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🇿🇦 Procurement Radar SA</h1>
                            <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Daily Tender Digest</p>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 15px; font-size: 18px; color: #111827;">
                                Good morning{f', {digest.subscriber_name}' if digest.subscriber_name else ''}!
                            </p>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                Here's your daily tender digest for <strong>{today}</strong>.
                                We found <strong style="color: #16a34a;">{len(digest.tenders)} new opportunities</strong> matching your criteria.
                            </p>
                        </td>
                    </tr>

                    <!-- Summary Stats -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="33%" style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #16a34a;">{len(digest.tenders)}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">New Tenders</p>
                                    </td>
                                    <td width="5%"></td>
                                    <td width="33%" style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #dc2626;">{len(urgent)}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">Urgent</p>
                                    </td>
                                    <td width="5%"></td>
                                    <td width="33%" style="text-align: center; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">{len(high)}</p>
                                        <p style="margin: 5px 0 0; font-size: 12px; color: #6b7280; text-transform: uppercase;">High Priority</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Tender Sections -->
                    {urgent_html}
                    {high_html}
                    {other_html}

                    <!-- CTA -->
                    <tr>
                        <td style="padding: 30px 40px; text-align: center;">
                            <a href="{settings.app_base_url}/tenders"
                               style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 28px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                                View All Tenders →
                            </a>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">
                                You're receiving this because you're subscribed to Procurement Radar SA.
                            </p>
                            <p style="margin: 0; font-size: 12px;">
                                <a href="{settings.app_base_url}/settings" style="color: #16a34a; text-decoration: none;">Manage Preferences</a>
                                &nbsp;·&nbsp;
                                <a href="{unsubscribe_url}" style="color: #16a34a; text-decoration: none;">Unsubscribe</a>
                            </p>
                            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 11px;">
                                © {datetime.now().year} Procurement Radar SA. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    def _generate_tender_section(
        self,
        tenders: list[CrawledTender],
        title: str,
        color: str,
    ) -> str:
        """Generate HTML for a tender section."""
        if not tenders:
            return ""

        tender_rows = ""
        for tender in tenders[:10]:
            closing = ""
            if tender.closing_date:
                days = (tender.closing_date - datetime.now()).days
                if days <= 0:
                    closing = '<span style="color: #dc2626; font-weight: 600;">Closes today!</span>'
                elif days <= 3:
                    closing = f'<span style="color: #dc2626; font-weight: 600;">{days} days left</span>'
                elif days <= 7:
                    closing = f'<span style="color: #ea580c;">{days} days left</span>'
                else:
                    closing = f'{tender.closing_date.strftime("%d %b %Y")}'

            category_badge = (
                '<span style="display: inline-block; padding: 2px 8px; background-color: #e0f2fe; '
                'color: #0369a1; font-size: 10px; border-radius: 4px; text-transform: uppercase;">'
                f'{tender.category.value.replace("_", " ")}'
                "</span>"
            )

            tender_rows += f"""
            <tr>
                <td style="padding: 15px; border-bottom: 1px solid #e5e7eb;">
                    <a href="{tender.source_url}" style="color: #111827; text-decoration: none; font-weight: 500; font-size: 14px; display: block; margin-bottom: 5px;">
                        {tender.title[:100]}{'...' if len(tender.title) > 100 else ''}
                    </a>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                        {tender.issuer} · Ref: {tender.reference_number or 'N/A'}
                    </p>
                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 10px;">
                        {category_badge}
                        <span style="font-size: 12px; color: #6b7280;">{closing}</span>
                    </div>
                </td>
            </tr>
            """

        more_text = ""
        if len(tenders) > 10:
            more_text = f'<tr><td style="padding: 15px; text-align: center; color: #6b7280; font-size: 12px;">... and {len(tenders) - 10} more</td></tr>'

        return f"""
        <tr>
            <td style="padding: 0 40px 20px;">
                <h2 style="margin: 0 0 15px; font-size: 18px; color: {color};">{title}</h2>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    {tender_rows}
                    {more_text}
                </table>
            </td>
        </tr>
        """


email_sender = EmailSender()
