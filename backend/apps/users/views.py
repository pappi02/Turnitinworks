"""
API views for user authentication and profile management.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
import logging

from apps.users.serializers import (
    UserRegisterSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
)
from apps.turnitin.tasks import provision_turnitin_user

logger = logging.getLogger(__name__)
User = get_user_model()


class UserRegistrationView(TokenObtainPairView):
    """
    User registration endpoint.
    Creates new user and returns JWT tokens.
    
    POST /api/v1/auth/register/
    {
        "email": "user@example.com",
        "username": "username",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1234567890",
        "password": "SecurePassword123!",
        "password_confirm": "SecurePassword123!"
    }
    """
    
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """Register new user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = serializer.save()
            
            # Queue Turnitin provisioning task asynchronously
            provision_turnitin_user.delay(user.id)
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"New user registered: {user.email}")
            
            return Response({
                'success': True,
                'message': _('Registration successful. Welcome!'),
                'user': UserProfileSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({
                'success': False,
                'detail': _('Registration failed. Please try again.'),
            }, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(TokenObtainPairView):
    """
    User login endpoint.
    Authenticates user and returns JWT tokens.
    
    POST /api/v1/auth/login/
    {
        "username": "email@example.com or username",
        "password": "password"
    }
    """
    
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        """Login user."""
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == status.HTTP_200_OK:
            user = request.user if hasattr(request, 'user') else None
            if not user:
                # Retrieve user from serializer
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    user = serializer.validated_data.get('user')
            
            logger.info(f"User logged in: {request.data.get('username')}")
            
            return Response({
                'success': True,
                'message': _('Login successful'),
                'user': UserProfileSerializer(user).data if user else None,
                'access': response.data.get('access'),
                'refresh': response.data.get('refresh'),
            }, status=status.HTTP_200_OK)
        
        return response


class UserLogoutView(viewsets.ViewSet):
    """
    User logout endpoint.
    Invalidates refresh token.
    
    POST /api/v1/auth/logout/
    {
        "refresh": "refresh_token"
    }
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout user."""
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({
                    'detail': _('Refresh token is required.')
                }, status=status.HTTP_400_BAD_REQUEST)
            
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            logger.info(f"User logged out: {request.user.email}")
            
            return Response({
                'success': True,
                'message': _('Logout successful')
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return Response({
                'detail': _('Logout failed.')
            }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileViewSet(viewsets.ViewSet):
    """
    User profile management endpoints.
    
    GET /api/v1/auth/profile/ - Get user profile
    PATCH /api/v1/auth/profile/ - Update user profile
    POST /api/v1/auth/change-password/ - Change password
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get authenticated user's profile."""
        serializer = UserProfileSerializer(request.user)
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update user profile."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        logger.info(f"User profile updated: {request.user.email}")
        
        return Response({
            'success': True,
            'message': _('Profile updated successfully'),
            'user': UserProfileSerializer(request.user).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password."""
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        logger.info(f"Password changed: {request.user.email}")
        
        return Response({
            'success': True,
            'message': _('Password changed successfully')
        }, status=status.HTTP_200_OK)
