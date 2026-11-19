from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .integrations import DeliveryError, RetryLater, Uncertain, connector
from .models import Delivery


@shared_task
def dispatch_pending():
    if not settings.CRM_ENABLED:
        return
    now = timezone.now()
    states = [Delivery.State.PENDING, Delivery.State.SENDING]
    ids = Delivery.objects.filter(status__in=states, next_attempt__lte=now).order_by("next_attempt")
    for pk in ids.values_list("pk", flat=True)[:200]:
        send_delivery.delay(pk)


@shared_task
def send_delivery(pk):
    if not settings.CRM_ENABLED:
        return
    with transaction.atomic():
        row = Delivery.objects.select_for_update().select_related("lead").get(pk=pk)
        pending = row.status == Delivery.State.PENDING
        if (not pending and row.status != Delivery.State.SENDING) or row.next_attempt > timezone.now():
            return
        row.attempts += 1
        attempt = row.attempts
        row.status = Delivery.State.SENDING
        row.next_attempt = timezone.now() + timedelta(minutes=5)
        row.save(update_fields=["status", "attempts", "next_attempt"])
    status, external, error = Delivery.State.SENT, "", ""
    due = timezone.now() + timedelta(seconds=min(3600, 30 * 2 ** min(attempt, 7)))
    try:
        api = connector(row.crm)
        external = api.find(row.lead)
        if not external:
            if not pending:
                raise DeliveryError("Исход предыдущей отправки неизвестен. Сверьте запись в CRM.")
            external = api.create(row.lead)
        if not external or not external.isdigit():
            raise Uncertain("CRM не подтвердила внешний ID")
    except RetryLater as exc:
        status = (Delivery.State.PENDING if pending else Delivery.State.SENDING) if attempt < 8 else Delivery.State.REVIEW
        error = str(exc)
    except Uncertain as exc:
        status, error = Delivery.State.SENDING, str(exc)
    except DeliveryError as exc:
        status, error = Delivery.State.REVIEW, str(exc)
    except (ValueError, TypeError, KeyError, IndexError, AttributeError):
        status, error = Delivery.State.REVIEW, "Неожиданный формат ответа. Сверьте запись в CRM."
    Delivery.objects.filter(pk=pk, status=Delivery.State.SENDING, attempts=attempt).update(
        status=status, error=error, next_attempt=due, external_id=external if status == Delivery.State.SENT else "")
