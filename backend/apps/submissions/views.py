"""
API views for document submissions and plagiarism checking.

Endpoints:
- POST   /api/v1/submissions/upload/     - Upload document for checking
- GET    /api/v1/submissions/            - List user submissions
- GET    /api/v1/submissions/{id}/       - Get submission details
- GET    /api/v1/submissions/{id}/status/- Get processing status
- GET    /api/v1/submissions/{id}/report/- Get similarity report
- DELETE /api/v1/submissions/{id}/       - Delete submission
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
import logging

from .models import Submission
from .serializers import (
    SubmissionSerializer,
    SubmissionUploadSerializer,
    SubmissionListSerializer,
)
from apps.turnitin.models import SubmissionMetadata
from apps.turnitin.tasks import submit_document_to_turnitin
from apps.turnitin.services import TurnitinAPIClient, TurnitinAPIError

logger = logging.getLogger(__name__)


class SubmissionViewSet(viewsets.ModelViewSet):
    """
    Submission management endpoints for plagiarism checking.
    
    Features:
    - Document upload and submission to Turnitin
    - Real-time status checking and report retrieval
    - Automatic background processing with Celery
    - Metadata tracking and audit trail
    - Error handling and recovery
    
    Permissions:
    - Authenticated users only
    - Users can only access their own submissions
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        """Return submissions for authenticated user only."""
        return Submission.objects.filter(
            user=self.request.user
        ).select_related('user').order_by('-created_at')
    
    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'upload':
            return SubmissionUploadSerializer
        elif self.action == 'list':
            return SubmissionListSerializer
        return SubmissionSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List all submissions for authenticated user.
        
        Returns submissions in reverse chronological order with status.
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'submissions': serializer.data,
        }, status=status.HTTP_200_OK)
    
    def retrieve(self, request, pk=None, *args, **kwargs):
        """Get detailed submission information."""
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        serializer = self.get_serializer(submission)
        
        return Response({
            'success': True,
            'submission': serializer.data,
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser, FormParser))
    def upload(self, request):
        """
        Upload a document for plagiarism checking.
        
        Endpoint: POST /api/v1/submissions/upload/
        
        Request:
        {
            "document": <binary file>,
            "title": "Optional document title",
            "description": "Optional notes"
        }
        
        Response:
        {
            "success": true,
            "message": "Document uploaded successfully",
            "submission": { ...submission data... }
        }
        """
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                submission = serializer.save()
                
                logger.info(
                    f"✓ Document uploaded: {submission.original_filename} "
                    f"(ID: {submission.id}, User: {request.user.email})"
                )
                
                # Queue document submission to Turnitin asynchronously
                submit_document_to_turnitin.delay(str(submission.id))
                
                return Response({
                    'success': True,
                    'message': _('Document uploaded successfully. Processing started.'),
                    'submission': SubmissionSerializer(submission).data,
                }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            logger.warning(f"Validation error during upload: {str(e)}")
            return Response({
                'success': False,
                'detail': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Upload error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'detail': _('Upload failed. Please try again later.'),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get submission processing status.
        
        Endpoint: GET /api/v1/submissions/{id}/status/
        
        Returns current processing status and similarity score if available.
        """
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        
        status_data = {
            'success': True,
            'submission_id': str(submission.id),
            'status': submission.status,
            'filename': submission.original_filename,
            'uploaded_at': submission.created_at,
        }
        
        # Add optional fields if available
        if submission.similarity_score is not None:
            status_data['similarity_score'] = submission.similarity_score
        
        if submission.processed_at:
            status_data['processed_at'] = submission.processed_at
        
        if submission.status == 'failed' and submission.error_message:
            status_data['error_message'] = submission.error_message
        
        return Response(status_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        """
        Get similarity report details.
        
        Endpoint: GET /api/v1/submissions/{id}/report/
        
        Returns similarity report with score and detailed analysis.
        Returns 202 ACCEPTED if report not ready yet.
        """
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        
        # Check if report is ready
        if submission.status != 'complete':
            return Response({
                'success': False,
                'message': _(f'Report not yet available. Current status: {submission.get_status_display()}'),
                'status': submission.status,
            }, status=status.HTTP_202_ACCEPTED)
        
        if not submission.turnitin_submission_id:
            return Response({
                'success': False,
                'message': _('Report data unavailable.'),
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get cached report data from metadata
        try:
            metadata = SubmissionMetadata.objects.get(
                turnitin_submission_id=submission.turnitin_submission_id
            )
            
            report_data = {
                'success': True,
                'submission_id': str(submission.id),
                'similarity_score': submission.similarity_score,
                'processed_at': submission.processed_at,
                'filename': submission.original_filename,
            }
            
            # Include report URLs if available
            if metadata.report_url:
                report_data['report_url'] = metadata.report_url
            
            if metadata.pdf_report_url:
                report_data['pdf_report_url'] = metadata.pdf_report_url
            
            return Response(report_data, status=status.HTTP_200_OK)
        
        except SubmissionMetadata.DoesNotExist:
            logger.warning(f"Metadata not found for submission {submission.id}")
            return Response({
                'success': True,
                'submission_id': str(submission.id),
                'similarity_score': submission.similarity_score,
                'processed_at': submission.processed_at,
                'message': _('Report metadata not available'),
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error retrieving report: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'detail': _('Failed to retrieve report. Please try again.'),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def refresh_status(self, request, pk=None):
        """
        Manually refresh submission status from Turnitin.
        
        Endpoint: POST /api/v1/submissions/{id}/refresh_status/
        
        Useful if status is not updating automatically.
        """
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        
        if not submission.turnitin_submission_id:
            return Response({
                'success': False,
                'message': _('Submission not yet sent to Turnitin.'),
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.turnitin.models import TurnitinProfile
            
            turnitin_profile = TurnitinProfile.objects.get(user=request.user)
            client = TurnitinAPIClient()
            token = client.authenticate_oauth()
            
            # Check status
            is_ready, similarity_score = client.check_submission_ready(
                turnitin_user_id=turnitin_profile.turnitin_user_id,
                submission_id=submission.turnitin_submission_id,
                token=token,
            )
            
            if is_ready:
                # Update submission
                submission.status = 'complete'
                submission.similarity_score = similarity_score
                submission.processed_at = timezone.now()
                submission.save()
                
                logger.info(f"Status refreshed for submission {submission.id}")
            
            return Response({
                'success': True,
                'submission_id': str(submission.id),
                'status': submission.status,
                'similarity_score': submission.similarity_score,
                'message': _('Status updated from Turnitin'),
            }, status=status.HTTP_200_OK)
        
        except TurnitinAPIError as e:
            logger.warning(f"Turnitin API error: {str(e)}")
            return Response({
                'success': False,
                'message': _('Failed to refresh status from Turnitin.'),
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        except Exception as e:
            logger.error(f"Error refreshing status: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': _('Failed to refresh status.'),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def destroy(self, request, pk=None):
        """
        Delete a submission.
        
        Can only delete submissions that are not currently processing.
        """
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        
        # Prevent deletion while processing
        if submission.status == 'processing':
            return Response({
                'success': False,
                'message': _('Cannot delete submission while processing.'),
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            submission_id = str(submission.id)
            submission.delete()
            
            logger.info(f"Submission deleted: {submission_id}")
            
            return Response({
                'success': True,
                'message': _('Submission deleted successfully.'),
            }, status=status.HTTP_204_NO_CONTENT)
        
        except Exception as e:
            logger.error(f"Error deleting submission: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': _('Failed to delete submission.'),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def metadata(self, request, pk=None):
        """
        Get submission metadata and audit trail.
        
        Endpoint: GET /api/v1/submissions/{id}/metadata/
        
        Returns complete submission history and metadata.
        """
        submission = get_object_or_404(Submission, id=pk, user=request.user)
        
        metadata_records = SubmissionMetadata.objects.filter(
            turnitin_submission_id=submission.turnitin_submission_id
        ).order_by('-updated_at')
        
        metadata_list = [
            {
                'status': m.status,
                'similarity_score': m.similarity_score,
                'submitted_at': m.submitted_at,
                'processed_at': m.processed_at,
                'error_message': m.error_message,
            }
            for m in metadata_records
        ]
        
        return Response({
            'success': True,
            'submission_id': str(submission.id),
            'metadata_count': len(metadata_list),
            'metadata': metadata_list,
        }, status=status.HTTP_200_OK)
