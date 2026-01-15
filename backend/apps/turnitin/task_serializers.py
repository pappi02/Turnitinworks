"""
Serializers for task monitoring and status tracking.

Provides REST API serialization for Celery task results and monitoring data.
"""

from rest_framework import serializers
from .task_models import TaskResult, TaskQueue, TaskEvent
from datetime import timedelta


class TaskEventSerializer(serializers.ModelSerializer):
    """Serializer for task lifecycle events."""
    
    class Meta:
        model = TaskEvent
        fields = ['id', 'event_type', 'timestamp', 'message', 'metadata']
        read_only_fields = ['id', 'timestamp']


class TaskResultSerializer(serializers.ModelSerializer):
    """Detailed serializer for task results with full information."""
    
    duration = serializers.SerializerMethodField()
    events = TaskEventSerializer(many=True, read_only=True)
    can_retry = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskResult
        fields = [
            'id', 'task_id', 'task_name', 'status', 'progress',
            'created_at', 'started_at', 'completed_at', 'duration',
            'result', 'error_message', 'retry_count', 'max_retries',
            'can_retry', 'queue', 'priority', 'events'
        ]
        read_only_fields = [
            'id', 'task_id', 'created_at', 'started_at', 'completed_at',
            'duration', 'error_message', 'retry_count', 'events'
        ]
    
    def get_duration(self, obj):
        """Get task duration in seconds."""
        return obj.get_duration()
    
    def get_can_retry(self, obj):
        """Check if task can be retried."""
        return obj.can_retry()


class TaskResultListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for task list views."""
    
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskResult
        fields = [
            'id', 'task_id', 'task_name', 'status', 'progress',
            'created_at', 'completed_at', 'duration', 'queue'
        ]
        read_only_fields = fields
    
    def get_duration(self, obj):
        """Get task duration in seconds."""
        return obj.get_duration()


class TaskQueueSerializer(serializers.ModelSerializer):
    """Serializer for task queue information."""
    
    utilization = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskQueue
        fields = ['name', 'description', 'is_active', 'max_tasks', 'current_count', 'utilization']
        read_only_fields = fields
    
    def get_utilization(self, obj):
        """Get queue utilization percentage."""
        if obj.max_tasks == 0:
            return 0
        return round((obj.current_count / obj.max_tasks) * 100, 2)


class TaskStatusSummarySerializer(serializers.Serializer):
    """Serializer for task status summary dashboard."""
    
    total_tasks = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    running_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    successful_tasks = serializers.IntegerField()
    failed_tasks = serializers.IntegerField()
    success_rate = serializers.FloatField()
    average_duration = serializers.FloatField()
    recent_tasks = TaskResultListSerializer(many=True)
    queues = TaskQueueSerializer(many=True)


class TaskRetryRequestSerializer(serializers.Serializer):
    """Serializer for task retry requests."""
    
    task_id = serializers.CharField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_task_id(self, value):
        """Validate that task exists."""
        try:
            TaskResult.objects.get(task_id=value)
        except TaskResult.DoesNotExist:
            raise serializers.ValidationError(f"Task with ID '{value}' not found.")
        return value


class TaskCancelRequestSerializer(serializers.Serializer):
    """Serializer for task cancellation requests."""
    
    task_id = serializers.CharField(required=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_task_id(self, value):
        """Validate that task exists."""
        try:
            TaskResult.objects.get(task_id=value)
        except TaskResult.DoesNotExist:
            raise serializers.ValidationError(f"Task with ID '{value}' not found.")
        return value
