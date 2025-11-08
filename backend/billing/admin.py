from django.contrib import admin
from .models import Sweet, Invoice, InvoiceItem


@admin.register(Sweet)
class SweetAdmin(admin.ModelAdmin):
	list_display = ("name", "sweet_type", "price_per_kg", "price_per_unit")
	list_filter = ("sweet_type",)
	search_fields = ("name",)


class InvoiceItemInline(admin.TabularInline):
	model = InvoiceItem
	extra = 0
	fields = ("sweet", "item_type", "gross_weight_kg", "tray_weight_kg", "count", "unit_price_override")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
	list_display = ("id", "customer_name", "dm_no", "bill_type", "payment_mode", "created_at", "subtotal", "total_with_gst")
	list_filter = ("bill_type", "payment_mode", "created_at")
	search_fields = ("customer_name", "dm_no", "id")
	date_hierarchy = "created_at"
	readonly_fields = ("subtotal", "total", "gst_amount", "total_with_gst")
	inlines = [InvoiceItemInline]
	
	fieldsets = (
		("Customer Information", {
			"fields": ("customer_name", "dm_no")
		}),
		("Pricing", {
			"fields": ("discount_percent", "bill_type", "gst_percent")
		}),
		("Payment", {
			"fields": ("payment_mode",)
		}),
		("Calculated Fields (Read-only)", {
			"fields": ("subtotal", "total", "gst_amount", "total_with_gst"),
			"classes": ("collapse",)
		}),
	)
