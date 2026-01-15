"""
URL routing for Turnitin integration endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .task_views import TaskMonitoringViewSet, TaskQueueViewSet

# Create router for viewsets
router = DefaultRouter()
router.register(r'tasks', TaskMonitoringViewSet, basename='task')
router.register(r'queues', TaskQueueViewSet, basename='queue')

urlpatterns = [
    path('', include(router.urls)),
    # Additional Turnitin endpoints can be added here
]
