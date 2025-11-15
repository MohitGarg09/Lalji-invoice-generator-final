# (place in the same module where your original function lives; keep module name unchanged)
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from decimal import Decimal, InvalidOperation
import os
import logging

logger = logging.getLogger(__name__)

def _to_decimal_safe(value, default=Decimal("0.00")):
    try:
        if value is None:
            return default
        return Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        return default

def _safe_image_reader(path):
    """Return ImageReader or None (never raise)."""
    try:
        if not path:
            return None
        # allow environment variables or direct paths
        p = os.path.expandvars(path)
        if not os.path.exists(p):
            return None
        return ImageReader(p)
    except Exception:
        # log but continue
        logger.exception("Failed to load logo image from path: %s", path)
        return None

def render_invoice_pdf(invoice):
    """
    Produces (pdf_bytes, filename) or returns None on catastrophic failure.
    Keeps original layout/styling intact. Any I/O or image errors are handled.
    """
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # --- Fonts ---
        HEADER_FONT = ("Helvetica-Bold", 18)
        COMPANY_FONT = ("Helvetica-Bold", 14)
        SUBHEADER_FONT = ("Helvetica-Bold", 12)
        ROW_FONT = ("Helvetica", 10)
        SMALL_FONT = ("Helvetica", 9)
        TOTAL_FONT = ("Helvetica-Bold", 11)

        # --- Margins ---
        left_margin = 15 * mm
        right_margin = width - 15 * mm
        y = height - 20 * mm

        # --- Company Header (Left Side) ---
        c.setFont(*COMPANY_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))
        try:
            bill_type_val = getattr(invoice, 'bill_type', 'GST') or 'GST'
            gst_enabled_header = str(bill_type_val).upper() == 'GST'
        except Exception:
            gst_enabled_header = True
        if gst_enabled_header:
            c.drawString(left_margin, y, "TAX INVOICE")
        c.drawString(left_margin, y-30, "LALJI CATERERS")
        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#495057'))
        c.drawString(left_margin, y - 42, "GMC college Yamuna sankul, New Radhakisan Plots, Akola")
        c.drawString(left_margin, y - 54, "Mobile: 9422959713")

        # --- Logo (Right Side) ---
        resolved_logo_path = os.environ.get('INVOICE_LOGO_PATH')
        # keep backward compatibility: try multiple locations
        if not resolved_logo_path:
            # Try billing app directory first (most common location)
            from django.conf import settings
            billing_logo = os.path.join(settings.BASE_DIR, "billing", "Lalji Logo.jpg")
            if os.path.exists(billing_logo):
                resolved_logo_path = billing_logo
            else:
                # Try staticfiles location (for production)
                candidate = os.path.join(os.getcwd(), "staticfiles", "images", "Lalji Logo.jpg")
                if os.path.exists(candidate):
                    resolved_logo_path = candidate
                else:
                    # Try current working directory
                    cwd_logo = os.path.join(os.getcwd(), "Lalji Logo.jpg")
                    if os.path.exists(cwd_logo):
                        resolved_logo_path = cwd_logo

        logo_img = _safe_image_reader(resolved_logo_path)
        if logo_img:
            try:
                iw, ih = logo_img.getSize()
                max_w, max_h = 100 * mm, 250 * mm
                scale = min(max_w / iw, max_h / ih)
                draw_w, draw_h = iw * scale, ih * scale
                logo_x = right_margin - draw_w
                # preserve original offset you had
                c.drawImage(logo_img, logo_x+87, y - draw_h + 40, width=draw_w, height=draw_h, mask='auto')
            except Exception:
                logger.exception("Failed drawing logo for invoice id=%s", getattr(invoice, "id", None))

        # --- rest of your PDF layout (divider, invoice info, table, rows, totals, footer)
        # To preserve styling exactly, reuse the same code you had for the rest of the PDF.
        # I'll include the same body but wrapped in try/except blocks where I/O occurs.

        # Divider line
        y -= 50 * mm
        c.setStrokeColor(colors.HexColor('#dee2e6'))
        c.setLineWidth(1)
        c.line(left_margin, y, right_margin, y)

        # --- TAX INVOICE Box (below line) ---
        y -= 10 * mm
        box_w, box_h = 75 * mm, 20 * mm
        box_x = right_margin - box_w

        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))

        info_y = y - 30
        start_x = box_x - 297

        # fallbacks for invoice attributes
        invoice_id = getattr(invoice, "id", "-")
        created_at = getattr(invoice, "created_at", None)
        created_str = created_at.strftime("%d-%m-%Y") if created_at else "-"
        invoice_text = f"Invoice No: INV-{invoice_id}"
        date_text = f"Invoice Date: {created_str}"
        dm_text = f"Invoice DM No: {getattr(invoice, 'dm_no', '-') or '-'}"

        c.drawString(start_x, info_y, invoice_text)
        c.drawString(start_x + 150, info_y, date_text)
        c.drawString(start_x + 300, info_y, dm_text)

        # Bill To
        c.setFont(*SUBHEADER_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))
        c.drawString(left_margin, y - 8, "Bill To:")
        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#495057'))
        c.drawString(left_margin + 18 * mm, y - 8, getattr(invoice, "customer_name", "Walk-in Customer") or "Walk-in Customer")

        y -= 28 * mm

        # Payment Info boxes (safe, no I/O)
        box_w = 65 * mm
        box_h = 10 * mm
        c.setStrokeColor(colors.HexColor('#dee2e6'))
        c.setFillColor(colors.HexColor('#f8f9fa'))
        c.rect(left_margin, y - box_h, box_w, box_h, fill=True, stroke=True)
        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))
        c.drawString(left_margin + 3, y - 18, f"Payment Mode: {getattr(invoice, 'payment_mode', 'Cash').capitalize()}")
        c.setFillColor(colors.HexColor('#f8f9fa'))
        c.rect(left_margin + box_w + 5, y - box_h, box_w, box_h, fill=True, stroke=True)
        c.setFillColor(colors.HexColor('#2c3e50'))
        c.drawString(left_margin + box_w + 8, y - 18, f"Bill Type: {getattr(invoice, 'bill_type', 'GST').upper()}")

        y -= 18 * mm

        # Table header & rows — preserve original code exactly (safe math with _to_decimal_safe)
        columns = [
            {"title": "Sr", "width": 12 * mm, "align": "center"},
            {"title": "Product/Sweet", "width": 45 * mm, "align": "left"},
            {"title": "Gross (kg)", "width": 18 * mm, "align": "right"},
            {"title": "Tray (kg)", "width": 18 * mm, "align": "right"},
            {"title": "Net (kg)", "width": 18 * mm, "align": "right"},
            {"title": "Count", "width": 16 * mm, "align": "right"},
            {"title": "Unit Price", "width": 25 * mm, "align": "right"},
            {"title": "Amount", "width": 25 * mm, "align": "right"},
        ]
        table_width = sum(col['width'] for col in columns)

        header_h = 9 * mm
        c.setFillColor(colors.HexColor('#2c3e50'))
        c.rect(left_margin, y - header_h, table_width, header_h, fill=True, stroke=False)
        c.setFillColor(colors.white)
        c.setFont(*ROW_FONT)
        x_pos = left_margin
        for col in columns:
            y_text = y - (header_h / 2) - 2
            if col["align"] == "left":
                c.drawString(x_pos + 3, y_text, col["title"])
            elif col["align"] == "center":
                c.drawCentredString(x_pos + col["width"] / 2, y_text, col["title"])
            else:
                c.drawRightString(x_pos + col["width"] - 3, y_text, col["title"])
            x_pos += col["width"]
        y -= header_h + 3 * mm

        c.setFont(*ROW_FONT)
        # iterate items safely; if invoice.items fails, catch below
        try:
            items_qs = invoice.items.select_related("sweet").order_by("order", "id")
        except Exception:
            items_qs = []
            logger.exception("Failed to fetch invoice.items for invoice id=%s", invoice_id)

        for idx, item in enumerate(items_qs, start=1):
            if y < 40 * mm:
                c.showPage()
                y = height - 30 * mm
                c.setFont(*ROW_FONT)

            row_h = 8 * mm
            c.setFillColor(colors.HexColor('#f8f9fa') if idx % 2 == 0 else colors.white)
            c.rect(left_margin, y - row_h, table_width, row_h, fill=True, stroke=True)

            try:
                sweet = item.sweet
            except Exception:
                sweet = type("S", (), {"name": "-", "price_per_kg": Decimal("0.00"), "price_per_unit": Decimal("0.00")})()

            is_weight_type = getattr(item, "item_type", "") == "weight"

            if is_weight_type:
                gross = _to_decimal_safe(getattr(item, "gross_weight_kg", None), Decimal("0.000"))
                tray = _to_decimal_safe(getattr(item, "tray_weight_kg", None), Decimal("0.000"))
                net = max(gross - tray, Decimal("0.00"))
                quantity = net
                gross_display = f"{gross:.3f}"
                tray_display = f"{tray:.3f}"
                net_display = f"{net:.3f}"
                count_display = "-"
            else:
                count_val = _to_decimal_safe(getattr(item, "count", None), Decimal(0))
                quantity = count_val
                gross_display = "-"
                tray_display = "-"
                net_display = "-"
                count_display = str(int(count_val)) if count_val > 0 else "-"

            if getattr(item, "unit_price_override", None) is not None:
                price = _to_decimal_safe(item.unit_price_override, Decimal("0.00"))
            elif is_weight_type:
                price = _to_decimal_safe(getattr(sweet, "price_per_kg", None), Decimal("0.00"))
                if price == Decimal("0.00"):
                    price = _to_decimal_safe(getattr(sweet, "price_per_unit", None), Decimal("0.00"))
            else:
                price = _to_decimal_safe(getattr(sweet, "price_per_unit", None), Decimal("0.00"))
                if price == Decimal("0.00"):
                    price = _to_decimal_safe(getattr(sweet, "price_per_kg", None), Decimal("0.00"))

            amount = (quantity * price) if quantity > 0 else Decimal("0.00")

            values = [
                str(idx),
                getattr(sweet, "name", "-"),
                gross_display,
                tray_display,
                net_display,
                count_display,
                f"Rs. {price:.2f}",
                f"Rs. {amount:.2f}"
            ]

            c.setFillColor(colors.HexColor('#2c3e50'))
            x_pos = left_margin
            y_text = y - (row_h / 2) - 2
            for col, val in zip(columns, values):
                if col["align"] == "left":
                    c.drawString(x_pos + 3, y_text, val)
                elif col["align"] == "center":
                    c.drawCentredString(x_pos + col["width"] / 2, y_text, val)
                else:
                    c.drawRightString(x_pos + col["width"] - 3, y_text, val)
                x_pos += col["width"]
            y -= row_h + 2

        y -= 10 * mm

        # --- Calculate totals ---
        subtotal = Decimal("0.00")
        try:
            items_for_totals = invoice.items.select_related("sweet").order_by("order", "id")
        except Exception:
            items_for_totals = []
            logger.exception("Failed to fetch invoice.items for totals for invoice id=%s", invoice_id)

        for item in items_for_totals:
            is_weight_type = getattr(item, "item_type", "") == 'weight'
            if is_weight_type:
                gross = _to_decimal_safe(getattr(item, "gross_weight_kg", None), Decimal("0.000"))
                tray = _to_decimal_safe(getattr(item, "tray_weight_kg", None), Decimal("0.000"))
                net = max(gross - tray, Decimal("0.00"))
                quantity = net
            else:
                quantity = _to_decimal_safe(getattr(item, "count", None), Decimal(0))

            if getattr(item, "unit_price_override", None) is not None:
                price = _to_decimal_safe(item.unit_price_override, Decimal("0.00"))
            elif is_weight_type:
                sweet = getattr(item, "sweet", None)
                price = _to_decimal_safe(getattr(sweet, "price_per_kg", None), Decimal("0.00"))
                if price == Decimal("0.00"):
                    price = _to_decimal_safe(getattr(sweet, "price_per_unit", None), Decimal("0.00"))
            else:
                sweet = getattr(item, "sweet", None)
                price = _to_decimal_safe(getattr(sweet, "price_per_unit", None), Decimal("0.00"))
                if price == Decimal("0.00"):
                    price = _to_decimal_safe(getattr(sweet, "price_per_kg", None), Decimal("0.00"))

            subtotal += (quantity * price)

        discount_pct = _to_decimal_safe(getattr(invoice, "discount_percent", None), Decimal("0.00"))
        discount_amount = subtotal * discount_pct / Decimal("100.00")
        subtotal_after_discount = subtotal - discount_amount
        bill_type = getattr(invoice, "bill_type", "GST")
        gst_enabled = str(bill_type).upper() == "GST"

        if gst_enabled:
            sgst = subtotal_after_discount * Decimal("2.5") / Decimal("100.00")
            cgst = subtotal_after_discount * Decimal("2.5") / Decimal("100.00")
            total = subtotal_after_discount + sgst + cgst
        else:
            sgst = cgst = Decimal("0.00")
            total = subtotal_after_discount

        # Totals & footer (same layout)
        amount_col_start = left_margin + sum(col["width"] for col in columns[:-1])
        amount_col_width = columns[-1]["width"]
        totals_right_x = amount_col_start + amount_col_width - 3

        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))
        line_gap = 6 * mm

        c.drawRightString(totals_right_x, y, f"Subtotal: Rs. {subtotal:.2f}")
        y -= line_gap
        if discount_pct > 0:
            c.drawRightString(totals_right_x, y, f"Discount ({discount_pct}%): Rs. {discount_amount:.2f}")
            y -= line_gap
        if gst_enabled:
            c.drawRightString(totals_right_x, y, f"SGST (2.5%): Rs. {sgst:.2f}")
            y -= line_gap
            c.drawRightString(totals_right_x, y, f"CGST (2.5%): Rs. {cgst:.2f}")
            y -= line_gap

        c.setFont(*TOTAL_FONT)
        c.setFillColor(colors.black)
        line_left = left_margin + sum(col['width'] for col in columns[:-1]) + 5
        line_right = right_margin - 5
        c.setStrokeColor(colors.black)
        c.setLineWidth(1)
        c.line(line_left-75, y + 12, line_right+20, y + 12)
        c.drawRightString(totals_right_x, y, f"TOTAL: Rs. {total:.2f}")
        c.line(line_left-75, y - 6, line_right+20, y - 6)

        y -= 15 * mm

        # signature and footer
        c.setStrokeColor(colors.HexColor('#dee2e6'))
        c.line(left_margin, y, right_margin, y)
        y -= 15 * mm

        sig_x = right_margin - 50 * mm
        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#2c3e50'))
        c.drawString(sig_x, y-60, "Authorized Signatory")
        c.setStrokeColor(colors.HexColor('#495057'))
        c.line(sig_x, y - 15 * mm, right_margin - 5 * mm, y - 15 * mm)

        y -= 30 * mm

        c.setStrokeColor(colors.HexColor('#dee2e6'))
        c.line(left_margin, y, right_margin, y)
        y -= 8 * mm
        c.setFont(*ROW_FONT)
        c.setFillColor(colors.HexColor('#6c757d'))
        c.drawCentredString(width / 2, y, "Thank you for your business!")
        y -= 6 * mm
        c.setFont(*SMALL_FONT)
        c.drawCentredString(width / 2, y, "• All prices are inclusive of applicable taxes")
        y -= 4 * mm
        c.drawCentredString(width / 2, y, "• Please retain this invoice for your records")
        y -= 4 * mm
        c.drawCentredString(width / 2, y, "• For queries, contact: 9822066728")
        y -= 4 * mm
        c.setFont("Helvetica-Oblique", 8)
        c.drawCentredString(width / 2, y, "This is a computer-generated invoice and does not require a physical signature")

        c.showPage()
        c.save()
        pdf = buffer.getvalue()
        buffer.close()

        # Build human-friendly filename: "DD-MM-YYYY (DM No.).pdf"
        dm_raw = getattr(invoice, "dm_no", None)
        dm_str = str(dm_raw).strip() if dm_raw is not None else ""
        # created_str already computed above as "%d-%m-%Y" or "-"

        if created_str != "-" and dm_str:
            # Sanitize DM number to be filesystem-safe
            safe_dm = "".join(
                ch if ch.isalnum() or ch in " -_." else "_" for ch in dm_str
            )
            filename = f"{created_str} (DM{safe_dm}).pdf"
        else:
            # Fallback to original pattern if we don't have proper date/DM
            filename = f"invoice_{invoice_id}.pdf"

        return pdf, filename

    except Exception:
        # absolute last-resort catch: log and return None (so caller doesn't crash)
        logger.exception("Unhandled exception while generating invoice PDF for id=%s", getattr(invoice, "id", None))
        try:
            buffer.close()
        except Exception:
            pass
        return None
