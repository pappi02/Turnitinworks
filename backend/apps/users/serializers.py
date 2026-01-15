"""
Serializers for user authentication and profile management.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
import re

User = get_user_model()


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text='Password must be at least 12 characters with uppercase, lowercase, and numbers.'
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ('email', 'username', 'first_name', 'last_name', 'phone_number', 'password', 'password_confirm')
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email format and uniqueness."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()
    
    def validate_username(self, value):
        """Validate username format and uniqueness."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        if len(value) < 3:
            raise serializers.ValidationError('Username must be at least 3 characters long.')
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number format."""
        if value:
            # Remove common formatting characters
            cleaned = re.sub(r'[\s\-\(\)\.+]', '', value)
            if not cleaned.isdigit() or len(cleaned) < 10:
                raise serializers.ValidationError('Please provide a valid phone number.')
        return value
    
    def validate(self, data):
        """Validate password matching."""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password': 'Password fields must match.'
            })
        return data
    
    def create(self, validated_data):
        """Create and return user instance."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer for login with email or username.
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Authenticate user with email or username."""
        username = attrs.get('username')
        password = attrs.get('password')
        
        try:
            # Try to find user by email first
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            try:
                # Fall back to username
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid email or username.')
        
        # Check if account is locked
        if user.is_account_locked():
            raise serializers.ValidationError(
                'Account is temporarily locked due to too many login attempts. Please try again later.'
            )
        
        # Verify password
        if not user.check_password(password):
            user.increment_login_attempts()
            raise serializers.ValidationError('Invalid password.')
        
        # Reset login attempts on successful login
        user.reset_login_attempts()
        
        # Update last login
        from django.utils import timezone
        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])
        
        attrs['user'] = user
        return super().validate(attrs)
    
    @classmethod
    def get_token(cls, user):
        """Get tokens for authenticated user."""
        token = super().get_token(user)
        token['email'] = user.email
        token['username'] = user.username
        return token


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile information.
    """
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'phone_number', 'avatar', 'bio',
            'is_email_verified', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'email', 'username', 'created_at', 'updated_at')
    
    def get_full_name(self, obj):
        return obj.get_display_name()


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    """
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number', 'avatar', 'bio', 'notification_email')
    
    def validate_phone_number(self, value):
        """Validate phone number format."""
        if value:
            cleaned = re.sub(r'[\s\-\(\)\.+]', '', value)
            if not cleaned.isdigit() or len(cleaned) < 10:
                raise serializers.ValidationError('Please provide a valid phone number.')
        return value
    
    def update(self, instance, validated_data):
        """Update user instance."""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for changing password.
    """
    old_password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    
    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value
    
    def validate(self, data):
        """Validate new passwords match."""
        if data.get('new_password') != data.get('new_password_confirm'):
            raise serializers.ValidationError({
                'new_password': 'Password fields must match.'
            })
        return data
    
    def save(self, **kwargs):
        """Change password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class TokenRefreshSerializer(serializers.Serializer):
    """
    Serializer for refreshing JWT tokens.
    """
    refresh = serializers.CharField(required=True, help_text='Refresh token')
    
    def validate_refresh(self, value):
        """Validate refresh token."""
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            RefreshToken(value)
        except Exception:
            raise serializers.ValidationError('Invalid refresh token.')
        return value
