"""
Task monitoring models for Celery background jobs.

This module provides database models for tracking Celery task execution,
status, and results. It enables real-time monitoring of async operations.
"""

from django.db import models
from django.contrib.auth import get_user_model
import uuid
from datetime import timedelta
from django.utils import timezone

User = get_user_model()


class TaskResult(models.Model):
    """
    Model for tracking Celery task execution and results.
    
    Stores task metadata, execution status, timing, and result data
    for comprehensive monitoring and debugging.
    """
    
    TASK_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('started', 'Started'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('retry', 'Retry'),
        ('revoked', 'Revoked'),
    ]
    
    # Primary identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.CharField(max_length=255, unique=True, db_index=True)
    task_name = models.CharField(max_length=255, db_index=True)
    
    # User and context
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    
    # Status tracking
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='pending', db_index=True)
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Duration tracking
    def get_duration(self):
        """Get task execution duration in seconds."""
        start = self.started_at or self.created_at
        end = self.completed_at or timezone.now()
        return (end - start).total_seconds()
    
    # Results and errors
    result = models.JSONField(null=True, blank=True, help_text="Task result data")
    error_message = models.TextField(blank=True, help_text="Error message if task failed")
    traceback = models.TextField(blank=True, help_text="Full error traceback")
    
    # Arguments and context
    args = models.JSONField(default=list, help_text="Task positional arguments")
    kwargs = models.JSONField(default=dict, help_text="Task keyword arguments")
    
    # Retry information
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    is_retryable = models.BooleanField(default=True)
    
    # Metadata
    queue = models.CharField(max_length=100, default='default', db_index=True)
    priority = models.IntegerField(default=0)
    
    # Relations
    related_submission_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task_id']),
            models.Index(fields=['task_name']),
            models.Index(fields=['status']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Task Result'
        verbose_name_plural = 'Task Results'
    
    def __str__(self):
        return f"{self.task_name} ({self.status})"
    
    def is_pending(self):
        """Check if task is still pending."""
        return self.status in ['pending', 'started', 'running']
    
    def is_completed(self):
        """Check if task has completed (success or failure)."""
        return self.status in ['success', 'failure', 'revoked']
    
    def is_failed(self):
        """Check if task failed."""
        return self.status == 'failure'
    
    def is_successful(self):
        """Check if task succeeded."""
        return self.status == 'success'
    
    def can_retry(self):
        """Check if task can be retried."""
        return (
            self.is_retryable
            and self.retry_count < self.max_retries
            and self.is_failed()
        )
    
    def mark_started(self):
        """Mark task as started."""
        self.status = 'started'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_running(self):
        """Mark task as running."""
        self.status = 'running'
        self.save(update_fields=['status'])
    
    def mark_success(self, result=None):
        """Mark task as successful."""
        self.status = 'success'
        self.completed_at = timezone.now()
        if result is not None:
            self.result = result
        self.progress = 100
        self.save(update_fields=['status', 'completed_at', 'result', 'progress'])
    
    def mark_failure(self, error_message=None, traceback_str=None):
        """Mark task as failed."""
        self.status = 'failure'
        self.completed_at = timezone.now()
        if error_message:
            self.error_message = error_message
        if traceback_str:
            self.traceback = traceback_str
        self.save(update_fields=['status', 'completed_at', 'error_message', 'traceback'])
    
    def mark_retry(self):
        """Mark task as pending retry."""
        self.status = 'retry'
        self.retry_count += 1
        self.save(update_fields=['status', 'retry_count'])
    
    def mark_revoked(self):
        """Mark task as revoked."""
        self.status = 'revoked'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])
    
    def set_progress(self, percentage):
        """Update task progress."""
        self.progress = min(100, max(0, percentage))
        self.save(update_fields=['progress'])


class TaskQueue(models.Model):
    """
    Model for tracking task queue information.
    
    Monitors queue depth and configuration.
    """
    
    name = models.CharField(max_length=100, unique=True, primary_key=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    max_tasks = models.IntegerField(default=1000)
    current_count = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Task Queue'
        verbose_name_plural = 'Task Queues'
    
    def __str__(self):
        return f"{self.name} ({self.current_count}/{self.max_tasks})"


class TaskEvent(models.Model):
    """
    Model for storing task lifecycle events.
    
    Records detailed events during task execution for audit trails.
    """
    
    EVENT_TYPES = [
        ('created', 'Created'),
        ('sent', 'Sent'),
        ('received', 'Received'),
        ('started', 'Started'),
        ('progress', 'Progress Update'),
        ('retry', 'Retry Scheduled'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('revoked', 'Revoked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(TaskResult, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['task', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.task.task_name} - {self.event_type}"
