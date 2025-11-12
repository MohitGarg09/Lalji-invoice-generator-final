from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SweetViewSet, InvoiceViewSet, ProductMasterViewSet


router = DefaultRouter()
router.register(r'sweets', SweetViewSet, basename='sweet')
router.register(r'products', ProductMasterViewSet, basename='product')
router.register(r'invoices', InvoiceViewSet, basename='invoice')


urlpatterns = [
    path('', include(router.urls)),
]


