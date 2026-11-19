import json
import re
import uuid
from urllib.parse import urlsplit

from django.conf import settings
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST

from .models import Delivery, Lead


@require_GET
@never_cache
def form_context(request):
    """Подключает форму локального предпросмотра к тому же журналу, что и страницы Django."""
    return JsonResponse({"csrf": get_token(request), "submission_id": str(uuid.uuid4())})


def normalise(payload):
    if not isinstance(payload, dict):
        raise ValueError("Ожидается форма заявки.")
    def field(name, limit):
        value = payload.get(name, "")
        if not isinstance(value, str) or len(value) > limit:
            raise ValueError("Проверьте поле " + name)
        return value.strip()
    try:
        submission = uuid.UUID(field("submission_id", 36))
    except ValueError:
        raise ValueError("Обновите страницу формы и попробуйте снова.") from None
    phone = re.sub(r"[\s()+-]", "", field("phone", 40))
    if not re.fullmatch(r"[78][0-9]{10}", phone):
        raise ValueError("Введите телефон полностью.")
    if payload.get("agree") not in (True, "on", "1", "true"):
        raise ValueError("Нужно согласие на обработку данных.")
    page = field("page", 512)
    if not page.startswith("/") or page.startswith("//") or urlsplit(page).netloc:
        raise ValueError("Некорректная страница заявки.")
    excluded = {"csrfmiddlewaretoken", "submission_id", "name", "phone", "page", "agree", "subject", "createdAt"}
    details = {k: v for k,v in payload.items() if k not in excluded and v not in (None, "")}
    if len(json.dumps(details, ensure_ascii=False).encode()) > 24000:
        raise ValueError("Слишком большой объём данных.")
    return submission, {"phone": "+7" + phone[1:], "name": field("name", 150),
                        "subject": field("subject", 250) or "Заявка с сайта", "page": urlsplit(page).path,
                        "consent": True, "details": details}


@require_POST
def collect(request):
    wants_json = request.content_type == "application/json" or "application/json" in request.headers.get("Accept", "")
    def error(message, status):
        if wants_json:
            return JsonResponse({"error": message}, status=status)
        return render(request, "website/lead_status.html", {"message": message}, status=status)
    if int(request.META.get("CONTENT_LENGTH") or 0) > 65536:
        return error("Слишком большая заявка.", 413)
    try:
        data = json.loads(request.body) if request.content_type == "application/json" else request.POST.dict()
        key, values = normalise(data)
    except (ValueError, UnicodeDecodeError, RecursionError):
        return error("Проверьте телефон, согласие и поля формы.", 400)
    with transaction.atomic():
        lead, created = Lead.objects.get_or_create(submission_id=key, defaults=values)
        if created:
            state = Delivery.State.PENDING if settings.CRM_ENABLED else Delivery.State.LOCAL
            Delivery.objects.bulk_create([Delivery(lead=lead, crm=crm, status=state)
                                          for crm in dict.fromkeys(settings.CRM_DESTINATIONS)])
        elif any(getattr(lead, k) != v for k,v in values.items()):
            return error("Эта форма уже отправлена. Для новой заявки обновите страницу.", 409)
    if wants_json:
        return JsonResponse({"id": str(lead.pk), "accepted": True, "next_submission_id": str(uuid.uuid4())},
                            status=201 if created else 200)
    return render(request, "website/lead_status.html", {"message": "Заявка принята. Спасибо!", "page": values["page"]})
