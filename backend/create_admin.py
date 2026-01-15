#!/usr/bin/env python
"""Create or update admin superuser"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Admin credentials
USERNAME = 'admin'
EMAIL = 'admin@turnitin.com'
PASSWORD = 'Admin123456!'  # Meets Django's password requirements

# Create or update admin user
if User.objects.filter(username=USERNAME).exists():
    user = User.objects.get(username=USERNAME)
    user.set_password(PASSWORD)
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.save()
    print(f'✓ Admin user updated successfully!')
else:
    user = User.objects.create_superuser(USERNAME, EMAIL, PASSWORD)
    print(f'✓ Admin user created successfully!')

print(f'\nLogin credentials:')
print(f'Username: {USERNAME}')
print(f'Password: {PASSWORD}')
print(f'\nAccess admin at: http://localhost:8000/admin')
