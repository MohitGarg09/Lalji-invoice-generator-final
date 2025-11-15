import os
from datetime import datetime
from rest_framework import viewsets, decorators
from rest_framework.parsers import MultiPartParser, JSONParser
from django.http import HttpResponse
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import Sweet, Invoice, InvoiceItem, ProductMaster
from .serializers import SweetSerializer, InvoiceSerializer, ProductMasterSerializer
from .pdf import render_invoice_pdf
# Excel imports removed - using database-only storage
# from .excel import (
#     add_pdf_link_to_invoice,
#     export_invoice_records_to_excel,
#     get_master_excel_as_bytes,
# )

# ---------------- Sweets ---------------- #
class SweetViewSet(viewsets.ModelViewSet):
    queryset = Sweet.objects.all().order_by("name")
    serializer_class = SweetSerializer
    parser_classes = [MultiPartParser, JSONParser]

    @decorators.action(detail=False, methods=["get"])
    def export_excel(self, request):
        from .excel import export_sweets_to_excel
        excel_bytes = export_sweets_to_excel(self.get_queryset())
        resp = HttpResponse(
            excel_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="sweets.xlsx"'
        return resp

    @decorators.action(detail=False, methods=["post"])
    def import_excel(self, request):
        from .excel import import_sweets_from_excel
        if "file" not in request.FILES:
            return Response({"detail": 'No file uploaded with field name "file"'}, status=400)
        uploaded = request.FILES["file"].read()
        count = import_sweets_from_excel(uploaded)
        return Response({"imported_or_updated": count})

    @decorators.action(detail=False, methods=["post"])
    def reset_usage_stats(self, request):
        """
        Delete all sweet records from the database (admin only).
        This clears all sweet names from the dropdown so you can start fresh.
        Existing invoices will keep their sweet name references.
        """
        # Verify admin password
        password = request.data.get('password', '').strip()
        admin_password = getattr(settings, 'ADMIN_PASSWORD', 'Admin@2025')
        if password != admin_password:
            return Response({'success': False, 'message': 'Invalid admin password'}, status=403)
        
        # Get count before deletion
        sweet_count = Sweet.objects.count()
        
        try:
            # Delete all sweet records (this will clear the dropdown)
            deleted_count, deleted_details = Sweet.objects.all().delete()
            # Sweet records deleted successfully
            
            return Response({
                'success': True, 
                'message': f'Cleared {sweet_count} sweet names from dropdown. You can now start fresh with new names.',
                'deleted_count': sweet_count,
                'actual_deleted': deleted_count
            })
        except Exception as e:
            # If deletion fails due to foreign key constraints, provide helpful message
            return Response({
                'success': False, 
                'message': f'Cannot clear sweet names because they are referenced in existing invoices. Error: {str(e)}'
            }, status=400)

    @decorators.action(detail=False, methods=["get"])
    def popular(self, request):
        """
        Get sweets ordered by popularity (usage frequency and recency).
        """
        # Get sweets ordered by usage_count (desc), last_used (desc), then name
        popular_sweets = Sweet.objects.all().order_by('-usage_count', '-last_used', 'name')
        serializer = self.get_serializer(popular_sweets, many=True)
        return Response(serializer.data)


# ---------------- Product Master ---------------- #
class ProductMasterViewSet(viewsets.ModelViewSet):
    queryset = ProductMaster.objects.filter(is_active=True).order_by("name")
    serializer_class = ProductMasterSerializer
    parser_classes = [JSONParser]

    def get_queryset(self):
        """Return only active products by default, but allow admin to see all."""
        queryset = ProductMaster.objects.all().order_by("name")
        # Filter by active status unless specifically requested
        show_inactive = self.request.query_params.get('show_inactive', 'false').lower() == 'true'
        if not show_inactive:
            queryset = queryset.filter(is_active=True)
        return queryset

    @decorators.action(detail=False, methods=["post"])
    def bulk_update_status(self, request):
        """
        Bulk activate/deactivate products (admin only).
        """
        # Verify admin password
        password = request.data.get('password', '').strip()
        admin_password = getattr(settings, 'ADMIN_PASSWORD', 'Admin@2025')
        if password != admin_password:
            return Response({'success': False, 'message': 'Invalid admin password'}, status=403)
        
        product_ids = request.data.get('product_ids', [])
        is_active = request.data.get('is_active', True)
        
        if not product_ids:
            return Response({'success': False, 'message': 'No product IDs provided'}, status=400)
        
        try:
            updated_count = ProductMaster.objects.filter(id__in=product_ids).update(is_active=is_active)
            status_text = "activated" if is_active else "deactivated"
            return Response({
                'success': True,
                'message': f'{status_text.capitalize()} {updated_count} products',
                'updated_count': updated_count
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error updating products: {str(e)}'
            }, status=500)


# ---------------- Invoices ---------------- #
class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by("-created_at")
    serializer_class = InvoiceSerializer
    parser_classes = [JSONParser, MultiPartParser]

    @decorators.action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        """
        Generate and save PDF to disk in INVOICE_PDF_DIR, record its path in master Excel,
        and return the file as a download.
        """
        invoice = self.get_object()
        pdf_bytes, filename = render_invoice_pdf(invoice)

        # Ensure invoice PDF folder exists
        invoices_dir = getattr(settings, "INVOICE_PDF_DIR", os.path.join(settings.BASE_DIR, "invoices"))
        os.makedirs(invoices_dir, exist_ok=True)

        # Absolute path to save PDF
        file_path = os.path.join(invoices_dir, filename)

        # Save PDF to disk
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # Record PDF link in database (Excel storage removed per client requirements)
        from .models import InvoicePDFRecord
        InvoicePDFRecord.objects.update_or_create(
            invoice=invoice,
            defaults={
                'pdf_file_path': file_path,
                'notes': f"Saved automatically on {timezone.now().strftime('%Y-%m-%d %H:%M')}",
            }
        )

        # Return response to client
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

    @decorators.action(detail=False, methods=["get"])
    def search(self, request):
        """
        CRM endpoint: Search, filter, and sort invoices.
        Query params:
        - search: Search in customer_name, invoice_id, dm_no
        - customer_name: Filter by customer name
        - bill_type: Filter by bill type (GST/Non-GST)
        - payment_mode: Filter by payment mode (cash/credit)
        - date_from: Filter from date (YYYY-MM-DD)
        - date_to: Filter to date (YYYY-MM-DD)
        - ordering: Sort field (created_at, customer_name, total, etc.) with - prefix for desc
        """
        queryset = self.get_queryset()
        
        # Search filter
        search_term = request.query_params.get('search', '').strip()
        if search_term:
            search_filters = Q(customer_name__icontains=search_term) | Q(dm_no__icontains=search_term)
            # Try to parse as integer for ID search
            try:
                search_id = int(search_term)
                search_filters |= Q(id=search_id)
            except ValueError:
                pass
            queryset = queryset.filter(search_filters)
        
        # Customer name filter
        customer_name = request.query_params.get('customer_name', '').strip()
        if customer_name:
            queryset = queryset.filter(customer_name__icontains=customer_name)
        
        # Bill type filter
        bill_type = request.query_params.get('bill_type', '').strip()
        if bill_type:
            queryset = queryset.filter(bill_type=bill_type)
        
        # Payment mode filter
        payment_mode = request.query_params.get('payment_mode', '').strip()
        if payment_mode:
            queryset = queryset.filter(payment_mode=payment_mode)
        
        # Date range filters
        date_from = request.query_params.get('date_from', '').strip()
        date_to = request.query_params.get('date_to', '').strip()
        if date_from:
            try:
                from django.utils.dateparse import parse_date
                parsed_date = parse_date(date_from)
                if parsed_date:
                    queryset = queryset.filter(created_at__date__gte=parsed_date)
            except Exception:
                pass
        if date_to:
            try:
                from django.utils.dateparse import parse_date
                parsed_date = parse_date(date_to)
                if parsed_date:
                    queryset = queryset.filter(created_at__date__lte=parsed_date)
            except Exception:
                pass
        
        # Ordering
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering:
            queryset = queryset.order_by(ordering)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @decorators.action(detail=False, methods=["get"])
    def customer_names(self, request):
        """Return distinct non-empty customer names for dropdown suggestions."""
        names_qs = (
            Invoice.objects
            .exclude(customer_name__isnull=True)
            .exclude(customer_name__exact="")
            .values_list("customer_name", flat=True)
            .distinct()
            .order_by("customer_name")
        )
        return Response(list(names_qs))
    
    @decorators.action(detail=True, methods=["post"])
    def set_date(self, request, pk=None):
        """Admin-only: Set the created_at date for a single invoice.

        Expected JSON body:
        {
          "date": "13-11-2025",  # DD-MM-YYYY
          "password": "..."       # admin password
        }
        """
        # Verify admin password
        password = request.data.get("password", "").strip()
        admin_password = getattr(settings, "ADMIN_PASSWORD", "Admin@2025")
        if password != admin_password:
            return Response({"success": False, "message": "Invalid admin password"}, status=403)

        # Parse date string
        date_str = request.data.get("date", "").strip()
        if not date_str:
            return Response({"success": False, "message": "Missing 'date' in request body"}, status=400)

        parsed_dt = None
        # Try DD-MM-YYYY first
        for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
            try:
                parsed_dt = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue
        if parsed_dt is None:
            return Response({
                "success": False,
                "message": "Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD."
            }, status=400)

        # Make timezone-aware using project timezone
        aware_dt = timezone.make_aware(parsed_dt, timezone.get_current_timezone())

        invoice = self.get_object()
        invoice.created_at = aware_dt
        invoice.save(update_fields=["created_at"])

        return Response({
            "success": True,
            "id": invoice.id,
            "created_at": invoice.created_at,
            "message": "Invoice date updated successfully",
        })
    
    @decorators.action(detail=False, methods=["post", "options"])
    def verify_access(self, request):
        """
        Verify access password for general application access.
        Returns success status if password matches.
        """
        # Handle OPTIONS preflight request
        if request.method == 'OPTIONS':
            response = Response()
            origin = request.META.get('HTTP_ORIGIN', '*')
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type'
            response['Access-Control-Allow-Credentials'] = 'true'
            response['Access-Control-Max-Age'] = '86400'
            return response
        
        # Get origin for CORS headers
        origin = request.META.get('HTTP_ORIGIN', '*')
        
        # Get password from request - simplified processing
        password = request.data.get('password', '').strip()
        
        # Get access password from settings
        access_password = getattr(settings, 'ACCESS_PASSWORD', None)
        if access_password is None:
            access_password = getattr(settings, 'ADMIN_PASSWORD', 'Lalji@2025')
        
        # Simple string comparison
        if password == access_password:
            response = Response({'success': True, 'message': 'Access granted'})
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        response = Response({'success': False, 'message': 'Invalid password'}, status=403)
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    @decorators.action(detail=False, methods=["post"])
    def verify_admin(self, request):
        """
        Verify admin password for editing permissions.
        Returns success status if password matches.
        """
        password = request.data.get('password', '').strip()
        # Simple password check - in production, use proper authentication
        admin_password = getattr(settings, 'ADMIN_PASSWORD', 'Admin@2025')
        if password == admin_password:
            return Response({'success': True, 'message': 'Admin access granted'})
        return Response({'success': False, 'message': 'Invalid password'}, status=403)