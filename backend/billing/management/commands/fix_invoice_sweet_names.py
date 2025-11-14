from django.core.management.base import BaseCommand
from billing.models import InvoiceItem, Sweet


class Command(BaseCommand):
    help = 'Fix corrupted sweet_name fields in existing invoice items'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Find invoice items with missing or incorrect sweet_name
        items_to_fix = InvoiceItem.objects.filter(
            sweet__isnull=False,
            sweet_name__in=['', 'Unknown Sweet']
        ).select_related('sweet')
        
        # Also find items where sweet_name doesn't match the actual sweet name
        all_items = InvoiceItem.objects.filter(sweet__isnull=False).select_related('sweet')
        mismatched_items = []
        
        for item in all_items:
            if item.sweet and item.sweet_name != item.sweet.name:
                mismatched_items.append(item)
        
        total_items = len(items_to_fix) + len(mismatched_items)
        
        if total_items == 0:
            self.stdout.write(
                self.style.SUCCESS('No invoice items need fixing!')
            )
            return
        
        self.stdout.write(f'Found {total_items} invoice items that need fixing:')
        self.stdout.write(f'- {len(items_to_fix)} items with missing sweet_name')
        self.stdout.write(f'- {len(mismatched_items)} items with mismatched sweet_name')
        
        if dry_run:
            self.stdout.write('\n--- DRY RUN - No changes will be made ---')
            
            for item in items_to_fix:
                self.stdout.write(
                    f'Invoice {item.invoice.id}, Item {item.id}: '
                    f'"{item.sweet_name}" → "{item.sweet.name}"'
                )
            
            for item in mismatched_items:
                self.stdout.write(
                    f'Invoice {item.invoice.id}, Item {item.id}: '
                    f'"{item.sweet_name}" → "{item.sweet.name}"'
                )
        else:
            # Fix missing sweet_name
            for item in items_to_fix:
                old_name = item.sweet_name
                item.sweet_name = item.sweet.name
                item.save()
                self.stdout.write(
                    f'Fixed Invoice {item.invoice.id}, Item {item.id}: '
                    f'"{old_name}" → "{item.sweet.name}"'
                )
            
            # Fix mismatched sweet_name
            for item in mismatched_items:
                old_name = item.sweet_name
                item.sweet_name = item.sweet.name
                item.save()
                self.stdout.write(
                    f'Fixed Invoice {item.invoice.id}, Item {item.id}: '
                    f'"{old_name}" → "{item.sweet.name}"'
                )
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully fixed {total_items} invoice items!')
            )
