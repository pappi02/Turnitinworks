"""
Views for Celery task monitoring and management.

Provides REST API endpoints for real-time monitoring of async background tasks,
task status tracking, retry management, and comprehensive task analytics.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count, Avg, F
from django.db.models.functions import Cast, TruncDate
from django.db import models as django_models
from datetime import timedelta
from celery.app.control import Inspect

from .task_models import TaskResult, TaskQueue, TaskEvent
from .task_serializers import (
    TaskResultSerializer, TaskResultListSerializer, TaskQueueSerializer,
    TaskStatusSummarySerializer, TaskRetryRequestSerializer,
    TaskCancelRequestSerializer
)
from config.exceptions import ResourceNotFoundError, SubmissionError, ServiceUnavailableError


class TaskMonitoringViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for monitoring and managing Celery tasks.
    
    Provides comprehensive task monitoring with filtering, statistics,
    and management capabilities.
    """
    
    queryset = TaskResult.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return TaskResultListSerializer
        elif self.action == 'retrieve':
            return TaskResultSerializer
        elif self.action == 'summary':
            return TaskStatusSummarySerializer
        return TaskResultSerializer
    
    def get_queryset(self):
        """
        Filter tasks based on user and query parameters.
        
        - own: Only user's tasks (default: True)
        - status: Filter by status
        - task_name: Filter by task name
        - created_after: Filter by creation date
        """
        queryset = TaskResult.objects.all()
        
        # Filter by user's own tasks by default
        if self.request.user and not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        
        # Optional filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        task_name = self.request.query_params.get('task_name')
        if task_name:
            queryset = queryset.filter(task_name__icontains=task_name)
        
        created_after = self.request.query_params.get('created_after')
        if created_after:
            try:
                date = timezone.datetime.fromisoformat(created_after)
                queryset = queryset.filter(created_at__gte=date)
            except (ValueError, TypeError):
                pass
        
        return queryset.prefetch_related('events').order_by('-created_at')
    
    def retrieve(self, request, *args, **kwargs):
        """Get detailed task information."""
        try:
            return super().retrieve(request, *args, **kwargs)
        except TaskResult.DoesNotExist:
            raise ResourceNotFoundError(f"Task not found")
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get overall task statistics and summary.
        
        Returns:
        - Total task counts by status
        - Success/failure rates
        - Average task duration
        - Recent tasks
        - Queue information
        """
        queryset = self.get_queryset()
        
        # Calculate statistics
        total_tasks = queryset.count()
        pending_tasks = queryset.filter(status__in=['pending', 'started', 'running']).count()
        running_tasks = queryset.filter(status='running').count()
        completed_tasks = queryset.filter(status__in=['success', 'failure', 'revoked']).count()
        successful_tasks = queryset.filter(status='success').count()
        failed_tasks = queryset.filter(status='failure').count()
        
        # Calculate success rate
        if completed_tasks > 0:
            success_rate = (successful_tasks / completed_tasks) * 100
        else:
            success_rate = 0
        
        # Calculate average duration
        durations = []
        for task in queryset.filter(status='success'):
            duration = task.get_duration()
            if duration is not None:
                durations.append(duration)
        
        average_duration = sum(durations) / len(durations) if durations else 0
        
        # Get recent tasks
        recent_tasks = queryset[:10]
        
        # Get queue information
        queues = TaskQueue.objects.all()
        
        summary_data = {
            'total_tasks': total_tasks,
            'pending_tasks': pending_tasks,
            'running_tasks': running_tasks,
            'completed_tasks': completed_tasks,
            'successful_tasks': successful_tasks,
            'failed_tasks': failed_tasks,
            'success_rate': round(success_rate, 2),
            'average_duration': round(average_duration, 2),
            'recent_tasks': recent_tasks,
            'queues': queues,
        }
        
        serializer = self.get_serializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_status(self, request):
        """
        Get tasks grouped by status with counts.
        
        Returns counts and sample tasks for each status.
        """
        queryset = self.get_queryset()
        
        status_groups = {}
        for status_choice in TaskResult.TASK_STATUS_CHOICES:
            status_key = status_choice[0]
            tasks = queryset.filter(status=status_key)
            status_groups[status_key] = {
                'count': tasks.count(),
                'sample_tasks': TaskResultListSerializer(
                    tasks[:3], many=True
                ).data
            }
        
        return Response(status_groups)
    
    @action(detail=False, methods=['get'])
    def by_name(self, request):
        """
        Get tasks grouped by task name with statistics.
        
        Returns count, success rate, and average duration per task type.
        """
        queryset = self.get_queryset()
        
        task_names = queryset.values('task_name').distinct()
        task_stats = {}
        
        for task_obj in task_names:
            task_name = task_obj['task_name']
            tasks = queryset.filter(task_name=task_name)
            total = tasks.count()
            successful = tasks.filter(status='success').count()
            failed = tasks.filter(status='failure').count()
            
            # Calculate success rate
            completed = tasks.filter(status__in=['success', 'failure', 'revoked']).count()
            success_rate = (successful / completed * 100) if completed > 0 else 0
            
            # Calculate average duration
            durations = []
            for task in tasks.filter(status='success'):
                duration = task.get_duration()
                if duration:
                    durations.append(duration)
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            task_stats[task_name] = {
                'total': total,
                'successful': successful,
                'failed': failed,
                'success_rate': round(success_rate, 2),
                'average_duration': round(avg_duration, 2),
            }
        
        return Response(task_stats)
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """
        Retry a failed task.
        
        Only allows retry for failed tasks that haven't exceeded max retries.
        """
        try:
            task = self.get_object()
        except TaskResult.DoesNotExist:
            raise ResourceNotFoundError("Task not found")
        
        serializer = TaskRetryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validate task can be retried
        if not task.can_retry():
            return Response(
                {
                    'success': False,
                    'detail': f'Task cannot be retried. Status: {task.status}, Retries: {task.retry_count}/{task.max_retries}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Queue retry task
        from celery import current_app
        try:
            task.mark_retry()
            
            # Re-queue task with original arguments
            current_app.send_task(
                task.task_name,
                args=task.args,
                kwargs=task.kwargs,
                queue=task.queue,
                priority=task.priority
            )
            
            TaskEvent.objects.create(
                task=task,
                event_type='retry',
                message=f'Task retry #{task.retry_count} queued',
                metadata={'reason': serializer.validated_data.get('reason', '')}
            )
            
            return Response({
                'success': True,
                'detail': f'Task queued for retry (attempt {task.retry_count})',
                'task': TaskResultSerializer(task).data
            })
        
        except Exception as e:
            raise ServiceUnavailableError(f"Failed to queue task retry: {str(e)}")
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a pending or running task.
        
        Only allows cancellation for tasks that haven't completed.
        """
        try:
            task = self.get_object()
        except TaskResult.DoesNotExist:
            raise ResourceNotFoundError("Task not found")
        
        serializer = TaskCancelRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Only allow cancellation of non-completed tasks
        if task.is_completed():
            return Response(
                {
                    'success': False,
                    'detail': f'Cannot cancel completed task with status: {task.status}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from celery.app.control import revoke
            
            # Revoke the Celery task
            revoke(task.task_id, terminate=True)
            task.mark_revoked()
            
            TaskEvent.objects.create(
                task=task,
                event_type='revoked',
                message='Task cancelled by user',
                metadata={'reason': serializer.validated_data.get('reason', '')}
            )
            
            return Response({
                'success': True,
                'detail': 'Task cancelled successfully',
                'task': TaskResultSerializer(task).data
            })
        
        except Exception as e:
            raise ServiceUnavailableError(f"Failed to cancel task: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def user_stats(self, request):
        """
        Get current user's task statistics.
        
        Returns comprehensive stats for logged-in user's tasks.
        """
        queryset = TaskResult.objects.filter(user=request.user)
        
        stats = {
            'total_tasks': queryset.count(),
            'pending': queryset.filter(status__in=['pending', 'started']).count(),
            'running': queryset.filter(status='running').count(),
            'completed': queryset.filter(status__in=['success', 'failure', 'revoked']).count(),
            'successful': queryset.filter(status='success').count(),
            'failed': queryset.filter(status='failure').count(),
            'success_rate': 0,
            'recent_failed': TaskResultListSerializer(
                queryset.filter(status='failure').order_by('-completed_at')[:5],
                many=True
            ).data,
        }
        
        # Calculate success rate
        completed = queryset.filter(status__in=['success', 'failure', 'revoked']).count()
        if completed > 0:
            stats['success_rate'] = round(
                (queryset.filter(status='success').count() / completed) * 100, 2
            )
        
        return Response(stats)
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get event history for a specific task."""
        try:
            task = self.get_object()
        except TaskResult.DoesNotExist:
            raise ResourceNotFoundError("Task not found")
        
        events = task.events.all().order_by('-timestamp')
        serializer = TaskResultSerializer(task).data
        serializer['events'] = [
            {
                'id': event.id,
                'event_type': event.event_type,
                'timestamp': event.timestamp,
                'message': event.message,
                'metadata': event.metadata,
            }
            for event in events
        ]
        
        return Response(serializer)


class TaskQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for monitoring Celery task queues.
    
    Provides queue status, depth, and configuration information.
    """
    
    queryset = TaskQueue.objects.all()
    serializer_class = TaskQueueSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get status of all task queues."""
        queues = self.get_queryset()
        
        queue_data = []
        for queue in queues:
            queue_data.append({
                'name': queue.name,
                'description': queue.description,
                'is_active': queue.is_active,
                'current_count': queue.current_count,
                'max_tasks': queue.max_tasks,
                'utilization': round((queue.current_count / queue.max_tasks * 100), 2) if queue.max_tasks > 0 else 0,
            })
        
        total_tasks = sum(q['current_count'] for q in queue_data)
        total_capacity = sum(q['max_tasks'] for q in queue_data)
        
        return Response({
            'queues': queue_data,
            'total_tasks': total_tasks,
            'total_capacity': total_capacity,
            'overall_utilization': round((total_tasks / total_capacity * 100), 2) if total_capacity > 0 else 0,
        })
    
    @action(detail=True, methods=['post'])
    def update_count(self, request, pk=None):
        """Update queue task count."""
        queue = self.get_object()
        new_count = request.data.get('current_count', queue.current_count)
        
        queue.current_count = max(0, new_count)
        queue.save(update_fields=['current_count'])
        
        return Response(
            TaskQueueSerializer(queue).data,
            status=status.HTTP_200_OK
        )
