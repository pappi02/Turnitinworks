"""
Custom middleware for authentication, error handling, and request/response logging.

Middleware stack:
1. RequestLoggingMiddleware - Log all requests and responses
2. ErrorHandlingMiddleware - Centralized error handling
3. SecurityHeadersMiddleware - Add security headers
4. RateLimitingMiddleware - Basic rate limiting
5. JWTAuthenticationMiddleware - JWT auth support
"""

import json
import logging
import time
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from rest_framework import status
from django.core.cache import cache
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)
api_logger = logging.getLogger('api_calls')


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Log all API requests and responses with timing information.
    
    Logs:
    - Request method, path, and user
    - Response status code
    - Request/response time
    - Request size
    - Useful for performance monitoring and debugging
    """
    
    def process_request(self, request):
        """Attach request start time."""
        request._start_time = time.time()
        request._start_dt = datetime.now()
        return None
    
    def process_response(self, request, response):
        """Log request/response details."""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Skip logging for static files and media
            if request.path.startswith(('/static/', '/media/', '/admin/')):
                return response
            
            # Extract useful info
            user = str(request.user) if request.user else 'anonymous'
            method = request.method
            path = request.path
            status_code = response.status_code
            
            # Log level based on status code
            if status_code >= 500:
                log_level = logging.ERROR
            elif status_code >= 400:
                log_level = logging.WARNING
            else:
                log_level = logging.INFO
            
            api_logger.log(
                log_level,
                f"{method} {path} - {status_code} ({duration:.3f}s) - User: {user}",
                extra={
                    'method': method,
                    'path': path,
                    'status_code': status_code,
                    'duration': duration,
                    'user': user,
                    'timestamp': request._start_dt.isoformat(),
                }
            )
        
        return response


class ErrorHandlingMiddleware(MiddlewareMixin):
    """
    Centralized error handling middleware for consistent error responses.
    
    Features:
    - Standardized error response format
    - Detailed server-side logging
    - No sensitive info exposed to clients
    - Error tracking for monitoring
    """
    
    # Error code mapping
    ERROR_CODES = {
        ValueError: 'VALIDATION_ERROR',
        KeyError: 'MISSING_PARAMETER',
        PermissionError: 'PERMISSION_DENIED',
        FileNotFoundError: 'NOT_FOUND',
        TimeoutError: 'REQUEST_TIMEOUT',
    }
    
    def process_exception(self, request, exception):
        """
        Log exceptions and return standardized error response.
        
        Args:
            request: Django request object
            exception: The unhandled exception
        
        Returns:
            JsonResponse with error details
        """
        # Determine error code
        error_code = self.ERROR_CODES.get(
            type(exception),
            'INTERNAL_SERVER_ERROR'
        )
        
        # Determine status code
        if isinstance(exception, PermissionError):
            http_status = status.HTTP_403_FORBIDDEN
        elif isinstance(exception, FileNotFoundError):
            http_status = status.HTTP_404_NOT_FOUND
        elif isinstance(exception, TimeoutError):
            http_status = status.HTTP_504_GATEWAY_TIMEOUT
        else:
            http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
        
        # Log exception with full context
        logger.exception(
            f"Unhandled {type(exception).__name__} in {request.method} {request.path}",
            extra={
                'error_code': error_code,
                'path': request.path,
                'method': request.method,
                'user': str(request.user),
                'user_id': getattr(request.user, 'id', None),
                'ip_address': self._get_client_ip(request),
                'exception_type': type(exception).__name__,
                'exception_message': str(exception)[:500],  # Limit message length
            }
        )
        
        # Build response (generic for security)
        response_data = {
            'success': False,
            'error_code': error_code,
            'detail': self._get_user_friendly_message(error_code),
            'timestamp': datetime.now().isoformat(),
        }
        
        # Add request ID for support tracking
        if hasattr(request, 'request_id'):
            response_data['request_id'] = request.request_id
        
        return JsonResponse(response_data, status=http_status)
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    
    @staticmethod
    def _get_user_friendly_message(error_code):
        """Get user-friendly error message."""
        messages = {
            'VALIDATION_ERROR': 'Invalid data provided.',
            'MISSING_PARAMETER': 'Required parameter missing.',
            'PERMISSION_DENIED': 'You do not have permission to access this resource.',
            'NOT_FOUND': 'The requested resource was not found.',
            'REQUEST_TIMEOUT': 'The request took too long. Please try again.',
            'INTERNAL_SERVER_ERROR': 'An error occurred. Please try again later.',
        }
        return messages.get(error_code, 'An unexpected error occurred.')


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses.
    
    Headers:
    - X-Content-Type-Options: nosniff (prevent MIME sniffing)
    - X-Frame-Options: DENY (prevent clickjacking)
    - X-XSS-Protection: 1; mode=block (XSS protection)
    - Strict-Transport-Security: HTTPS enforcement
    - Content-Security-Policy: XSS and injection prevention
    """
    
    def process_response(self, request, response):
        """Add security headers to response."""
        # Prevent MIME sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # Enable XSS protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # HTTPS enforcement (if not DEBUG)
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy (formerly Feature Policy)
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response


