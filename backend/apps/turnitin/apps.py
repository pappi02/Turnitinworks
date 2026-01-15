from django.apps import AppConfig


class TurnitinConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.turnitin'
    verbose_name = 'Turnitin Integration'
    
    def ready(self):
        import apps.turnitin.signals
        import apps.turnitin.task_signals
