from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from backend.leads.models import Delivery


class Command(BaseCommand):
    help = "Повторить доставку после сверки с рабочей CRM"

    def add_arguments(self, parser):
        parser.add_argument("delivery_id", type=int)
        parser.add_argument("--confirmed-absent", action="store_true")

    def handle(self, delivery_id, confirmed_absent, **options):
        if not settings.CRM_ENABLED or not confirmed_absent:
            raise CommandError("Проверьте ID заявки в CRM, затем укажите --confirmed-absent в среде доставки")
        changed = Delivery.objects.filter(pk=delivery_id, status=Delivery.State.REVIEW).update(
            status=Delivery.State.PENDING, next_attempt=timezone.now(), error="", attempts=0)
        if not changed:
            raise CommandError("Требуется запись со статусом «Нужна сверка»")
        self.stdout.write("Доставка возвращена в очередь")
