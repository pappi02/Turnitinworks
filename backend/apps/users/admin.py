"""
Django admin configuration for users app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from apps.users.models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin interface for CustomUser model."""
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'avatar', 'bio')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'last_login_at', 'date_joined')}),
        (_('Account security'), {
            'fields': ('is_email_verified', 'is_locked', 'locked_until', 'login_attempts'),
            'classes': ('collapse',)
        }),
        (_('Preferences'), {'fields': ('notification_email',)}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
    )
    
    list_display = ('email', 'get_full_name', 'is_active', 'is_email_verified', 'created_at')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'is_email_verified', 'is_locked', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_login_at', 'date_joined')
    
    def get_full_name(self, obj):
        return obj.get_display_name()
    get_full_name.short_description = _('Full Name')
