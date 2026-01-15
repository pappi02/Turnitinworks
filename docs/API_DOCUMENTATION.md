# Turnitin SaaS Platform - API Documentation

**Version:** 1.0.0  
**Last Updated:** January 14, 2026  
**Status:** Production Ready (Steps 1-10 Complete)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
5. [Webhooks & Events](#webhooks--events)
6. [Rate Limiting](#rate-limiting)
7. [Security](#security)
8. [Best Practices](#best-practices)

---

## Overview

The Turnitin SaaS Platform provides a REST API for managing document submissions and plagiarism checking. The API uses JWT authentication and follows RESTful conventions.

### Base URL

```
https://api.turnitinworks.com/api/v1/
```

### API Documentation

- **Interactive Swagger UI:** https://api.turnitinworks.com/api/docs/
- **ReDoc:** https://api.turnitinworks.com/api/redoc/
- **OpenAPI Schema:** https://api.turnitinworks.com/api/schema/

---

## Authentication

### JWT Tokens

All API requests require authentication using JWT (JSON Web Tokens).

#### Registration

```http
POST /api/v1/auth/register/
Content-Type: application/json

{
    "email": "user@example.com",
    "username": "user_handle",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1-234-567-8900",
    "password": "SecurePassword123!@",
    "password_confirm": "SecurePassword123!@"
}

Response 201 Created:
{
    "success": true,
    "message": "Registration successful. Welcome!",
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "user_handle",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1-234-567-8900",
        "is_email_verified": false,
        "created_at": "2026-01-14T10:00:00Z"
    },
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Password Requirements:**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

#### Login

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
    "username": "user@example.com",  // or username
    "password": "SecurePassword123!@"
}

Response 200 OK:
{
    "success": true,
    "message": "Login successful",
    "user": { ...user data... },
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Features:**
- Email or username login
- Account lockout after 5 failed attempts (15-minute duration)
- Last login tracking
- Automatic Turnitin user provisioning

#### Token Refresh

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response 200 OK:
{
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Using Tokens

Include the access token in the Authorization header:

```http
GET /api/v1/submissions/ HTTP/1.1
Host: api.turnitinworks.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Token Expiration:**
- Access Token: 15 minutes
- Refresh Token: 7 days

### Profile Management

#### Get Profile

```http
GET /api/v1/auth/profile/

Response 200 OK:
{
    "success": true,
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "username": "user_handle",
        "first_name": "John",
        "last_name": "Doe",
        "phone_number": "+1-234-567-8900",
        "avatar_url": null,
        "bio": null,
        "is_email_verified": true,
        "created_at": "2026-01-14T10:00:00Z",
        "updated_at": "2026-01-14T10:05:00Z"
    }
}
```

#### Update Profile

```http
PATCH /api/v1/auth/profile/update_profile/
Content-Type: application/json

{
    "first_name": "Jonathan",
    "last_name": "Smith",
    "phone_number": "+1-555-123-4567",
    "avatar_url": "https://example.com/avatar.jpg",
    "bio": "Software engineer interested in code quality"
}

Response 200 OK:
{
    "success": true,
    "message": "Profile updated successfully",
    "user": { ...updated user data... }
}
```

#### Change Password

```http
POST /api/v1/auth/profile/change_password/
Content-Type: application/json

{
    "old_password": "CurrentPassword123!@",
    "new_password": "NewPassword456!@",
    "new_password_confirm": "NewPassword456!@"
}

Response 200 OK:
{
    "success": true,
    "message": "Password changed successfully"
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
    "success": false,
    "error_code": "ERROR_CODE",
    "detail": "Human-readable error message",
    "timestamp": "2026-01-14T10:00:00.000000Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Codes

| Error Code | HTTP Status | Description |
|-----------|------------|-------------|
| `authentication_error` | 401 | Authentication failed |
| `authorization_error` | 403 | Insufficient permissions |
| `invalid_credentials` | 401 | Invalid email/password |
| `account_locked` | 403 | Account locked (too many login attempts) |
| `validation_error` | 400 | Invalid input data |
| `not_found` | 404 | Resource not found |
| `upload_error` | 400 | File upload failed |
| `file_too_large` | 413 | File exceeds size limit |
| `invalid_file_type` | 400 | Unsupported file type |
| `turnitin_error` | 502 | Turnitin service unavailable |
| `submission_error` | 400 | Submission processing failed |
| `quota_exceeded` | 429 | Quota exceeded |
| `rate_limit_exceeded` | 429 | Rate limit exceeded |
| `service_unavailable` | 503 | Service temporarily unavailable |

### Example Error Response

```json
{
    "success": false,
    "error_code": "file_too_large",
    "detail": "File size exceeds maximum limit (50MB).",
    "timestamp": "2026-01-14T10:30:45.123456Z",
    "request_id": "12345678-1234-1234-1234-123456789012"
}
```

---

## API Endpoints

### Submissions

#### Upload Document

```http
POST /api/v1/submissions/upload/
Content-Type: multipart/form-data

Form Data:
- document: <binary file>
- title: "Optional document title"
- description: "Optional notes about the document"

Response 201 Created:
{
    "success": true,
    "message": "Document uploaded successfully. Processing started.",
    "submission": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "original_filename": "research_paper.pdf",
        "file_size": 2048000,
        "content_type": "application/pdf",
        "title": "My Research Paper",
        "description": "Q1 Research for AI Safety",
        "status": "uploaded",
        "turnitin_submission_id": null,
        "similarity_score": null,
        "created_at": "2026-01-14T10:00:00Z",
        "processed_at": null,
        "error_message": null
    }
}
```

**Allowed File Types:** PDF, DOC, DOCX, TXT, RTF, ODT  
**Maximum File Size:** 50 MB  
**Time to Upload:** Varies (typically < 30 seconds for 50MB)

#### List Submissions

```http
GET /api/v1/submissions/

Response 200 OK:
{
    "success": true,
    "count": 5,
    "submissions": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "original_filename": "document.pdf",
            "title": "Research Paper",
            "status": "complete",
            "similarity_score": 24.5,
            "created_at": "2026-01-14T10:00:00Z",
            "processed_at": "2026-01-14T10:05:00Z"
        },
        ...
    ]
}
```

#### Get Submission

```http
GET /api/v1/submissions/{id}/

Response 200 OK:
{
    "success": true,
    "submission": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "original_filename": "research_paper.pdf",
        "file_size": 2048000,
        "content_type": "application/pdf",
        "title": "My Research Paper",
        "description": "Q1 Research",
        "status": "complete",
        "turnitin_submission_id": "turnitin-12345",
        "similarity_score": 24.5,
        "created_at": "2026-01-14T10:00:00Z",
        "processed_at": "2026-01-14T10:05:00Z",
        "error_message": null
    }
}
```

#### Get Submission Status

```http
GET /api/v1/submissions/{id}/status/

