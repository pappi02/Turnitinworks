"""
Signals for Turnitin integration.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.turnitin.models import TurnitinProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_turnitin_profile(sender, instance, created, **kwargs):
    """
    Create Turnitin profile when a new user is created.
    This signal will trigger the provisioning process.
    """
    if created:
        TurnitinProfile.objects.get_or_create(user=instance)
