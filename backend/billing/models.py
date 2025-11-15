from django.db import models


class Sweet(models.Model):
    TYPE_WEIGHT = 'weight'
    TYPE_COUNT = 'count'
    TYPE_CHOICES = [
        (TYPE_WEIGHT, 'By Weight'),
        (TYPE_COUNT, 'By Count'),
    ]

    name = models.CharField(max_length=100, unique=True)
    sweet_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='weight')
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    usage_count = models.PositiveIntegerField(default=0)  # Track how often this sweet is used
    last_used = models.DateTimeField(null=True, blank=True)  # Track when last used
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-usage_count', '-last_used', 'name']  # Order by usage frequency, then recency, then name


class ProductMaster(models.Model):
    """
    Master list of products that can be managed by admin.
    This provides pre-configured products with default type and prices.
    """
    TYPE_WEIGHT = 'weight'
    TYPE_COUNT = 'count'
    TYPE_CHOICES = [
        (TYPE_WEIGHT, 'By Weight'),
        (TYPE_COUNT, 'By Count'),
    ]

    name = models.CharField(max_length=100, unique=True)
    product_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='weight')
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)  # Allow admin to disable products
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_product_type_display()})"

    class Meta:
        ordering = ['name']
        verbose_name = "Product Master"
        verbose_name_plural = "Product Masters"


class Invoice(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    customer_name = models.CharField(max_length=100, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # legacy
    payment_mode = models.CharField(max_length=10, choices=[('cash', 'Cash'), ('credit', 'Credit')], default='cash', null=True, blank=True)
    bill_type = models.CharField(max_length=10, choices=[('GST', 'GST'), ('Non-GST', 'Non-GST')], default='GST', null=True, blank=True)
    dm_no = models.CharField(max_length=100, blank=True, null=True)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=5)  # Default 5% GST
    pdf_file = models.FileField(upload_to='invoices/%Y/%m/%d/', null=True, blank=True)
    
    @property
    def subtotal(self):
        return sum(item.total_amount for item in self.items.all())

    @property
    def total(self):
        try:
            pct = float(self.discount_percent or 0)
        except Exception:
            pct = 0
        pct = min(max(pct, 0), 100)
        discounted = self.subtotal * (1 - (pct / 100))
        return max(discounted, 0)

    @property
    def gst_amount(self):
        """Calculate GST amount if bill_type is GST."""
        if self.bill_type == 'GST':
            try:
                gst_pct = float(self.gst_percent or 5)
            except Exception:
                gst_pct = 5
            return float(self.total) * (gst_pct / 100)
        return 0

    @property
    def total_with_gst(self):
        """Return total amount including GST if applicable."""
        return float(self.total) + self.gst_amount

    def __str__(self):
        return f"Invoice #{self.id or '—'} ({self.customer_name})"


class InvoiceItem(models.Model):
    TYPE_WEIGHT = 'weight'
    TYPE_COUNT = 'count'
    TYPE_CHOICES = [
        (TYPE_WEIGHT, 'By Weight'),
        (TYPE_COUNT, 'By Count'),
    ]

    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    sweet = models.ForeignKey(Sweet, on_delete=models.SET_NULL, null=True)
    
    # Store sweet name to preserve it even if sweet record is deleted
    sweet_name = models.CharField(max_length=100, blank=True)

    # Item-specific type (can differ from sweet's default type)
    item_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='weight')
    
    # Order field to maintain the sequence items were added
    order = models.PositiveIntegerField(default=0)

    # for weight-based items (in kg)
    gross_weight_kg = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    tray_weight_kg = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)

    # for count-based items
    count = models.PositiveIntegerField(null=True, blank=True)

    # Optional per-item unit price override (per kg for weight, per piece for count)
    unit_price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    @property
    def net_weight_kg(self):
        """Return net weight in kg."""
        if self.gross_weight_kg is not None:
            # Treat missing tray weight as 0 so weight-only entries still contribute
            tray = self.tray_weight_kg or 0
            net = self.gross_weight_kg - tray
            return max(net, 0)
        return None

    @property
    def total_amount(self):
        """Compute total based on item_type (weight or count)."""
        if self.item_type == self.TYPE_WEIGHT:
            # Weight-based calculation
            if self.net_weight_kg is None or self.net_weight_kg <= 0:
                return 0
            price = self.unit_price_override or self.sweet.price_per_kg
            if price is None:
                return 0
            return float(self.net_weight_kg) * float(price)
        else:
            # Count-based calculation (item_type == TYPE_COUNT)
            if self.count is None or self.count <= 0:
                return 0
            price = self.unit_price_override or self.sweet.price_per_unit
            if price is None:
                return 0
            return float(self.count) * float(price)

    def __str__(self):
        return f"{self.sweet.name} ({self.invoice_id})"
    
    class Meta:
        ordering = ['order', 'id']  # Order by the order field, then by ID as fallback


class InvoicePDFRecord(models.Model):
    invoice = models.OneToOneField(Invoice, on_delete=models.CASCADE, related_name='pdf_record')
    pdf_file_path = models.CharField(max_length=500)  # Store file path/URL
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PDF Record for Invoice {self.invoice.id}"