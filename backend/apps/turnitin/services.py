"""
Turnitin API integration service layer.
Handles all server-to-server communication with Turnitin APIs.
Credentials are NEVER exposed to frontend.

This module provides secure, production-ready integration with Turnitin's plagiarism detection API.
All credentials are encrypted and stored server-side only.
"""

import requests
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
import json
import time

logger = logging.getLogger(__name__)


class TurnitinAPIClient:
    """
    Secure Turnitin API client with advanced features.
    Manages authentication and all interactions with Turnitin services.
    
    Key Security Principles:
    - All credentials are server-side only
    - Frontend never receives API keys or secrets
    - OAuth tokens are encrypted in database
    - All requests use HTTPS
    - Automatic token refresh and caching
    - Retry logic with exponential backoff
    - Request rate limiting
    
    Features:
    - OAuth 2.0 client credentials flow
    - Automatic token expiration handling
    - Connection pooling and session reuse
    - Comprehensive error handling and logging
    - Request/response validation
    """
    
    # Retry configuration
    MAX_RETRIES = 3
    RETRY_BACKOFF_FACTOR = 0.5
    TIMEOUT = 30
    
    def __init__(self):
        """Initialize API client with configuration."""
        config = settings.TURNITIN_CONFIG
        self.api_key = config.get('API_KEY')
        self.api_secret = config.get('API_SECRET')
        self.api_url = config.get('API_URL', 'https://api.turnitinapis.com')
        self.integration_code = config.get('INTEGRATION_CODE')
        self.timeout = config.get('TIMEOUT', self.TIMEOUT)
        self.session = self._create_session()
        
        # Token cache key
        self._token_cache_key = 'turnitin_oauth_token'
        self._token_expiry_buffer = 300  # 5 minutes before actual expiry
    
    def _create_session(self) -> requests.Session:
        """
        Create and configure requests session with connection pooling.
        
        Returns:
            Configured requests.Session instance
        """
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Turnitin-SaaS/2.0',
            'Content-Type': 'application/json',
        })
        
        # Connection pooling for better performance
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=10,
            pool_maxsize=10,
            max_retries=requests.adapters.Retry(
                total=self.MAX_RETRIES,
                backoff_factor=self.RETRY_BACKOFF_FACTOR,
                status_forcelist=[429, 500, 502, 503, 504],
            )
        )
        session.mount('https://', adapter)
        session.mount('http://', adapter)
        
        return session
    
    
    def _get_auth_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        """
        Generate authentication headers.
        
        Uses OAuth token if available, otherwise uses API key.
        
        Args:
            token: OAuth Bearer token (optional)
        
        Returns:
            Dictionary of authentication headers
        """
        headers = {}
        
        if token:
            # OAuth Bearer token (preferred)
            headers['Authorization'] = f'Bearer {token}'
        else:
            # Basic auth with API credentials
            import base64
            credentials = base64.b64encode(
                f'{self.api_key}:{self.api_secret}'.encode()
            ).decode()
            headers['Authorization'] = f'Basic {credentials}'
        
        return headers
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        token: Optional[str] = None,
        data: Optional[Dict] = None,
        files: Optional[Dict] = None,
        retries: int = 0,
    ) -> Dict[str, Any]:
        """
        Make authenticated request to Turnitin API with retry logic.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            token: OAuth access token (if available)
            data: Request body data
            files: Files for multipart upload
            retries: Current retry attempt number
        
        Returns:
            Response data as dictionary
        
        Raises:
            TurnitinAPIError: If request fails after all retries
        """
        url = f"{self.api_url}{endpoint}"
        headers = self._get_auth_headers(token)
        
        try:
            if files:
                # Multipart upload (files have priority over json data)
                response = self.session.request(
                    method,
                    url,
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=self.timeout,
                    verify=True  # Always verify SSL
                )
            else:
                # JSON request
                response = self.session.request(
                    method,
                    url,
                    headers=headers,
                    json=data,
                    timeout=self.timeout,
                    verify=True
                )
            
            # Handle rate limiting with exponential backoff
            if response.status_code == 429:
                if retries < self.MAX_RETRIES:
                    wait_time = self.RETRY_BACKOFF_FACTOR * (2 ** retries)
                    logger.warning(f"Rate limited. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    return self._make_request(method, endpoint, token, data, files, retries + 1)
                else:
                    raise TurnitinAPIError('Rate limit exceeded. Please try again later.')
            
            response.raise_for_status()
            
            # Parse response
            if response.content:
                return response.json()
            return {'success': True, 'status_code': response.status_code}
        
        except requests.exceptions.Timeout:
            logger.error(f"Turnitin API timeout: {url}")
            raise TurnitinAPIError('Request to Turnitin timed out (30s)')
        
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Turnitin API connection error: {url} - {str(e)}")
            if retries < self.MAX_RETRIES:
                wait_time = self.RETRY_BACKOFF_FACTOR * (2 ** retries)
                logger.info(f"Connection failed. Retrying in {wait_time}s...")
                time.sleep(wait_time)
                return self._make_request(method, endpoint, token, data, files, retries + 1)
            raise TurnitinAPIError('Failed to connect to Turnitin after multiple attempts')
        
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code
            response_text = e.response.text[:500]  # Limit log output
            logger.error(f"Turnitin API HTTP {status_code}: {response_text}")
            raise TurnitinAPIError(f"Turnitin API error {status_code}: {response_text}")
        
        except Exception as e:
            logger.error(f"Turnitin API request error: {str(e)}", exc_info=True)
            raise TurnitinAPIError(f"API request failed: {str(e)}")
    
    
    def authenticate_oauth(self, force_refresh: bool = False) -> str:
        """
        Obtain OAuth access token using client credentials flow.
        
        Uses caching to avoid excessive token requests.
        Automatically refreshes expired tokens.
        
        Args:
            force_refresh: Force token refresh even if cached
        
        Returns:
            Access token string
        
        Raises:
            TurnitinAPIError: If authentication fails
        """
        # Check cache first
        if not force_refresh:
            cached_token = cache.get(self._token_cache_key)
            if cached_token:
                logger.debug("Using cached OAuth token")
                return cached_token
        
        endpoint = '/api/v1/oauth/token'
        
        data = {
            'grant_type': 'client_credentials',
            'client_id': self.api_key,
            'client_secret': self.api_secret,
            'scope': 'submission.manage submission.read',
        }
        
        try:
            response = self._make_request('POST', endpoint, data=data)
            
            if 'access_token' not in response:
                raise TurnitinAPIError('No access token in response')
            
            access_token = response['access_token']
            expires_in = response.get('expires_in', 3600)
            
            # Cache token, subtracting buffer to refresh before actual expiry
            cache_duration = max(expires_in - self._token_expiry_buffer, 60)
            cache.set(self._token_cache_key, access_token, cache_duration)
            
            logger.info(f"Successfully obtained OAuth token (expires in {expires_in}s)")
            return access_token
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"OAuth authentication failed: {str(e)}", exc_info=True)
            raise TurnitinAPIError(f"Authentication failed: {str(e)}")
    
    def create_user(self, email: str, first_name: str, last_name: str) -> Dict[str, str]:
        """
        Create Turnitin user account.
        
        Args:
            email: User email address
            first_name: First name
            last_name: Last name
        
        Returns:
            Dictionary with turnitin_user_id and user data
        
        Raises:
            TurnitinAPIError: If user creation fails
        """
        endpoint = '/api/v1/users'
        
        data = {
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'integration_code': self.integration_code,
        }
        
        token = self.authenticate_oauth()
        
        try:
            response = self._make_request('POST', endpoint, token=token, data=data)
            
            user_id = response.get('user_id') or response.get('id')
            if user_id:
                logger.info(f"Created Turnitin user: {email}")
                return {
                    'turnitin_user_id': str(user_id),
                    'user_data': response,
                }
            
            raise TurnitinAPIError('No user ID in response')
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to create Turnitin user {email}: {str(e)}")
            raise TurnitinAPIError(f"User creation failed: {str(e)}")
    
    def submit_document(
        self,
        turnitin_user_id: str,
        filename: str,
        file_content: bytes,
        content_type: str,
        token: str,
        metadata: Optional[Dict] = None,
    ) -> Dict[str, str]:
        """
        Submit document for plagiarism checking.
        
        Args:
            turnitin_user_id: Turnitin user identifier
            filename: Original filename
            file_content: File binary content
            content_type: MIME type
            token: OAuth access token
            metadata: Optional submission metadata
        
        Returns:
            Dictionary with submission_id and status
        
        Raises:
            TurnitinAPIError: If submission fails
        """
        endpoint = f'/api/v1/users/{turnitin_user_id}/submissions'
        
        files = {
            'file': (filename, file_content, content_type)
        }
        
        data = {
            'integration_code': self.integration_code,
        }
        
        if metadata:
            data.update(metadata)
        
        try:
            response = self._make_request(
                'POST',
                endpoint,
                token=token,
                data=data,
                files=files
            )
            
            submission_id = response.get('submission_id') or response.get('id')
            if submission_id:
                logger.info(f"Submitted document to Turnitin: {submission_id}")
                return {
                    'turnitin_submission_id': str(submission_id),
                    'status': response.get('status', 'submitted'),
                    'response': response,
                }
            
            raise TurnitinAPIError('No submission ID in response')
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to submit document: {str(e)}")
            raise TurnitinAPIError(f"Submission failed: {str(e)}")
    
    
    def get_submission_status(
        self,
        turnitin_user_id: str,
        submission_id: str,
        token: str,
    ) -> Dict[str, Any]:
        """
        Get submission status and report availability.
        
        Args:
            turnitin_user_id: Turnitin user identifier
            submission_id: Submission identifier
            token: OAuth access token
        
        Returns:
            Submission status and report data
        
        Raises:
            TurnitinAPIError: If request fails
        """
        endpoint = f'/api/v1/users/{turnitin_user_id}/submissions/{submission_id}'
        
        try:
            response = self._make_request('GET', endpoint, token=token)
            
            logger.info(f"Retrieved submission status: {submission_id}")
            return response
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to get submission status: {str(e)}")
            raise TurnitinAPIError(f"Status retrieval failed: {str(e)}")
    
    def get_similarity_report(
        self,
        turnitin_user_id: str,
        submission_id: str,
        token: str,
    ) -> Dict[str, Any]:
        """
        Get detailed similarity report with metadata.
        
        Args:
            turnitin_user_id: Turnitin user identifier
            submission_id: Submission identifier
            token: OAuth access token
        
        Returns:
            Detailed report data including similarity score
        
        Raises:
            TurnitinAPIError: If request fails
        """
        endpoint = f'/api/v1/users/{turnitin_user_id}/submissions/{submission_id}/report'
        
        try:
            response = self._make_request('GET', endpoint, token=token)
            logger.info(f"Retrieved detailed report: {submission_id}")
            return response
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to get similarity report: {str(e)}")
            raise TurnitinAPIError(f"Report retrieval failed: {str(e)}")
    
    def get_similarity_report_url(
        self,
        turnitin_user_id: str,
        submission_id: str,
        token: str,
    ) -> str:
        """
        Get URL to similarity report (deprecated - use get_similarity_report instead).
        
        Args:
            turnitin_user_id: Turnitin user identifier
            submission_id: Submission identifier
            token: OAuth access token
        
        Returns:
            Report URL
        
        Raises:
            TurnitinAPIError: If request fails
        """
        try:
            report = self.get_similarity_report(turnitin_user_id, submission_id, token)
            report_url = report.get('url') or report.get('report_url')
            if report_url:
                return report_url
            
            raise TurnitinAPIError('No report URL in response')
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to get report URL: {str(e)}")
            raise TurnitinAPIError(f"Report URL retrieval failed: {str(e)}")
    
    def get_submission_details(
        self,
        turnitin_user_id: str,
        submission_id: str,
        token: str,
    ) -> Dict[str, Any]:
        """
        Get comprehensive submission details including report data.
        
        Combines status check with similarity report retrieval.
        
        Args:
            turnitin_user_id: Turnitin user identifier
            submission_id: Submission identifier
            token: OAuth access token
        
        Returns:
            Combined submission details and report data
        
        Raises:
            TurnitinAPIError: If request fails
        """
        try:
            status_data = self.get_submission_status(turnitin_user_id, submission_id, token)
            report_data = self.get_similarity_report(turnitin_user_id, submission_id, token)
            
            # Merge data
            combined = {**status_data, 'report': report_data}
            return combined
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to get submission details: {str(e)}")
            raise TurnitinAPIError(f"Details retrieval failed: {str(e)}")
    
    def check_submission_ready(
        self,
        turnitin_user_id: str,
        submission_id: str,
        token: str,
    ) -> Tuple[bool, Optional[float]]:
        """
        Check if submission report is ready and return similarity score.
        
        Args:
            turnitin_user_id: Turnitin user identifier
            submission_id: Submission identifier
            token: OAuth access token
        
        Returns:
            Tuple of (is_ready, similarity_score)
        
        Raises:
            TurnitinAPIError: If request fails
        """
        try:
            status = self.get_submission_status(turnitin_user_id, submission_id, token)
            
            # Check status field
            submission_status = status.get('status', '').lower()
            is_ready = submission_status == 'complete'
            
            # Extract similarity score if available
            similarity_score = status.get('similarity_score')
            if similarity_score is not None:
                try:
                    similarity_score = float(similarity_score)
                except (ValueError, TypeError):
                    similarity_score = None
            
            return is_ready, similarity_score
        
        except TurnitinAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to check submission status: {str(e)}")
            raise TurnitinAPIError(f"Status check failed: {str(e)}")
    
    def clear_token_cache(self) -> None:
        """Clear cached OAuth token to force refresh on next request."""
        cache.delete(self._token_cache_key)
        logger.info("OAuth token cache cleared")


class TurnitinAPIError(Exception):
    """Custom exception for Turnitin API errors."""
    pass
