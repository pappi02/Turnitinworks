"""
Django admin configuration for task monitoring models.

Provides admin interface for viewing and managing task results,
queues, and events.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count
from .task_models import TaskResult, TaskQueue, TaskEvent


@admin.register(TaskResult)
class TaskResultAdmin(admin.ModelAdmin):
    """Admin interface for TaskResult model."""
    
    list_display = [
        'task_name', 'task_id_short', 'status_badge', 'progress_bar',
        'user', 'created_at', 'duration'
    ]
    
    list_filter = ['status', 'task_name', 'created_at', 'queue']
    search_fields = ['task_id', 'task_name', 'user__email']
    readonly_fields = [
        'id', 'task_id', 'created_at', 'started_at', 'completed_at',
        'error_message', 'traceback', 'task_name', 'result'
    ]
    
    fieldsets = (
        ('Task Information', {
            'fields': ('id', 'task_id', 'task_name', 'status', 'queue')
        }),
        ('User & Context', {
            'fields': ('user', 'related_submission_id')
        }),
        ('Timing', {
            'fields': ('created_at', 'started_at', 'completed_at')
        }),
        ('Progress & Result', {
            'fields': ('progress', 'result')
        }),
        ('Retry Information', {
            'fields': ('retry_count', 'max_retries', 'is_retryable')
        }),
        ('Arguments', {
            'fields': ('args', 'kwargs'),
            'classes': ('collapse',)
        }),
        ('Error Details', {
            'fields': ('error_message', 'traceback'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_success', 'mark_failure', 'clear_error_message']
    
    def task_id_short(self, obj):
        """Display short task ID."""
        return obj.task_id[:12] + '...' if len(obj.task_id) > 12 else obj.task_id
    task_id_short.short_description = 'Task ID'
    
    def status_badge(self, obj):
        """Display status as colored badge."""
        colors = {
            'pending': '#FFA500',
            'started': '#1E90FF',
            'running': '#00BFFF',
            'success': '#32CD32',
            'failure': '#FF4500',
            'retry': '#FFD700',
            'revoked': '#808080',
        }
        color = colors.get(obj.status, '#888888')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def progress_bar(self, obj):
        """Display progress as visual bar."""
        progress = obj.progress
        color = '#32CD32' if progress == 100 else '#FFA500' if progress >= 50 else '#FF4500'
        return format_html(
            '<div style="width: 100px; height: 20px; background-color: #E0E0E0; '
            'border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; height: 100%; background-color: {}; '
            'text-align: center; color: white; font-size: 12px;">'
            '{}%</div></div>',
            progress, color, progress
        )
    progress_bar.short_description = 'Progress'
    
    def duration(self, obj):
        """Display task duration."""
        if obj.is_completed():
            duration = obj.get_duration()
            return f"{duration:.2f}s"
        return "In Progress"
    duration.short_description = 'Duration'
    
    def mark_success(self, request, queryset):
        """Mark selected tasks as successful."""
        updated = queryset.update(status='success')
        self.message_user(request, f'{updated} tasks marked as successful.')
    mark_success.short_description = "Mark selected as successful"
    
    def mark_failure(self, request, queryset):
        """Mark selected tasks as failed."""
        updated = queryset.update(status='failure')
        self.message_user(request, f'{updated} tasks marked as failed.')
    mark_failure.short_description = "Mark selected as failed"
    
    def clear_error_message(self, request, queryset):
        """Clear error messages for selected tasks."""
        updated = queryset.update(error_message='', traceback='')
        self.message_user(request, f'Cleared errors for {updated} tasks.')
    clear_error_message.short_description = "Clear error messages"
    
    def has_delete_permission(self, request):
        """Prevent deletion of task records."""
        return False


@admin.register(TaskQueue)
class TaskQueueAdmin(admin.ModelAdmin):
    """Admin interface for TaskQueue model."""
    
    list_display = ['name', 'description', 'is_active', 'utilization_bar', 'current_count', 'max_tasks']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['current_count', 'last_updated']
    
    def utilization_bar(self, obj):
        """Display queue utilization as visual bar."""
        if obj.max_tasks == 0:
            utilization = 0
        else:
            utilization = int((obj.current_count / obj.max_tasks) * 100)
        
        color = '#32CD32' if utilization < 50 else '#FFA500' if utilization < 80 else '#FF4500'
        return format_html(
            '<div style="width: 150px; height: 20px; background-color: #E0E0E0; '
            'border-radius: 3px; overflow: hidden;">'
            '<div style="width: {}%; height: 100%; background-color: {}; '
            'text-align: center; color: white; font-size: 12px;">'
            '{}%</div></div>',
            utilization, color, utilization
        )
    utilization_bar.short_description = 'Utilization'


@admin.register(TaskEvent)
class TaskEventAdmin(admin.ModelAdmin):
    """Admin interface for TaskEvent model."""
    
    list_display = ['task_name', 'event_type', 'timestamp', 'message']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['task__task_name', 'message']
    readonly_fields = ['id', 'task', 'timestamp', 'event_type', 'message', 'metadata']
    
    def task_name(self, obj):
        """Get task name from related task."""
        return obj.task.task_name
    task_name.short_description = 'Task Name'
    
    def has_add_permission(self, request):
        """Prevent manual creation of events."""
        return False
    
    def has_delete_permission(self, request):
        """Prevent deletion of event records."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing of event records."""
        return False
