# billing/apps.py
from django.apps import AppConfig

class BillingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'billing'

    def ready(self):
        try:
            import billing.signals  # noqa: F401
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Failed to import billing.signals")

