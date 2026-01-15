"""
Django app configuration for config package
"""
from django.apps import AppConfig


class ConfigAppConfig(AppConfig):
    name = 'config'
    verbose_name = 'TextVerity Configuration'
    
    def ready(self):
        """Import admin customizations when app is ready"""
        from . import admin
