"""
Custom exception handler and exception classes for API responses.

Provides:
- Custom API exception classes for different error scenarios
- Global exception handler for DRF
- Standardized error response format
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.exceptions import APIException, ValidationError as DRFValidationError
from rest_framework.views import exception_handler as drf_exception_handler
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class CustomAPIException(APIException):
    """
    Base custom API exception for application-specific errors.
    
    All custom exceptions should inherit from this class.
    Ensures consistent error response formatting.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred.'
    default_code = 'error'
    
    def __init__(self, detail=None, code=None, status_code=None):
        """Initialize exception with optional custom detail and status code."""
        if detail:
            self.detail = detail
        else:
            self.detail = self.default_detail
        
        if code:
            self.code = code
        else:
            self.code = self.default_code
        
        if status_code:
            self.status_code = status_code


class AuthenticationError(CustomAPIException):
    """Exception for authentication failures."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication failed. Please log in again.'
    default_code = 'authentication_error'


class AuthorizationError(CustomAPIException):
    """Exception for authorization failures."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to access this resource.'
    default_code = 'authorization_error'


class InvalidCredentialsError(CustomAPIException):
    """Exception for invalid credentials."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Invalid email or password.'
    default_code = 'invalid_credentials'


class AccountLockedError(CustomAPIException):
    """Exception for locked user accounts."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Your account is locked due to multiple failed login attempts. Try again later.'
    default_code = 'account_locked'


class ValidationError(CustomAPIException):
    """Exception for validation errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid data provided.'
    default_code = 'validation_error'


class ResourceNotFoundError(CustomAPIException):
    """Exception for missing resources."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested resource was not found.'
    default_code = 'not_found'


class FileUploadError(CustomAPIException):
    """Exception for file upload errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'File upload failed.'
    default_code = 'upload_error'


class FileSizeExceededError(CustomAPIException):
    """Exception for files exceeding size limit."""
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    default_detail = 'File size exceeds maximum limit (50MB).'
    default_code = 'file_too_large'


class InvalidFileTypeError(CustomAPIException):
    """Exception for invalid file types."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'File type not supported. Allowed: PDF, DOC, DOCX, TXT, RTF, ODT'
    default_code = 'invalid_file_type'


class TurnitinIntegrationError(CustomAPIException):
    """Exception for Turnitin API integration errors."""
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'Turnitin service is currently unavailable.'
    default_code = 'turnitin_error'


class SubmissionError(CustomAPIException):
    """Exception for submission processing errors."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Submission failed. Please try again.'
    default_code = 'submission_error'


class SubmissionQuotaExceeded(CustomAPIException):
    """Exception for submission quota exceeded."""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'You have exceeded your submission quota. Please try again tomorrow.'
    default_code = 'quota_exceeded'


class RateLimitExceeded(CustomAPIException):
    """Exception for rate limiting."""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Too many requests. Please try again later.'
    default_code = 'rate_limit_exceeded'


class ServiceUnavailableError(CustomAPIException):
    """Exception for service unavailability."""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable. Please try again later.'
    default_code = 'service_unavailable'


def custom_exception_handler(exc, context):
    """
    Centralized exception handler for DRF.
    
    Provides:
    - Consistent error response format
    - Error logging and tracking
    - HTTP status code mapping
    - Client-safe error messages
    
    Args:
        exc: The exception raised
        context: Context dictionary from DRF
    
    Returns:
        Response object with standardized error format
    """
    response = None
    
    # Handle custom API exceptions
    if isinstance(exc, CustomAPIException):
        data = {
            'success': False,
            'error_code': exc.code,
            'detail': str(exc.detail),
            'timestamp': datetime.now().isoformat(),
        }
        
        # Add request ID if available
        if hasattr(context.get('request'), 'request_id'):
            data['request_id'] = context['request'].request_id
        
        response = Response(data, status=exc.status_code)
        logger.warning(
            f"API Error: {exc.code} - {exc.detail}",
            extra={'error_code': exc.code, 'status_code': exc.status_code}
        )
    
    # Handle DRF ValidationError
    elif isinstance(exc, DRFValidationError):
        data = {
            'success': False,
            'error_code': 'validation_error',
            'detail': 'Validation failed.',
            'errors': exc.detail if isinstance(exc.detail, dict) else {'detail': exc.detail},
            'timestamp': datetime.now().isoformat(),
        }
        
        if hasattr(context.get('request'), 'request_id'):
            data['request_id'] = context['request'].request_id
        
        response = Response(data, status=status.HTTP_400_BAD_REQUEST)
        logger.warning(
            f"Validation Error: {exc.detail}",
            extra={'error_detail': str(exc.detail)}
        )
    
    else:
        # Let DRF's default handler process other exceptions
        response = drf_exception_handler(exc, context)
        
        if response is not None:
            # Reformat response to match our standard
            data = {
                'success': False,
                'error_code': 'request_error',
                'detail': response.data.get('detail', 'An error occurred.'),
                'timestamp': datetime.now().isoformat(),
            }
            
            # Add request ID if available
            if hasattr(context.get('request'), 'request_id'):
                data['request_id'] = context['request'].request_id
            
            # Preserve non-detail fields (field-specific errors, etc.)
            for key, value in response.data.items():
                if key != 'detail':
                    data[key] = value
            
            response.data = data
            
            # Log based on status code
            if response.status_code >= 500:
                logger.error(
                    f"Server Error ({response.status_code}): {str(exc)}",
                    exc_info=exc
                )
            else:
                logger.warning(
                    f"Request Error ({response.status_code}): {str(exc)}"
                )
    
    # If no response yet, something unexpected happened
    if response is None:
        logger.exception('Unhandled exception in exception handler', exc_info=exc)
        response = Response(
            {
                'success': False,
                'error_code': 'internal_server_error',
                'detail': 'An unexpected error occurred. Please try again later.',
                'timestamp': datetime.now().isoformat(),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response
