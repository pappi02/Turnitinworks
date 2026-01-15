"""
Celery tasks for Turnitin API operations.
Handles asynchronous user provisioning and document processing.

Tasks:
- provision_turnitin_user: Create user in Turnitin after signup
- submit_document_to_turnitin: Submit document for plagiarism checking
- check_submission_status: Poll for report status
- send_provisioning_email: Welcome email after provisioning
- send_completion_email: Report ready notification
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import logging
from datetime import datetime

from apps.users.models import CustomUser
from .models import TurnitinProfile, SubmissionMetadata
from .services import TurnitinAPIClient, TurnitinAPIError

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def provision_turnitin_user(self, user_id):
    """
    Provision a new user in Turnitin API.
    Called after user registration.
    
    Automatic retries with exponential backoff on failure.
    
    Args:
        user_id: ID of the CustomUser to provision
        
    Returns:
        dict: Contains turnitin_user_id and status
    """
    try:
        user = CustomUser.objects.get(id=user_id)
        logger.info(f"Starting Turnitin provisioning for user: {user.email}")
        
        # Initialize Turnitin API client
        client = TurnitinAPIClient()
        
        # Create user in Turnitin
        try:
            turnitin_response = client.create_user(
                email=user.email,
                first_name=user.first_name or user.username,
                last_name=user.last_name or '',
            )
        except TurnitinAPIError as e:
            logger.error(f"Turnitin API error during provisioning: {str(e)}")
            raise
        
        # Extract Turnitin user ID
        turnitin_user_id = turnitin_response.get('turnitin_user_id')
        if not turnitin_user_id:
            raise TurnitinAPIError('No turnitin_user_id in response')
        
        # Create or update TurnitinProfile
        turnitin_profile, created = TurnitinProfile.objects.get_or_create(
            user=user,
            defaults={
                'turnitin_user_id': turnitin_user_id,
                'turnitin_user_data': turnitin_response.get('user_data', {}),
                'is_provisioned': True,
                'provisioned_at': timezone.now(),
                'sync_status': 'synced',
            }
        )
        
        if not created:
            # Update existing profile
            turnitin_profile.turnitin_user_id = turnitin_user_id
            turnitin_profile.turnitin_user_data = turnitin_response.get('user_data', {})
            turnitin_profile.is_provisioned = True
            turnitin_profile.provisioned_at = timezone.now()
            turnitin_profile.sync_status = 'synced'
            turnitin_profile.sync_error_message = None
            turnitin_profile.save()
        
        logger.info(
            f"✓ Successfully provisioned Turnitin user for {user.email} "
            f"(Turnitin ID: {turnitin_user_id})"
        )
        
        # Send welcome email asynchronously
        send_provisioning_email.delay(user_id)
        
        return {
            'status': 'success',
            'turnitin_user_id': turnitin_user_id,
            'user_id': str(user_id),
            'created': created,
        }
        
    except CustomUser.DoesNotExist:
        logger.error(f"User with ID {user_id} not found")
        return {
            'status': 'error',
            'message': 'User not found',
            'user_id': str(user_id),
        }
        
    except TurnitinAPIError as e:
        logger.warning(f"Turnitin API error (attempt {self.request.retries + 1}): {str(e)}")
        # Exponential backoff: 60s, 120s, 300s
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=countdown)
        
    except Exception as e:
        logger.error(f"Unexpected error provisioning user: {str(e)}", exc_info=True)
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=countdown)


@shared_task(bind=True, max_retries=2)
def send_provisioning_email(self, user_id):
    """
    Send welcome email after successful Turnitin provisioning.
    
    Args:
        user_id: ID of the CustomUser
        
    Returns:
        dict: Email send status
    """
    try:
        user = CustomUser.objects.get(id=user_id)
        
        subject = "Welcome to Turnitin SaaS Platform!"
        message = f"""
Hello {user.first_name or user.username},

Your account has been successfully created and provisioned on the Turnitin platform.
You can now submit documents for plagiarism checking.

Features available:
- Upload documents for plagiarism detection
- View similarity reports instantly
- Download detailed analysis reports
- Track all your submissions

Getting started:
1. Log in to your dashboard
2. Go to "New Submission"
3. Upload your document
4. View your plagiarism report within minutes

If you have any questions, contact our support team.