Response 200 OK:
{
    "success": true,
    "submission_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "complete",
    "filename": "research_paper.pdf",
    "uploaded_at": "2026-01-14T10:00:00Z",
    "similarity_score": 24.5,
    "processed_at": "2026-01-14T10:05:00Z"
}
```

**Status Values:**
- `uploaded` - Waiting for processing
- `processing` - Currently checking for plagiarism
- `complete` - Report ready
- `failed` - Processing error

#### Get Report

```http
GET /api/v1/submissions/{id}/report/

Response 200 OK (if ready):
{
    "success": true,
    "submission_id": "550e8400-e29b-41d4-a716-446655440000",
    "similarity_score": 24.5,
    "processed_at": "2026-01-14T10:05:00Z",
    "filename": "research_paper.pdf",
    "report_url": "https://turnitin.com/report/abc123",
    "pdf_report_url": "https://turnitin.com/pdf/abc123.pdf"
}

Response 202 Accepted (if not ready):
{
    "success": false,
    "message": "Report not yet available. Current status: Processing",
    "status": "processing"
}
```

#### Refresh Status

```http
POST /api/v1/submissions/{id}/refresh_status/

Response 200 OK:
{
    "success": true,
    "submission_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "complete",
    "similarity_score": 24.5,
    "message": "Status updated from Turnitin"
}
```

#### Delete Submission

```http
DELETE /api/v1/submissions/{id}/

Response 204 No Content:
(Empty body)
```

**Restrictions:**
- Cannot delete submissions currently processing
- Deleted submissions cannot be recovered

#### Get Metadata

```http
GET /api/v1/submissions/{id}/metadata/

Response 200 OK:
{
    "success": true,
    "submission_id": "550e8400-e29b-41d4-a716-446655440000",
    "metadata_count": 2,
    "metadata": [
        {
            "status": "complete",
            "similarity_score": 24.5,
            "submitted_at": "2026-01-14T10:00:00Z",
            "processed_at": "2026-01-14T10:05:00Z",
            "error_message": null
        },
        {
            "status": "processing",
            "similarity_score": null,
            "submitted_at": "2026-01-14T10:00:00Z",
            "processed_at": null,
            "error_message": null
        }
    ]
}
```

---

## Webhooks & Events

Webhooks allow you to receive notifications of important events.

### Supported Events

1. **submission.created** - Document submitted
2. **submission.processing** - Processing started
3. **submission.complete** - Report ready
4. **submission.failed** - Processing failed
5. **user.provisioned** - User added to Turnitin

### Webhook Format

```json
{
    "event": "submission.complete",
    "timestamp": "2026-01-14T10:05:00Z",
    "data": {
        "submission_id": "550e8400-e29b-41d4-a716-446655440000",
        "similarity_score": 24.5,
        "report_url": "https://turnitin.com/report/abc123"
    }
}
```

### Configure Webhooks

```http
POST /api/v1/webhooks/
Content-Type: application/json

