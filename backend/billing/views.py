import os
from rest_framework import viewsets, decorators
from rest_framework.parsers import MultiPartParser, JSONParser
from django.http import HttpResponse
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from .models import Sweet, Invoice
from .serializers import SweetSerializer, InvoiceSerializer
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
    
    @decorators.action(detail=False, methods=["post", "options"])
    def verify_access(self, request):
        """
        Verify access password for general application access.
        Returns success status if password matches.
        """
        import logging
        logger = logging.getLogger('billing')
        
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
        
        # Get password from request - handle different data types and encoding
        try:
            # Try to get password from request.data (DRF parsed JSON)
            password_raw = request.data.get('password', '')
            
            # Handle different data types
            if isinstance(password_raw, bytes):
                password_raw = password_raw.decode('utf-8')
            elif not isinstance(password_raw, str):
                password_raw = str(password_raw)
            
            # Normalize password: strip whitespace and newlines
            password = password_raw.strip().replace('\r', '').replace('\n', '')
            
        except Exception as e:
            logger.error(f"Error parsing password from request: {e}")
            password = ''
        
        # Get access password from settings
        access_password = getattr(settings, 'ACCESS_PASSWORD', None)
        # If ACCESS_PASSWORD is not set, fall back to ADMIN_PASSWORD for backward compatibility
        if access_password is None:
            access_password = getattr(settings, 'ADMIN_PASSWORD', 'Lalji@2025')
        
        # Normalize access password as well
        if isinstance(access_password, bytes):
            access_password = access_password.decode('utf-8')
        elif not isinstance(access_password, str):
            access_password = str(access_password)
        access_password = access_password.strip().replace('\r', '').replace('\n', '')
        
        # Log the request for debugging (but don't log actual passwords in production)
        referer = request.META.get('HTTP_REFERER', 'No referer')
        user_agent = request.META.get('HTTP_USER_AGENT', 'No user agent')
        logger.info(f"verify_access request from origin: {origin}, referer: {referer}")
        logger.info(f"Request method: {request.method}, Content-Type: {request.content_type}")
        logger.info(f"User-Agent: {user_agent[:100]}")  # Log first 100 chars of user agent
        logger.info(f"Password received length: {len(password)}, expected length: {len(access_password)}")
        logger.info(f"CORS_ALLOWED_ORIGINS: {getattr(settings, 'CORS_ALLOWED_ORIGINS', [])}")
        logger.info(f"CORS_ALLOW_ALL_ORIGINS: {getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)}")
        
        # Compare passwords (case-sensitive exact match after normalization)
        if password == access_password:
            logger.info("Access granted - password match")
            response = Response({'success': True, 'message': 'Access granted'})
            # Always set CORS headers
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        
        # Log detailed mismatch info for debugging
        logger.warning(f"Access denied - password mismatch")
        logger.warning(f"Received password (first 10 chars): {repr(password[:10]) if len(password) > 0 else 'EMPTY'}")
        logger.warning(f"Expected password (first 10 chars): {repr(access_password[:10]) if len(access_password) > 0 else 'EMPTY'}")
        logger.warning(f"Password lengths - received: {len(password)}, expected: {len(access_password)}")
        logger.warning(f"Password bytes comparison: {password.encode('utf-8') == access_password.encode('utf-8')}")
        
        response = Response({'success': False, 'message': 'Invalid password'}, status=403)
        # Always set CORS headers even for error responses
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