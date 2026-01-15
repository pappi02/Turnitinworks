"""
Models for document submissions.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _
import uuid

User = get_user_model()


class Submission(models.Model):
    """
    Stores document submissions for plagiarism checking.
    """
    
    # Identifiers
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='submissions',
        help_text='User who submitted the document'
    )
    
    # File information
    document = models.FileField(
        upload_to='submissions/%Y/%m/%d/',
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt']
        )],
        help_text='Submitted document file'
    )
    
    original_filename = models.CharField(
        max_length=255,
        help_text='Original filename at submission'
    )
    
    file_size = models.BigIntegerField(
        help_text='File size in bytes'
    )
    
    content_type = models.CharField(
        max_length=50,
        help_text='MIME type of file'
    )
    
    # Submission metadata
    title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Document title/subject'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        help_text='Submission notes or description'
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[
            ('uploaded', 'Uploaded'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='uploaded',
        db_index=True
    )
    
    # Turnitin relationship
    turnitin_submission_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text='Associated Turnitin submission ID'
    )
    
    similarity_score = models.FloatField(
        null=True,
        blank=True,
        help_text='Similarity percentage'
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text='Error message if processing failed'
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When report was completed'
    )
    
    class Meta:
        verbose_name = 'Submission'
        verbose_name_plural = 'Submissions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['turnitin_submission_id']),
        ]
    
    def __str__(self):
        return f"{self.original_filename} - {self.user.email}"
