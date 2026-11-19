import json
import os
from urllib.parse import urlsplit

import requests
from celery import shared_task
from django.utils import timezone

from .importer import import_rows
from .models import ImportRun


@shared_task
def refresh_configured_feed():
    url, source = os.environ.get("CATALOG_FEED_URL"), os.environ.get("CATALOG_FEED_SOURCE")
    if not url or not source:
        return
    try:
        if urlsplit(url).scheme != "https":
            raise ValueError("Требуется HTTPS")
        with requests.get(url, timeout=(5, 30), stream=True, allow_redirects=False) as response:
            if response.status_code != 200:
                raise ValueError(f"Поставщик HTTP {response.status_code}")
            data = bytearray()
            for chunk in response.iter_content(65536):
                data.extend(chunk)
                if len(data) > 32 * 1024 * 1024:
                    raise ValueError("Выгрузка превышает 32 МБ")
        rows = json.loads(data)
        if not isinstance(rows, list):
            raise ValueError("Ожидается JSON-массив")
    except (ValueError, requests.RequestException) as exc:
        ImportRun.objects.create(source=source, finished_at=timezone.now(), error="Выгрузка недоступна: " + type(exc).__name__)
        return
    import_rows(source, rows)
