"""
URL routing configuration for TextVerity platform.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .views import api_root
from apps.submissions.views import AnalyticsView, AnalyticsExportView

# API endpoints
api_v1_patterns = [
    path('auth/', include('apps.users.urls')),
    path('submissions/', include('apps.submissions.urls')),
    path('turnitin/', include('apps.turnitin.urls')),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    path('analytics/export/', AnalyticsExportView.as_view(), name='analytics-export'),
]

urlpatterns = [
    # Root landing page
    path('', api_root, name='api-root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API v1
    path('api/v1/', include(api_v1_patterns)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
