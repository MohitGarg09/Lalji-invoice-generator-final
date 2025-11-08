# billing/signals.py
import os
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import Invoice
from .pdf import render_invoice_pdf  # adjust path only if your function lives elsewhere

logger = logging.getLogger(__name__)
PDF_FIELD_NAME = "pdf_file"  # change only if your Invoice model uses a different field name

@receiver(post_save, sender=Invoice)
def invoice_post_save_once(sender, instance, created, **kwargs):
    if os.environ.get("DISABLE_AUTO_PDF", "0") == "1":
        logger.info("Auto-PDF generation skipped by DISABLE_AUTO_PDF.")
        return

    def _generate_and_store():
        try:
            pk = getattr(instance, "pk", None)
            if not pk:
                logger.warning("Invoice has no PK; skipping PDF gen.")
                return

            # Skip if model already has file in field
            if hasattr(instance, PDF_FIELD_NAME):
                existing = getattr(instance, PDF_FIELD_NAME)
                try:
                    if existing and getattr(existing, "name", None):
                        logger.info("Invoice id=%s already has PDF '%s' — skipping.", pk, existing.name)
                        return
                except Exception:
                    pass

            result = render_invoice_pdf(instance)
            if not result:
                logger.error("render_invoice_pdf returned falsy for invoice id=%s", pk)
                return
            pdf_bytes, filename = result

            storage_path = f"invoices/{pk}/{filename}"
            saved_path = default_storage.save(storage_path, ContentFile(pdf_bytes))

            # Persist path without calling instance.save() to avoid signals recursion
            Invoice.objects.filter(pk=pk).update(**{PDF_FIELD_NAME: saved_path})

            logger.info("Auto-PDF generated & saved for invoice id=%s -> %s", pk, saved_path)

        except Exception:
            logger.exception("Auto-PDF generation/store failed for invoice id=%s", getattr(instance, "pk", None))

    try:
        transaction.on_commit(_generate_and_store)
    except Exception:
        logger.exception("transaction.on_commit failed; running PDF gen synchronously.")
        _generate_and_store()