class RateLimitingMiddleware(MiddlewareMixin):
    """
    Basic rate limiting to prevent abuse.
    
    Strategy:
    - Anonymous users: 100 requests per hour per IP
    - Authenticated users: 1000 requests per hour
    - API endpoints only (skip admin, static)
    
    Uses Django cache for tracking.
    """
    
    # Rate limits: (requests, time_window_seconds)
    ANONYMOUS_LIMIT = (100, 3600)  # 100/hour
    AUTHENTICATED_LIMIT = (1000, 3600)  # 1000/hour
    
    # Paths to rate limit
    RATE_LIMITED_PATHS = ['/api/', '/submissions/', '/auth/']
    
    def process_request(self, request):
        """Check rate limits."""
        # Skip rate limiting for non-API requests
        if not any(request.path.startswith(path) for path in self.RATE_LIMITED_PATHS):
            return None
        
        # Get identifier (user ID or IP)
        if request.user and request.user.is_authenticated:
            identifier = f"user_{request.user.id}"
            limit, window = self.AUTHENTICATED_LIMIT
        else:
            identifier = f"ip_{self._get_client_ip(request)}"
            limit, window = self.ANONYMOUS_LIMIT
        
        # Get cache key
        cache_key = f"rate_limit:{identifier}"
        
        # Check current count
        current_count = cache.get(cache_key, 0)
        
        if current_count >= limit:
            logger.warning(
                f"Rate limit exceeded for {identifier}",
                extra={'identifier': identifier, 'limit': limit}
            )
            return JsonResponse(
                {
                    'success': False,
                    'error_code': 'RATE_LIMIT_EXCEEDED',
                    'detail': f'Rate limit exceeded. Maximum {limit} requests per hour.',
                    'retry_after': window,
                },
                status=429,  # Too Many Requests
            )
        
        # Increment counter
        cache.set(cache_key, current_count + 1, window)
        
        return None
    
    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')


class RequestIDMiddleware(MiddlewareMixin):
    """
    Add a unique request ID for tracking across logs.
    
    Request ID is included in:
    - All error responses
    - All log entries
    - Response headers (X-Request-ID)
    """
    
    def process_request(self, request):
        """Generate request ID."""
        # Try to get from header (for tracing across services)
        request_id = request.META.get('HTTP_X_REQUEST_ID')
        
        # Generate if not provided
        if not request_id:
            import uuid
            request_id = str(uuid.uuid4())
        
        request.request_id = request_id
        return None
    
    def process_response(self, request, response):
        """Add request ID to response."""
        if hasattr(request, 'request_id'):
            response['X-Request-ID'] = request.request_id
        return response


class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to handle JWT authentication and attach user to request.
    
    Note: DRF handles JWT authentication automatically.
    This middleware provides additional support if needed.
    """
    
    def process_request(self, request):
        """Extract JWT from Authorization header."""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            request.token = token
        return None
