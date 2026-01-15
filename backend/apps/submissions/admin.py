"""
Django admin configuration for submissions app.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from apps.submissions.models import Submission


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    """Admin interface for Submission model."""
    
    list_display = ('original_filename', 'user_email', 'status', 'similarity_score', 'created_at')
    list_filter = ('status', 'created_at', 'processed_at')
    search_fields = ('original_filename', 'user__email', 'turnitin_submission_id')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'document', 'user', 'created_at', 'updated_at', 'processed_at')
    
    fieldsets = (
        (_('Submission'), {
            'fields': ('id', 'user', 'document', 'original_filename')
        }),
        (_('File Information'), {
            'fields': ('file_size', 'content_type'),
            'classes': ('collapse',)
        }),
        (_('Details'), {
            'fields': ('title', 'description')
        }),
        (_('Status'), {
            'fields': ('status', 'turnitin_submission_id')
        }),
        (_('Results'), {
            'fields': ('similarity_score', 'processed_at')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = _('User Email')
