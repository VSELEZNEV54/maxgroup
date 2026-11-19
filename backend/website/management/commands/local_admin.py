import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Создать первого локального администратора из закрытого окружения"

    def handle(self, **options):
        password = os.environ.get("LOCAL_ADMIN_PASSWORD")
        if not password:
            return
        if settings.SITE_INDEXABLE:
            raise CommandError("Для рабочего сайта используйте createsuperuser")
        user = os.environ.get("LOCAL_ADMIN_USER", "manager")
        User = get_user_model()
        if not User.objects.filter(username=user).exists():
            User.objects.create_superuser(username=user, email="", password=password)
            self.stdout.write("Локальный администратор создан")
