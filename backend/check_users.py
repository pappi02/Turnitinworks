import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print(f"{'Username':<20} {'Email':<30} {'Is Active':<10}")
print("-" * 60)
for user in User.objects.all():
    print(f"{user.username:<20} {user.email:<30} {user.is_active:<10}")
