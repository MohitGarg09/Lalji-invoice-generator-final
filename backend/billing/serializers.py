from rest_framework import serializers
from .models import Sweet, Invoice, InvoiceItem, ProductMaster


class SweetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sweet
        fields = ['id', 'name', 'sweet_type', 'price_per_kg', 'price_per_unit', 'usage_count', 'last_used', 'created_at']


class ProductMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMaster
        fields = ['id', 'name', 'product_type', 'price_per_kg', 'price_per_unit', 'is_active', 'created_at', 'updated_at']


class InvoiceItemSerializer(serializers.ModelSerializer):
    net_weight_kg = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    unit_price_override = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    item_type = serializers.ChoiceField(choices=['weight', 'count'], required=False, allow_null=True)
    # Use the stored sweet_name field instead of relying on sweet.name relationship
    sweet_name = serializers.CharField(read_only=True)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'sweet', 'sweet_name', 'item_type', 'order', 'gross_weight_kg', 'tray_weight_kg', 'net_weight_kg', 'count', 'unit_price_override', 'total_amount'
        ]

    def validate(self, data):
        """
        Light validation:
        - If item_type is provided, enforce presence of required fields for that type.
        - If item_type is omitted, parent serializer will infer it.
        """
        item_type = data.get('item_type', None)
        if item_type == 'count':
            # ensure count present and positive-ish
            count = data.get('count', None)
            if count in (None, ''):
                raise serializers.ValidationError("Field 'count' must be provided for count-type items.")
        elif item_type == 'weight':
            # weight items should ideally have gross_weight_kg; allow None but warn in client
            pass
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    # Compute monetary values dynamically to always reflect current items
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    gst_amount = serializers.SerializerMethodField()
    total_with_gst = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'created_at', 'customer_name', 'discount_percent', 'subtotal', 'dm_no', 'payment_mode', 'bill_type', 'total', 'gst_amount', 'total_with_gst', 'items']

    def get_subtotal(self, obj):
        """Return subtotal based on current items (rounded to 2 decimals)."""
        try:
            return round(float(obj.subtotal), 2)
        except Exception:
            return 0.0

    def get_total(self, obj):
        """Return total after discount (without GST)."""
        try:
            return round(float(obj.total), 2)
        except Exception:
            return 0.0

    def get_gst_amount(self, obj):
        """Return GST amount based on current subtotal/discount and bill type."""
        try:
            return round(float(obj.gst_amount), 2)
        except Exception:
            return 0.0

    def get_total_with_gst(self, obj):
        """Return grand total including GST if applicable."""
        try:
            return round(float(obj.total_with_gst), 2)
        except Exception:
            return 0.0

    @staticmethod
    def _ensure_item_type(item_dict):
        """
        Ensure item_dict has an 'item_type' key.
        If not provided, infer from fields:
         - if count is present and >0 -> 'count'
         - else -> 'weight'
        """
        # If already present and truthy, keep it
        it = item_dict.get('item_type', None)
        if it:
            return item_dict

        count = item_dict.get('count', None)
        if count is None:
            # no count supplied; default to weight
            item_dict['item_type'] = 'weight'
            return item_dict

        # Try to coerce count to int and check > 0
        try:
            # handle strings like "100" as well
            if isinstance(count, str) and count.strip() == "":
                item_dict['item_type'] = 'weight'
                return item_dict
            c = int(count)
            if c > 0:
                item_dict['item_type'] = 'count'
                # ensure numeric type for DB creation (Django will coerce but keep int)
                item_dict['count'] = c
                return item_dict
        except Exception:
            # if conversion fails, default to weight (safer)
            item_dict['item_type'] = 'weight'
            return item_dict

        # default fallback
        item_dict['item_type'] = 'weight'
        return item_dict

    def create(self, validated_data):
        from django.utils import timezone
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        
        # Track sweet usage
        sweet_ids_used = set()
        
        for order_index, item in enumerate(items_data):
            item = self._ensure_item_type(item)
            
            # Get sweet name to preserve it
            sweet = item.get('sweet')
            sweet_name = ''
            if sweet:
                if hasattr(sweet, 'name'):
                    sweet_name = sweet.name
                else:
                    # If sweet is an ID, get the name from database
                    try:
                        sweet_obj = Sweet.objects.get(id=sweet)
                        sweet_name = sweet_obj.name
                    except Sweet.DoesNotExist:
                        sweet_name = 'Unknown Sweet'
            
            # Create invoice item with sweet name preserved and order set
            InvoiceItem.objects.create(invoice=invoice, sweet_name=sweet_name, order=order_index, **item)
            
            # Track which sweets were used
            if sweet:
                # Handle both Sweet object and Sweet ID
                sweet_id = sweet.id if hasattr(sweet, 'id') else sweet
                sweet_ids_used.add(sweet_id)
        
        # Update usage statistics for used sweets
        if sweet_ids_used:
            from django.db.models import F
            Sweet.objects.filter(id__in=sweet_ids_used).update(
                usage_count=F('usage_count') + 1,
                last_used=timezone.now()
            )
        
        return invoice

    def update(self, instance, validated_data):
        from django.utils import timezone
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            # Keep existing behavior: delete and recreate invoice items
            instance.items.all().delete()
            
            # Track sweet usage for updated items
            sweet_ids_used = set()
            
            for order_index, item in enumerate(items_data):
                item = self._ensure_item_type(item)
                
                # Get sweet name to preserve it during update
                sweet = item.get('sweet')
                sweet_name = ''
                if sweet:
                    if hasattr(sweet, 'name'):
                        sweet_name = sweet.name
                    else:
                        # If sweet is an ID, get the name from database
                        try:
                            sweet_obj = Sweet.objects.get(id=sweet)
                            sweet_name = sweet_obj.name
                        except Sweet.DoesNotExist:
                            sweet_name = 'Unknown Sweet'
                
                # Create invoice item with sweet name preserved and order set
                InvoiceItem.objects.create(invoice=instance, sweet_name=sweet_name, order=order_index, **item)
                
                # Track which sweets were used
                if sweet:
                    # Handle both Sweet object and Sweet ID
                    sweet_id = sweet.id if hasattr(sweet, 'id') else sweet
                    sweet_ids_used.add(sweet_id)
            
            # Update usage statistics for used sweets
            if sweet_ids_used:
                from django.db.models import F
                Sweet.objects.filter(id__in=sweet_ids_used).update(
                    usage_count=F('usage_count') + 1,
                    last_used=timezone.now()
                )
        return instance
