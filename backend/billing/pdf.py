from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from django.conf import settings
try:
    from django.contrib.staticfiles import finders as static_finders
except Exception:
    static_finders = None
from decimal import Decimal, InvalidOperation
import os
import logging

logger = logging.getLogger(__name__)


def _to_decimal_safe(value, default=Decimal("0.00")):
    """Convert a value to Decimal safely, returning default on failure / None."""
    try:
        if value is None:
            return default
        # If it's already a Decimal, Decimal() will accept it; if it's str/float it will try.
        return Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        return default

def render_invoice_pdf(invoice):
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
    # Show TAX INVOICE only for GST bills
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
    c.drawString(left_margin, y - 42, "GMC college Yamuna sankul, New Radhakisan Plots, Akola, Maharashtra 444001")
    c.drawString(left_margin, y - 54, "Mobile: 9422959713")
    # c.drawString(left_margin, y - 66, "GSTIN: 27ABCDE1234Z5Z")

    # --- Logo (Right Side) ---
    # Resolve logo path via env or Django staticfiles (keeps styling and placement unchanged)
    resolved_logo_path = os.environ.get('INVOICE_LOGO_PATH')
    if not resolved_logo_path and static_finders is not None:
        # look for a common filename in staticfiles
        for candidate in [
            'Lalji Logo.jpg',
            'Lalji Logo.png',
            'images/Lalji Logo.jpg',
            'images/Lalji Logo.png',
        ]:
            try:
                p = static_finders.find(candidate)
            except Exception:
                p = None
            if p:
                resolved_logo_path = p
                break

    # If still not found, try some likely absolute/explicit paths (windows path you provided)
    if not resolved_logo_path:
        # try variants: backslashes and forward slashes
        possible_paths = [
            r"C:\Users\mohit\OneDrive\Documents\Desktop\Invoice generator\backend\billing\Lalji Logo.jpg",
            r"C:/Users/mohit/OneDrive/Documents/Desktop/Invoice generator/backend/billing/Lalji Logo.jpg",
            r"C:\Users\mohit\OneDrive\Documents\Desktop\Invoice generator\backend\billing\Lalji Logo.png",
            r"C:/Users/mohit/OneDrive/Documents/Desktop/Invoice generator/backend/billing/Lalji Logo.png",
        ]
        for p in possible_paths:
            try:
                if os.path.exists(p):
                    resolved_logo_path = p
                    break
            except Exception:
                # ignore filesystem errors here, continue trying other paths
                pass

    # Last fallback: try resolving relative to BASE_DIR if provided in settings
    if not resolved_logo_path:
        base_dir = getattr(settings, 'BASE_DIR', None)
        if base_dir:
            rel_candidates = [
                os.path.join(base_dir, 'billing', 'Lalji Logo.jpg'),
                os.path.join(base_dir, 'billing', 'Lalji Logo.png'),
                os.path.join(base_dir, 'static', 'billing', 'Lalji Logo.jpg'),
                os.path.join(base_dir, 'static', 'billing', 'Lalji Logo.png'),
            ]
            for p in rel_candidates:
                try:
                    if os.path.exists(p):
                        resolved_logo_path = p
                        break
                except Exception:
                    pass

    # Debug log the resolved path
    try:
        logger.debug("Resolved invoice logo path: %s (exists=%s)", resolved_logo_path, os.path.exists(resolved_logo_path) if resolved_logo_path else False)
    except Exception:
        pass

    if resolved_logo_path and os.path.exists(resolved_logo_path):
        try:
            logo_img = ImageReader(resolved_logo_path)
            iw, ih = logo_img.getSize()
            max_w, max_h = 100 * mm, 250 * mm
            scale = min(max_w / iw, max_h / ih)
            draw_w, draw_h = iw * scale, ih * scale
            logo_x = right_margin - draw_w
            # **kept your original offsets and placement exactly**
            c.drawImage(logo_img, logo_x+87, y - draw_h + 40, width=draw_w, height=draw_h, mask='auto')
        except Exception as exc:
            try:
                logger.exception("Failed to draw invoice logo from %s: %s", resolved_logo_path, exc)
            except Exception:
                print("Failed to draw invoice logo:", resolved_logo_path, exc)
    else:
        # keep silent visually; debug via logs
        pass

    # Divider line
    y -= 50 * mm
    c.setStrokeColor(colors.HexColor('#dee2e6'))
    c.setLineWidth(1)
    c.line(left_margin, y, right_margin, y)

    # --- TAX INVOICE Box (below line) ---
    y -= 10 * mm
    box_w, box_h = 75 * mm, 20 * mm
    box_x = right_margin - box_w

    # 🧾 Invoice Info (Single Line)
    c.setFont(*ROW_FONT)
    c.setFillColor(colors.HexColor('#2c3e50'))

    info_y = y - 30  # vertical position
    start_x = box_x - 297  # left margin

    invoice_text = f"Invoice No: INV-{invoice.id}"
    date_text = f"Invoice Date: {invoice.created_at:%d-%m-%Y}"
    dm_text = f"Invoice DM No: {invoice.dm_no or '-'}"

    # Draw them in one line with proper spacing
    c.drawString(start_x, info_y, invoice_text)
    c.drawString(start_x + 150, info_y, date_text)
    c.drawString(start_x + 300, info_y, dm_text)

    # --- Bill To ---
    c.setFont(*SUBHEADER_FONT)
    c.setFillColor(colors.HexColor('#2c3e50'))
    c.drawString(left_margin, y - 8, "Bill To:")
    c.setFont(*ROW_FONT)
    c.setFillColor(colors.HexColor('#495057'))
    c.drawString(left_margin + 18 * mm, y - 8, invoice.customer_name or "Walk-in Customer")

    y -= 28 * mm

    # --- Payment Info ---
    box_w = 65 * mm
    box_h = 10 * mm
    c.setStrokeColor(colors.HexColor('#dee2e6'))
    c.setFillColor(colors.HexColor('#f8f9fa'))
    # Payment box
    c.rect(left_margin, y - box_h, box_w, box_h, fill=True, stroke=True)
    c.setFont(*ROW_FONT)
    c.setFillColor(colors.HexColor('#2c3e50'))
    c.drawString(left_margin + 3, y - 18, f"Payment Mode: {getattr(invoice, 'payment_mode', 'Cash').capitalize()}")
    # Bill type box
    c.setFillColor(colors.HexColor('#f8f9fa'))
    c.rect(left_margin + box_w + 5, y - box_h, box_w, box_h, fill=True, stroke=True)
    c.setFillColor(colors.HexColor('#2c3e50'))
    c.drawString(left_margin + box_w + 8, y - 18, f"Bill Type: {getattr(invoice, 'bill_type', 'GST').upper()}")

    y -= 18 * mm

    # --- Table Header ---
    # Adjusted widths to fit an extra Net (kg) column within page width
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

    # --- Table Rows ---
    c.setFont(*ROW_FONT)
    for idx, item in enumerate(invoice.items.select_related("sweet").all(), start=1):
        if y < 40 * mm:
            c.showPage()
            y = height - 30 * mm
            c.setFont(*ROW_FONT)

        row_h = 8 * mm
        c.setFillColor(colors.HexColor('#f8f9fa') if idx % 2 == 0 else colors.white)
        c.rect(left_margin, y - row_h, table_width, row_h, fill=True, stroke=True)

        sweet = item.sweet
        is_weight_type = item.item_type == "weight"

        # Get values based on item_type
        if is_weight_type:
            gross = _to_decimal_safe(item.gross_weight_kg, Decimal("0.000"))
            tray = _to_decimal_safe(item.tray_weight_kg, Decimal("0.000"))
            net = max(gross - tray, Decimal("0.00"))
            quantity = net
            count_val = Decimal(0)
            gross_display = f"{gross:.3f}"
            tray_display = f"{tray:.3f}"
            net_display = f"{net:.3f}"
            count_display = "-"
        else:  # count type
            gross = Decimal(0)
            tray = Decimal(0)
            net = Decimal(0)
            count_val = _to_decimal_safe(item.count, Decimal(0))
            quantity = count_val
            gross_display = "-"
            tray_display = "-"
            net_display = "-"
            count_display = str(int(count_val)) if count_val > 0 else "-"

        # Determine price with safe fallbacks:
        # 1) per-item override (if provided)
        # 2) type-appropriate sweet price (price_per_kg or price_per_unit)
        # 3) fall back to other sweet price if primary missing (best-effort)
        # 4) default to 0.00
        if item.unit_price_override is not None:
            price = _to_decimal_safe(item.unit_price_override, Decimal("0.00"))
        elif is_weight_type:
            price = _to_decimal_safe(sweet.price_per_kg, Decimal("0.00"))
            # fallback: if no price_per_kg but price_per_unit present, derive approximate by using it (best-effort)
            if price == Decimal("0.00"):
                price = _to_decimal_safe(sweet.price_per_unit, Decimal("0.00"))
        else:
            price = _to_decimal_safe(sweet.price_per_unit, Decimal("0.00"))
            if price == Decimal("0.00"):
                price = _to_decimal_safe(sweet.price_per_kg, Decimal("0.00"))

        # Calculate amount
        amount = (quantity * price) if quantity > 0 else Decimal("0.00")

        values = [
            str(idx),
            sweet.name,
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
    for item in invoice.items.select_related("sweet").all():
        sweet = item.sweet  # make sure to use the correct sweet for each item
        is_weight_type = item.item_type == 'weight'

        if is_weight_type:
            gross = _to_decimal_safe(item.gross_weight_kg, Decimal("0.000"))
            tray = _to_decimal_safe(item.tray_weight_kg, Decimal("0.000"))
            net = max(gross - tray, Decimal("0.00"))
            quantity = net
        else:
            quantity = _to_decimal_safe(item.count, Decimal(0))

        if item.unit_price_override is not None:
            price = _to_decimal_safe(item.unit_price_override, Decimal("0.00"))
        elif is_weight_type:
            price = _to_decimal_safe(sweet.price_per_kg, Decimal("0.00"))
            if price == Decimal("0.00"):
                price = _to_decimal_safe(sweet.price_per_unit, Decimal("0.00"))
        else:
            price = _to_decimal_safe(sweet.price_per_unit, Decimal("0.00"))
            if price == Decimal("0.00"):
                price = _to_decimal_safe(sweet.price_per_kg, Decimal("0.00"))

        subtotal += (quantity * price)

    discount_pct = _to_decimal_safe(invoice.discount_percent, Decimal("0.00"))
    discount_amount = subtotal * discount_pct / Decimal("100.00")
    subtotal_after_discount = subtotal - discount_amount
    bill_type = getattr(invoice, "bill_type", "GST")
    gst_enabled = bill_type.upper() == "GST"

    if gst_enabled:
        sgst = subtotal_after_discount * Decimal("2.5") / Decimal("100.00")
        cgst = subtotal_after_discount * Decimal("2.5") / Decimal("100.00")
        total = subtotal_after_discount + sgst + cgst
    else:
        sgst = cgst = Decimal("0.00")
        total = subtotal_after_discount

    # --- Totals aligned with Amount column ---
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

    # --- TOTAL Section ---
    c.setFont(*TOTAL_FONT)
    c.setFillColor(colors.black)

    # Draw black line above TOTAL
    line_left = left_margin + sum(col['width'] for col in columns[:-1]) + 5  # start near amount column
    line_right = right_margin - 5
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.line(line_left-75, y + 12, line_right+20, y + 12)

    # Draw TOTAL text
    c.drawRightString(totals_right_x, y, f"TOTAL: Rs. {total:.2f}")

    # Draw black line below TOTAL
    c.line(line_left-75, y - 6, line_right+20, y - 6)

    y -= 15 * mm

    # --- Signature Section ---
    c.setStrokeColor(colors.HexColor('#dee2e6'))
    c.line(left_margin, y, right_margin, y)
    y -= 15 * mm

    # Authorized Signature on right
    sig_x = right_margin - 50 * mm
    c.setFont(*ROW_FONT)
    c.setFillColor(colors.HexColor('#2c3e50'))
    c.drawString(sig_x, y-60, "Authorized Signatory")
    c.setStrokeColor(colors.HexColor('#495057'))
    c.line(sig_x, y - 15 * mm, right_margin - 5 * mm, y - 15 * mm)

    y -= 30 * mm

    # --- Footer ---
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
    filename = f"invoice_{invoice.id}.pdf"
    return pdf, filename
