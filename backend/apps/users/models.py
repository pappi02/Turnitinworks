"""
Database models for user management.
Implements custom user model with extended fields for SaaS platform.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils.translation import gettext_lazy as _
from django.core.validators import EmailValidator
import uuid


class CustomUser(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Provides additional fields required for the SaaS platform.
    """
    
    # UUID for external API references
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    
    # Username field
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[UnicodeUsernameValidator()],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    
    # Email field (required and unique)
    email = models.EmailField(
        _('email address'),
        unique=True,
        validators=[EmailValidator()],
        error_messages={
            'unique': _("A user with that email already exists."),
        }
    )
    
    # Phone number
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        blank=True,
        null=True,
        help_text=_('Contact phone number')
    )
    
    # Profile information
    avatar = models.URLField(
        _('avatar URL'),
        blank=True,
        null=True,
        help_text=_('Profile picture URL')
    )
    
    bio = models.TextField(
        _('biography'),
        blank=True,
        null=True,
        max_length=500,
        help_text=_('Short biography or description')
    )
    
    # Account status
    is_email_verified = models.BooleanField(
        _('email verified'),
        default=False,
        help_text=_('Indicates if the user has verified their email address')
    )
    
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_('Designates whether this user account should be treated as active.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True,
        db_index=True
    )
    
    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True
    )
    
    last_login_at = models.DateTimeField(
        _('last login at'),
        null=True,
        blank=True,
        help_text=_('Timestamp of the last successful login')
    )
    
    # Metadata
    login_attempts = models.IntegerField(
        _('login attempts'),
        default=0,
        help_text=_('Number of failed login attempts since last successful login')
    )
    
    is_locked = models.BooleanField(
        _('locked'),
        default=False,
        help_text=_('Account is locked due to too many failed login attempts')
    )
    
    locked_until = models.DateTimeField(
        _('locked until'),
        null=True,
        blank=True,
        help_text=_('Timestamp when the account lock will be automatically released')
    )
    
    # Preferences
    notification_email = models.BooleanField(
        _('email notifications'),
        default=True,
        help_text=_('Receive email notifications')
    )
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.get_full_name() or self.email
    
    def get_display_name(self):
        """Return the best available display name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email
    
    def reset_login_attempts(self):
        """Reset failed login attempts after successful login."""
        self.login_attempts = 0
        self.is_locked = False
        self.locked_until = None
        self.save(update_fields=['login_attempts', 'is_locked', 'locked_until'])
    
    def increment_login_attempts(self):
        """Increment failed login attempts."""
        self.login_attempts += 1
        if self.login_attempts >= 5:  # Lock after 5 failed attempts
            from django.utils import timezone
            from datetime import timedelta
            self.is_locked = True
            self.locked_until = timezone.now() + timedelta(minutes=15)
        self.save(update_fields=['login_attempts', 'is_locked', 'locked_until'])
    
    def is_account_locked(self):
        """Check if account is currently locked."""
        if not self.is_locked:
            return False
        
        if self.locked_until:
            from django.utils import timezone
            if timezone.now() >= self.locked_until:
                self.reset_login_attempts()
                return False
        return True
