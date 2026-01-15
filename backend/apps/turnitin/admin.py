"""
Django admin configuration for Turnitin integration.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from apps.turnitin.models import TurnitinProfile, SubmissionMetadata
from apps.turnitin.task_admin import TaskResultAdmin, TaskQueueAdmin, TaskEventAdmin


@admin.register(TurnitinProfile)
class TurnitinProfileAdmin(admin.ModelAdmin):
    """Admin interface for TurnitinProfile model."""
    
    list_display = ('user_email', 'turnitin_user_id', 'is_provisioned', 'sync_status', 'provisioned_at')
    list_filter = ('is_provisioned', 'sync_status', 'provisioned_at', 'created_at')
    search_fields = ('user__email', 'turnitin_user_id')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'user', 'turnitin_user_id', 'created_at', 'updated_at', 'provisioned_at', 'last_synced_at')
    
    fieldsets = (
        (_('User Information'), {
            'fields': ('user', 'id')
        }),
        (_('Turnitin Identifiers'), {
            'fields': ('turnitin_user_id', 'turnitin_class_id')
        }),
        (_('Provisioning Status'), {
            'fields': ('is_provisioned', 'provisioned_at'),
        }),
        (_('Synchronization'), {
            'fields': ('sync_status', 'last_synced_at', 'sync_error_message'),
        }),
        (_('Turnitin Metadata'), {
            'fields': ('turnitin_user_data',),
            'classes': ('collapse',)
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = _('User Email')
    
    def has_add_permission(self, request):
        # Prevent manual creation; profiles are created during user signup
        return False


@admin.register(SubmissionMetadata)
class SubmissionMetadataAdmin(admin.ModelAdmin):
    """Admin interface for SubmissionMetadata model."""
    
    list_display = ('filename', 'turnitin_profile_user', 'status', 'similarity_score', 'submitted_at')
    list_filter = ('status', 'submitted_at', 'processed_at')
    search_fields = ('filename', 'turnitin_submission_id', 'turnitin_profile__user__email')
    ordering = ('-submitted_at',)
    readonly_fields = (
        'turnitin_submission_id', 'turnitin_profile', 'submitted_at', 'updated_at',
        'turnitin_response'
    )
    
    fieldsets = (
        (_('Submission'), {
            'fields': ('turnitin_submission_id', 'turnitin_profile', 'filename', 'file_size', 'content_type')
        }),
        (_('Status'), {
            'fields': ('status', 'error_message')
        }),
        (_('Results'), {
            'fields': ('similarity_score', 'report_url', 'pdf_report_url', 'processed_at')
        }),
        (_('Metadata'), {
            'fields': ('submission_metadata', 'turnitin_response'),
            'classes': ('collapse',)
        }),
        (_('Timestamps'), {
            'fields': ('submitted_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def turnitin_profile_user(self, obj):
        return obj.turnitin_profile.user.email
    turnitin_profile_user.short_description = _('User')
    
    def has_add_permission(self, request):
        # Prevent manual creation
        return False
