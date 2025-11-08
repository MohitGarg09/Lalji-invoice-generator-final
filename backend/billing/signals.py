# billing/signals.py
import os
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.files.base import ContentFile

from .models import Invoice
from .pdf import render_invoice_pdf

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Invoice)
def invoice_post_save_safe(sender, instance, created, **kwargs):
    """
    Safe post_save handler for Invoice.
    - Can be disabled via DISABLE_AUTO_PDF=1
    - Wraps PDF generation in try/except so admin save does not 500
    - Logs full exception to console (visible in Render logs)
    """
    # emergency toggle (set DISABLE_AUTO_PDF=1 in env to skip)
    if os.environ.get("DISABLE_AUTO_PDF", "0") == "1":
        logger.info("Auto-PDF generation skipped by DISABLE_AUTO_PDF env flag.")
        return

    try:
        # Keep logic minimal: try to generate PDF bytes; do not assume storage.
        pdf_result = render_invoice_pdf(instance)
        if not pdf_result:
            logger.info("render_invoice_pdf returned falsy value for invoice id=%s", getattr(instance, "id", None))
            return

        pdf_bytes, filename = pdf_result
        # If your Invoice model has a FileField/Field to save PDF, attach it safely:
        # e.g., instance.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
        # instance.save(update_fields=['pdf_file'])  # optional - be careful with recursion

        # NOTE: do not call instance.save() here without guards (would re-trigger post_save).
        logger.info("Auto-PDF generation succeeded for invoice id=%s, filename=%s", getattr(instance, "id", None), filename)
    except Exception:
        # Log full stack trace but DO NOT re-raise — prevents the 500 in admin save.
        logger.exception("Auto-PDF generation failed for invoice id=%s", getattr(instance, "id", None))
