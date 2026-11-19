from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Создать стартовые роли для работы с журналами"

    @transaction.atomic
    def handle(self, **options):
        roles = {
            "Менеджеры заявок": (("leads", "view_lead"), ("leads", "view_delivery")),
            "Сопровождение каталога": (("catalog", "view_importrun"), ("catalog", "view_carlot")),
        }
        for name, permissions in roles.items():
            group, created = Group.objects.get_or_create(name=name)
            if created:
                for app, code in (("wagtailadmin", "access_admin"), *permissions):
                    group.permissions.add(Permission.objects.get(content_type__app_label=app, codename=code))
