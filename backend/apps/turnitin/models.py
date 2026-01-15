"""
Models for Turnitin integration.
Manages Turnitin user profiles and API credentials.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import URLValidator
from django.utils.translation import gettext_lazy as _
from cryptography.fernet import Fernet
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class TurnitinProfile(models.Model):
    """
    Stores Turnitin-specific user information and credentials.
    One-to-one relationship with CustomUser.
    
    Critical: Credentials are encrypted at rest and never exposed to frontend.
    """
    
    # User relationship
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='turnitin_profile',
        help_text=_('Associated platform user')
    )
    
    # Turnitin identifiers
    turnitin_user_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text=_('Unique Turnitin user identifier from API')
    )
    
    turnitin_class_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text=_('Optional Turnitin class/assignment identifier')
    )
    
    # Encrypted credentials (NEVER expose to frontend)
    _encrypted_api_key = models.TextField(
        'encrypted_api_key',
        blank=True,
        null=True,
        help_text=_('Encrypted API key for Turnitin')
    )
    
    _encrypted_api_secret = models.TextField(
        'encrypted_api_secret',
        blank=True,
        null=True,
        help_text=_('Encrypted API secret for Turnitin')
    )
    
    _encrypted_oauth_token = models.TextField(
        'encrypted_oauth_token',
        blank=True,
        null=True,
        help_text=_('Encrypted OAuth access token from Turnitin')
    )
    
    # Token metadata
    oauth_token_expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Expiration time of OAuth token')
    )
    
    # Provisioning status
    is_provisioned = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('User account provisioned in Turnitin system')
    )
    
    provisioned_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Timestamp of provisioning')
    )
    
    # Profile metadata
    turnitin_user_data = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Additional user data from Turnitin API')
    )
    
    # Sync status
    last_synced_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Last synchronization with Turnitin')
    )
    
    sync_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', _('Pending')),
            ('synced', _('Synced')),
            ('failed', _('Failed')),
        ],
        default='pending',
        help_text=_('Current synchronization status')
    )
    
    sync_error_message = models.TextField(
        blank=True,
        null=True,
        help_text=_('Error message from last failed sync attempt')
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    class Meta:
        verbose_name = _('Turnitin profile')
        verbose_name_plural = _('Turnitin profiles')
        indexes = [
            models.Index(fields=['turnitin_user_id']),
            models.Index(fields=['is_provisioned']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Turnitin Profile: {self.user.email}"
    
    @staticmethod
    def _get_cipher():
        """Get encryption cipher using Django SECRET_KEY."""
        key = settings.SECRET_KEY[:32].encode().ljust(32, b'0')
        cipher_key = Fernet.generate_key()
        # Use a constant key derived from SECRET_KEY for consistency
        import hashlib
        derived_key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        from base64 import urlsafe_b64encode
        cipher_key = urlsafe_b64encode(derived_key)
        return Fernet(cipher_key)
    
    def _encrypt_value(self, value):
        """Encrypt a sensitive value."""
        if not value:
            return None
        try:
            cipher = self._get_cipher()
            encrypted = cipher.encrypt(str(value).encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            return None
    
    def _decrypt_value(self, encrypted_value):
        """Decrypt a sensitive value."""
        if not encrypted_value:
            return None
        try:
            cipher = self._get_cipher()
            decrypted = cipher.decrypt(encrypted_value.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            return None
    
    @property
    def api_key(self):
        """Get decrypted API key."""
        return self._decrypt_value(self._encrypted_api_key)
    
    @api_key.setter
    def api_key(self, value):
        """Set encrypted API key."""
        self._encrypted_api_key = self._encrypt_value(value)
    
    @property
    def api_secret(self):
        """Get decrypted API secret."""
        return self._decrypt_value(self._encrypted_api_secret)
    
    @api_secret.setter
    def api_secret(self, value):
        """Set encrypted API secret."""
        self._encrypted_api_secret = self._encrypt_value(value)
    
    @property
    def oauth_token(self):
        """Get decrypted OAuth token."""
        return self._decrypt_value(self._encrypted_oauth_token)
    
    @oauth_token.setter
    def oauth_token(self, value):
        """Set encrypted OAuth token."""
        self._encrypted_oauth_token = self._encrypt_value(value)
    
    def mark_provisioned(self):
        """Mark user as successfully provisioned in Turnitin."""
        from django.utils import timezone
        self.is_provisioned = True
        self.provisioned_at = timezone.now()
        self.sync_status = 'synced'
        self.sync_error_message = None
        self.save()
    
    def mark_sync_failed(self, error_message):
        """Mark synchronization as failed."""
        self.sync_status = 'failed'
        self.sync_error_message = error_message[:500]  # Limit message length
        self.save()


class SubmissionMetadata(models.Model):
    """
    Tracks submission metadata and Turnitin API responses.
    Used for auditing and report retrieval.
    """
    
    # Submission identifiers
    turnitin_submission_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text=_('Unique submission ID from Turnitin API')
    )
    
    turnitin_profile = models.ForeignKey(
        TurnitinProfile,
        on_delete=models.CASCADE,
        related_name='submissions',
        help_text=_('Associated Turnitin profile')
    )
    
    # Submission details
    filename = models.CharField(
        max_length=255,
        help_text=_('Original filename')
    )
    
    file_size = models.BigIntegerField(
        help_text=_('File size in bytes')
    )
    
    content_type = models.CharField(
        max_length=50,
        help_text=_('MIME type of submitted file')
    )
    
    # Submission status
    status = models.CharField(
        max_length=20,
        choices=[
            ('submitted', _('Submitted')),
            ('processing', _('Processing')),
            ('complete', _('Complete')),
            ('failed', _('Failed')),
        ],
        default='submitted',
        db_index=True
    )
    
    # Report data
    similarity_score = models.FloatField(
        null=True,
        blank=True,
        help_text=_('Similarity percentage from Turnitin')
    )
    
    report_url = models.URLField(
        blank=True,
        null=True,
        validators=[URLValidator()],
        help_text=_('URL to Turnitin similarity report')
    )
    
    pdf_report_url = models.URLField(
        blank=True,
        null=True,
        validators=[URLValidator()],
        help_text=_('URL to downloadable PDF report')
    )
    
    # Metadata
    submission_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Additional metadata from submission')
    )
    
    turnitin_response = models.JSONField(
        default=dict,
        blank=True,
        help_text=_('Full Turnitin API response (stored for auditing)')
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text=_('Error message if submission failed')
    )
    
    # Timestamps
    submitted_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    processed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text=_('Timestamp when report became available')
    )
    
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    class Meta:
        verbose_name = _('submission metadata')
        verbose_name_plural = _('submission metadata')
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['turnitin_submission_id']),
            models.Index(fields=['turnitin_profile', 'submitted_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Submission: {self.filename} ({self.turnitin_submission_id})"
