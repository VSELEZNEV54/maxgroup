import json
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.db import connection
from django.http import HttpResponse, JsonResponse


class JsonLogFormatter(logging.Formatter):
    def format(self, record):
        event = {"time": datetime.now(timezone.utc).isoformat(), "level": record.levelname,
                 "component": record.name, "event": record.getMessage()}
        event.update(getattr(record, "fields", {}))
        return json.dumps(event, ensure_ascii=False)


class RequestLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = uuid.uuid4().hex
        start = time.monotonic()
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        if not settings.SITE_INDEXABLE:
            response["X-Robots-Tag"] = "noindex, nofollow"
        if request.path != "/health/":
            logging.getLogger("maxgroup.web").info("request", extra={"fields": {
                "request_id": request.request_id, "method": request.method,
                "path": request.path[:512], "status": response.status_code,
                "ms": round(1000 * (time.monotonic() - start)),
            }})
        return response


def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"status": "ok"})


def sendfile(request, filename, *, mimetype):
    """Wagtail authorises the document before Nginx handles ranges and file delivery."""
    relative = Path(filename).resolve().relative_to((settings.MEDIA_ROOT / "documents").resolve())
    response = HttpResponse(content_type=mimetype)
    response["X-Accel-Redirect"] = "/_documents/" + quote(relative.as_posix())
    return response
