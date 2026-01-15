"""
URL routing for user authentication endpoints.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.users.views import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileViewSet,
)

router = DefaultRouter()
router.register(r'profile', UserProfileViewSet, basename='profile')

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view({'post': 'logout'}), name='logout'),
] + router.urls