{
    "url": "https://yourapp.com/webhooks/turnitin",
    "events": ["submission.complete", "submission.failed"],
    "active": true
}

Response 201 Created:
{
    "success": true,
    "webhook": {
        "id": "webhook-123",
        "url": "https://yourapp.com/webhooks/turnitin",
        "events": ["submission.complete", "submission.failed"],
        "active": true,
        "created_at": "2026-01-14T10:00:00Z"
    }
}
```

---

## Rate Limiting

### Limits

| User Type | Requests | Window |
|-----------|----------|--------|
| Anonymous | 100 | 1 hour |
| Authenticated | 1000 | 1 hour |

### Rate Limit Headers

All responses include:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642156800
```

### Exceeding Limits

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
    "success": false,
    "error_code": "rate_limit_exceeded",
    "detail": "Rate limit exceeded. Maximum 1000 requests per hour.",
    "retry_after": 3600
}
```

---

## Security

### HTTPS

All API requests must use HTTPS. HTTP requests are redirected.

```
https://api.turnitinworks.com/api/v1/...
```

### Security Headers

All responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Data Protection

- All credentials encrypted at rest
- Passwords hashed with bcrypt
- Turnitin API keys encrypted with Fernet
- File uploads isolated per user
- PII never logged

### CORS

CORS is configured for specific origins. Custom origins can be whitelisted.

```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Best Practices

### 1. Handle Rate Limiting

```python
import requests
from time import sleep

def submit_with_retry(submission_data, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post(
            'https://api.turnitinworks.com/api/v1/submissions/upload/',
            files={'document': submission_data},
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('X-RateLimit-Reset'))
            sleep(retry_after)
            continue
        
        return response
    
    raise Exception('Max retries exceeded')
```

### 2. Implement Polling

```python
import time

submission_id = response.json()['submission']['id']

while True:
    status = requests.get(
        f'https://api.turnitinworks.com/api/v1/submissions/{submission_id}/status/',
        headers={'Authorization': f'Bearer {token}'}
    ).json()
    
    if status['status'] == 'complete':
        print(f"Similarity: {status['similarity_score']}%")
        break
    elif status['status'] == 'failed':
        print(f"Error: {status.get('error_message')}")
        break
    
    time.sleep(5)  # Check every 5 seconds
```

### 3. Error Handling

```python
try:
    response = requests.post(
        'https://api.turnitinworks.com/api/v1/submissions/upload/',
        files={'document': file},
        headers={'Authorization': f'Bearer {token}'},
        timeout=30
    )
    response.raise_for_status()
    
except requests.exceptions.Timeout:
    print("Request timed out. Please try again.")

except requests.exceptions.HTTPError as e:
    error = e.response.json()
    print(f"Error {error['error_code']}: {error['detail']}")

except Exception as e:
    print(f"Unexpected error: {str(e)}")
```

### 4. Store Tokens Securely

```python
# ❌ DON'T: Store in localStorage
localStorage.setItem('access_token', token)

# ✅ DO: Store in httpOnly cookie
response.set_cookie(
    'access_token',
    token,
    httponly=True,
    secure=True,
    samesite='Strict'
)
```

### 5. Implement Exponential Backoff

```python
import random

def retry_with_backoff(func, max_attempts=5):
    for attempt in range(max_attempts):
        try:
            return func()
        except requests.exceptions.RequestException:
            if attempt == max_attempts - 1:
                raise
            
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
```

---

## Support

For API support, contact: `api-support@turnitinworks.com`

**Response Times:**
- Critical Issues: 1 hour
- High Priority: 4 hours
- Standard: 24 hours

---

## Changelog

### Version 1.0.0 (January 14, 2026)

**New Features:**
- JWT authentication with refresh tokens
- Document submission endpoints
- Real-time status checking
- Similarity report retrieval
- User provisioning automation
- Comprehensive error handling
- Rate limiting
- Security headers

**Documentation:**
- Complete API reference
- Code examples
- Best practices guide
- Error documentation

---

**Last Updated:** January 14, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready
