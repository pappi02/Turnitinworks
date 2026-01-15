"""
Celery signals for automatic task tracking and monitoring.

Connects to Celery task lifecycle events to automatically create and update
TaskResult records without requiring manual instrumentation.
"""

from celery import signals
from celery.utils.nodenames import worker_direct
from django.utils import timezone
from .task_models import TaskResult, TaskEvent
import logging

logger = logging.getLogger(__name__)


@signals.before_task_publish.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **details):
    """
    Signal handler for task_prerun event.
    
    Fired when a task is about to be executed.
    Creates TaskResult record if it doesn't exist.
    """
    try:
        if task and task_id:
            task_result, created = TaskResult.objects.get_or_create(
                task_id=task_id,
                defaults={
                    'task_name': task.name,
                    'status': 'sent',
                    'args': list(args) if args else [],
                    'kwargs': kwargs if kwargs else {},
                }
            )
            
            if created:
                TaskEvent.objects.create(
                    task=task_result,
                    event_type='sent',
                    message='Task sent to queue',
                    metadata={
                        'queue': details.get('queue', 'unknown'),
                        'exchange': details.get('exchange', 'unknown'),
                        'routing_key': details.get('routing_key', 'unknown'),
                    }
                )
                logger.info(f"Task {task_id} ({task.name}) sent to queue")
    
    except Exception as e:
        logger.error(f"Error in task_prerun_handler: {str(e)}")


@signals.task_prerun.connect
def task_started_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwargs_extra):
    """
    Signal handler for task_prerun event in worker.
    
    Fired when a task is about to be executed on the worker.
    """
    try:
        task_result, _ = TaskResult.objects.get_or_create(
            task_id=task_id,
            defaults={
                'task_name': task.name if task else 'unknown',
                'status': 'started',
            }
        )
        
        task_result.mark_started()
        
        TaskEvent.objects.create(
            task=task_result,
            event_type='started',
            message='Task execution started on worker',
            metadata={
                'worker': kwargs_extra.get('hostname', 'unknown'),
                'pid': kwargs_extra.get('pid'),
            }
        )
        
        logger.info(f"Task {task_id} started execution")
    
    except Exception as e:
        logger.error(f"Error in task_started_handler: {str(e)}")


@signals.task_postrun.connect
def task_success_handler(sender=None, task_id=None, task=None, result=None, state=None, **kwargs):
    """
    Signal handler for task_postrun event (success).
    
    Fired when a task completes successfully.
    """
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        task_result.mark_success(result=result)
        
        TaskEvent.objects.create(
            task=task_result,
            event_type='succeeded',
            message='Task completed successfully',
            metadata={
                'result_type': type(result).__name__ if result else 'None',
            }
        )
        
        logger.info(f"Task {task_id} completed successfully")
    
    except TaskResult.DoesNotExist:
        # Task may not have been tracked, create it now
        try:
            task_result = TaskResult.objects.create(
                task_id=task_id,
                task_name=task.name if task else 'unknown',
                status='success',
                completed_at=timezone.now(),
                result=result,
            )
            logger.info(f"Created missing TaskResult record for {task_id}")
        except Exception as e:
            logger.error(f"Error creating TaskResult for {task_id}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in task_success_handler: {str(e)}")


@signals.task_failure.connect
def task_failure_handler(sender=None, task_id=None, task=None, exception=None, traceback=None, **kwargs):
    """
    Signal handler for task_failure event.
    
    Fired when a task raises an exception.
    """
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        task_result.mark_failure(
            error_message=str(exception),
            traceback_str=traceback if isinstance(traceback, str) else str(traceback)
        )
        
        TaskEvent.objects.create(
            task=task_result,
            event_type='failed',
            message=f'Task failed with error: {str(exception)[:100]}',
            metadata={
                'exception_type': type(exception).__name__ if exception else 'Unknown',
                'exception_str': str(exception)[:200],
            }
        )
        
        logger.error(f"Task {task_id} failed: {str(exception)}")
    
    except TaskResult.DoesNotExist:
        # Task may not have been tracked, create it now
        try:
            task_result = TaskResult.objects.create(
                task_id=task_id,
                task_name=task.name if task else 'unknown',
                status='failure',
                completed_at=timezone.now(),
                error_message=str(exception),
                traceback=traceback if isinstance(traceback, str) else str(traceback),
            )
            logger.info(f"Created missing TaskResult record for failed task {task_id}")
        except Exception as e:
            logger.error(f"Error creating TaskResult for {task_id}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in task_failure_handler: {str(e)}")


@signals.task_revoked.connect
def task_revoked_handler(sender=None, task_id=None, request=None, **kwargs):
    """
    Signal handler for task_revoked event.
    
    Fired when a task is revoked/cancelled.
    """
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        task_result.mark_revoked()
        
        TaskEvent.objects.create(
            task=task_result,
            event_type='revoked',
            message='Task was revoked/cancelled',
            metadata={
                'reason': kwargs.get('reason', 'unknown'),
            }
        )
        
        logger.info(f"Task {task_id} was revoked")
    
    except TaskResult.DoesNotExist:
        logger.debug(f"Task {task_id} revoked but no tracking record found")
    
    except Exception as e:
        logger.error(f"Error in task_revoked_handler: {str(e)}")


@signals.task_retry.connect
def task_retry_handler(sender=None, task_id=None, task=None, reason=None, einfo=None, **kwargs):
    """
    Signal handler for task retry.
    
    Fired when a task is being retried.
    """
    try:
        task_result = TaskResult.objects.get(task_id=task_id)
        task_result.mark_retry()
        
        TaskEvent.objects.create(
            task=task_result,
            event_type='retry',
            message=f'Task retry scheduled: {str(reason)[:100]}',
            metadata={
                'reason': str(reason),
            }
        )
        
        logger.info(f"Task {task_id} scheduled for retry: {str(reason)}")
    
    except TaskResult.DoesNotExist:
        logger.debug(f"Task {task_id} retry but no tracking record found")
    
    except Exception as e:
        logger.error(f"Error in task_retry_handler: {str(e)}")
