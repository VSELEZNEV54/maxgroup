import uuid

from django.db import models
from django.utils import timezone


class Lead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission_id = models.UUIDField(unique=True, editable=False)
    created_at = models.DateTimeField("Получена", auto_now_add=True)
    name = models.CharField("Имя", max_length=150, blank=True)
    phone = models.CharField("Телефон", max_length=20)
    subject = models.CharField("Тема", max_length=250)
    page = models.CharField("Страница", max_length=512)
    consent = models.BooleanField("Согласие")
    details = models.JSONField("Данные формы", default=dict)

    class Meta:
        verbose_name = "Заявка"
        verbose_name_plural = "Заявки"

    def __str__(self):
        return f"{self.subject} · {str(self.pk)[:8]}"


class Delivery(models.Model):
    class State(models.TextChoices):
        LOCAL = "local", "Сохранена локально"
        PENDING = "pending", "Ожидает"
        SENDING = "sending", "Отправляется"
        SENT = "sent", "Доставлена"
        REVIEW = "review", "Нужна сверка"

    lead = models.ForeignKey(Lead, related_name="deliveries", on_delete=models.CASCADE, verbose_name="Заявка")
    crm = models.CharField("CRM", max_length=12, choices=[("amo", "amoCRM"), ("bitrix", "Битрикс24")])
    status = models.CharField("Состояние", max_length=10, choices=State.choices, db_index=True)
    attempts = models.PositiveIntegerField("Попытки", default=0)
    next_attempt = models.DateTimeField("Следующая проверка", default=timezone.now, db_index=True)
    external_id = models.CharField("ID в CRM", max_length=100, blank=True)
    error = models.CharField("Последняя ошибка", max_length=200, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["lead", "crm"], name="unique_lead_crm")]
        verbose_name = "Доставка"
        verbose_name_plural = "Доставка в CRM"

    def __str__(self):
        return f"{self.crm} · {self.lead_id}"
