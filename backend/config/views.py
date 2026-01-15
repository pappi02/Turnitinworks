"""
Landing page view for Turnitin API
"""
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import status


def api_root(request):
    """
    Root landing page for Turnitin API
    """
    if request.headers.get('Accept') == 'application/json':
        # Return JSON for API clients
        return JsonResponse({
            'name': 'TextVerity API',
            'version': '1.0.0',
            'status': 'operational',
            'endpoints': {
                'admin': '/admin/',
                'api_documentation': '/api/docs/',
                'api_schema': '/api/schema/',
                'redoc': '/api/redoc/',
                'api_v1': {
                    'auth': '/api/v1/auth/',
                    'submissions': '/api/v1/submissions/',
                    'turnitin': '/api/v1/turnitin/',
                }
            }
        })
    
    # Return HTML landing page for browser requests
    return render(request, 'landing.html')