Best regards,
Turnitin Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        
        logger.info(f"✓ Provisioning email sent to {user.email}")
        return {
            'status': 'sent',
            'email': user.email,
            'user_id': str(user_id),
        }
        
    except CustomUser.DoesNotExist:
        logger.error(f"User {user_id} not found for email")
        return {'status': 'error', 'message': 'User not found'}
        
    except Exception as e:
        logger.error(f"Failed to send provisioning email: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=300)
        return {'status': 'failed', 'error': str(e)}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def submit_document_to_turnitin(self, submission_id):
    """
    Submit a document to Turnitin for plagiarism checking.
    Called when user uploads a document.
    
    Includes automatic retry logic with exponential backoff.
    
    Args:
        submission_id: UUID of the Submission
        
    Returns:
        dict: Submission result with Turnitin ID
    """
    try:
        from apps.submissions.models import Submission
        
        submission = Submission.objects.get(id=submission_id)
        logger.info(f"Starting Turnitin submission for: {submission.original_filename}")
        
        # Validate submission state
        if not submission.document:
            raise ValueError('Submission has no document file')
        
        # Get Turnitin profile
        try:
            turnitin_profile = TurnitinProfile.objects.get(user=submission.user)
        except TurnitinProfile.DoesNotExist:
            raise ValueError(f'User {submission.user.email} not provisioned in Turnitin')
        
        if not turnitin_profile.is_provisioned:
            raise ValueError(f'User not fully provisioned in Turnitin')
        
        # Initialize API client
        client = TurnitinAPIClient()
        
        # Get OAuth token
        token = client.authenticate_oauth()
        
        # Read file content
        with submission.document.open('rb') as f:
            file_content = f.read()
        
        # Submit to Turnitin
        try:
            response = client.submit_document(
                turnitin_user_id=turnitin_profile.turnitin_user_id,
                filename=submission.original_filename,
                file_content=file_content,
                content_type=submission.content_type,
                token=token,
                metadata={
                    'title': submission.title or submission.original_filename,
                    'submitted_by': submission.user.email,
                }
            )
        except TurnitinAPIError as e:
            logger.error(f"Turnitin API submission error: {str(e)}")
            raise
        
        # Extract submission ID
        turnitin_submission_id = response.get('turnitin_submission_id')
        if not turnitin_submission_id:
            raise ValueError('No turnitin_submission_id in response')
        
        # Update submission
        submission.turnitin_submission_id = turnitin_submission_id
        submission.status = 'processing'
        submission.save()
        
        # Create metadata record
        SubmissionMetadata.objects.create(
            turnitin_submission_id=turnitin_submission_id,
            turnitin_profile=turnitin_profile,
            filename=submission.original_filename,
            file_size=submission.file_size,
            content_type=submission.content_type,
            status='submitted',
            submission_metadata={'submission_id': str(submission_id)},
            turnitin_response=response.get('response', {}),
        )
        
        logger.info(
            f"✓ Document submitted to Turnitin "
            f"(File: {submission.original_filename}, "
            f"Turnitin ID: {turnitin_submission_id})"
        )
        
        # Schedule status check (start polling after 5 seconds)
        check_submission_status.apply_async(
            args=[str(submission_id)],
            countdown=5,
        )
        
        return {
            'status': 'submitted',
            'submission_id': str(submission_id),
            'turnitin_submission_id': turnitin_submission_id,
        }
        
    except Submission.DoesNotExist:
        logger.error(f"Submission {submission_id} not found")
        return {'status': 'error', 'message': 'Submission not found'}
        
    except (ValueError, TurnitinAPIError) as e:
        logger.warning(f"Submission error (attempt {self.request.retries + 1}): {str(e)}")
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=countdown)
        
    except Exception as e:
        logger.error(f"Unexpected submission error: {str(e)}", exc_info=True)
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=countdown)


@shared_task(bind=True)
def check_submission_status(self, submission_id, retry_count=0, max_retries=60):
    """
    Poll Turnitin for document processing status.
    
    Automatically retries until report is ready or timeout reached.
    Max 60 retries = 30 minutes with 30-second intervals.
    
    Args:
        submission_id: UUID of the Submission
        retry_count: Number of retry attempts so far
        max_retries: Maximum number of retries before timeout
        
    Returns:
        dict: Status and submission details
    """
    try:
        from apps.submissions.models import Submission
        
        submission = Submission.objects.get(id=submission_id)
        
        if not submission.turnitin_submission_id:
            logger.error(f"Submission {submission_id} has no Turnitin ID")
            return {'status': 'error', 'message': 'Missing Turnitin ID'}
        
        logger.debug(f"Checking status for submission {submission_id} (attempt {retry_count + 1})")
        
        # Get Turnitin profile
        turnitin_profile = TurnitinProfile.objects.get(user=submission.user)
        client = TurnitinAPIClient()
        token = client.authenticate_oauth()
        
        # Check status
        try:
            is_ready, similarity_score = client.check_submission_ready(
                turnitin_user_id=turnitin_profile.turnitin_user_id,
                submission_id=submission.turnitin_submission_id,
                token=token,
            )
        except TurnitinAPIError as e:
            logger.warning(f"API error checking status: {str(e)}")
            if retry_count < max_retries:
                check_submission_status.apply_async(
                    args=[submission_id, retry_count + 1, max_retries],
                    countdown=30,
                )
            else:
                submission.status = 'failed'
                submission.save()
                logger.error(f"Status check timeout for {submission_id}")
            return {'status': 'retrying', 'retry_count': retry_count + 1}
        
        if is_ready:
            # Report is ready
            logger.info(f"✓ Report ready for submission {submission_id} (similarity: {similarity_score}%)")
            
            # Get full report details
            try:
                report = client.get_similarity_report(
                    turnitin_user_id=turnitin_profile.turnitin_user_id,
                    submission_id=submission.turnitin_submission_id,
                    token=token,
                )
            except TurnitinAPIError:
                report = {}
            
            # Update submission
            submission.status = 'complete'
            submission.similarity_score = similarity_score
            submission.processed_at = timezone.now()
            submission.save()
            
            # Update metadata
            SubmissionMetadata.objects.filter(
                turnitin_submission_id=submission.turnitin_submission_id
            ).update(
                status='complete',
                similarity_score=similarity_score,
                processed_at=timezone.now(),
                turnitin_response=report,
            )
            
            # Send completion notification
            send_completion_email.delay(str(submission_id))
            
            return {
                'status': 'complete',
                'submission_id': str(submission_id),
                'similarity_score': similarity_score,
            }
        
        else:
            # Still processing
            if retry_count < max_retries:
                logger.debug(f"Still processing, retrying in 30s (attempt {retry_count + 1}/{max_retries})")
                check_submission_status.apply_async(
                    args=[submission_id, retry_count + 1, max_retries],
                    countdown=30,
                )
                return {
                    'status': 'processing',
                    'submission_id': str(submission_id),
                    'retry_count': retry_count + 1,
                }
            else:
                # Timeout after 30 minutes
                submission.status = 'failed'
                submission.save()
                logger.error(f"Processing timeout for submission {submission_id}")
                return {
                    'status': 'timeout',
                    'submission_id': str(submission_id),
                    'message': 'Report generation timed out after 30 minutes',
                }
        
    except Submission.DoesNotExist:
        logger.error(f"Submission {submission_id} not found")
        return {'status': 'error', 'message': 'Submission not found'}
        
    except TurnitinProfile.DoesNotExist:
        logger.error(f"Turnitin profile not found for submission {submission_id}")
        return {'status': 'error', 'message': 'Turnitin profile not found'}
        
    except Exception as e:
        logger.error(f"Error checking submission status: {str(e)}", exc_info=True)
        return {'status': 'error', 'message': str(e)}


@shared_task(bind=True, max_retries=2)
def send_completion_email(self, submission_id):
    """
    Send email when submission report is ready.
    
    Args:
        submission_id: UUID of the Submission
        
    Returns:
        dict: Email send status
    """
    try:
        from apps.submissions.models import Submission
        
        submission = Submission.objects.get(id=submission_id)
        
        subject = f"Your plagiarism report is ready: {submission.original_filename}"
        message = f"""
Hello {submission.user.first_name or submission.user.username},

Great news! Your document has been analyzed and your plagiarism report is ready.

Document: {submission.original_filename}
Similarity Score: {submission.similarity_score}%
Submitted: {submission.created_at.strftime('%Y-%m-%d %H:%M:%S')}
Completed: {submission.processed_at.strftime('%Y-%m-%d %H:%M:%S')}

View Your Report:
Log in to your dashboard and navigate to "My Submissions" to view the complete analysis.

Understanding Your Score:
- 0-20%: Very low similarity (acceptable in most cases)
- 20-50%: Moderate similarity (review required)
- 50%+: High similarity (substantial revision needed)

Questions? Contact our support team.

Best regards,
Turnitin SaaS Team
        """
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [submission.user.email],
            fail_silently=False,
        )
        
        logger.info(f"✓ Completion email sent for submission {submission_id}")
        return {
            'status': 'sent',
            'submission_id': str(submission_id),
            'email': submission.user.email,
        }
        
    except Submission.DoesNotExist:
        logger.error(f"Submission {submission_id} not found for email")
        return {'status': 'error', 'message': 'Submission not found'}
        
    except Exception as e:
        logger.error(f"Failed to send completion email: {str(e)}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=300)
        return {'status': 'failed', 'error': str(e)}
