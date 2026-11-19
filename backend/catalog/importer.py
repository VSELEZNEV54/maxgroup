import re
from datetime import date

from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.utils import timezone
from wagtail.models import Site

from backend.website.models import SitePage
from .models import CarLot, ImportRun


def identifier(value, label, limit):
    if not isinstance(value, str) or not re.fullmatch(r"[a-zA-Z0-9_-]+", value) or len(value) > limit:
        raise ValueError("Некорректный " + label)
    return value


def number(row, key, limit):
    value = row.get(key)
    if value is None or value == "":
        return None
    raw = str(value)
    if not raw.isascii() or not raw.isdigit() or len(raw) > 13 or int(raw) > limit:
        raise ValueError("Некорректное число в поле " + key)
    return int(raw)


def flag(row, key, default):
    value = str(row.get(key, default)).lower()
    if value not in ("1", "0", "true", "false"):
        raise ValueError("Некорректное значение " + key)
    return value in ("true", "1")


def import_rows(source, rows):
    identifier(source, "код поставщика", 48)
    if source in {"snapshot", "model-offers", "manual"}:
        raise ValueError("Выберите отдельный код поставщика")
    run = ImportRun.objects.create(source=source)
    try:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", ["catalog:" + source])
            site_root = Site.objects.get(is_default_site=True).root_page
            branch = SitePage.objects.descendant_of(site_root).live().public().filter(source_present=True)
            parents = {"/" + p.url_path[len(site_root.url_path):]: p for p in
                       branch.filter(depth=site_root.depth + 3).only("url_path")}
            seen = set()
            for index, row in enumerate(rows, 1):
                if not isinstance(row, dict):
                    raise ValueError(f"Строка {index}: ожидается объект")
                key = identifier(row.get("external_id"), "внешний ID", 180)
                if key in seen:
                    raise ValueError(f"Строка {index}: повтор внешнего ID")
                seen.add(key)
                parent = parents.get(row.get("parent_path"))
                if parent is None:
                    raise ValueError(f"Строка {index}: укажите опубликованный путь модели")
                country = {"avto-iz-yaponii": "japan", "avto-iz-korei": "korea", "avto-iz-kitaya": "china"}
                parts = row["parent_path"].strip("/").split("/")
                if len(parts) != 3 or parts[0] not in country:
                    raise ValueError("Некорректный путь модели")
                lot = CarLot.objects.filter(source=source, external_id=key).first()
                slug = identifier(row.get("slug") or (lot.slug if lot else key), "адрес лота", 180)
                if lot and (lot.parent_id != parent.pk or lot.slug != slug):
                    raise ValueError(f"Строка {index}: смена опубликованного адреса требует перенаправления")
                name = row.get("name")
                if not isinstance(name, str) or not name.strip():
                    raise ValueError(f"Строка {index}: требуется название")
                values = {"parent_id": parent.pk, "slug": slug, "name": name.strip(), "country": country[parts[0]],
                          "brand": parts[1], "model": parts[2], "year": number(row, "year", date.today().year + 2),
                          "price": number(row, "price", 99999999999), "mileage": number(row, "mileage", 9999999),
                          "source_present": flag(row, "available", True), "partial": flag(row, "partial", False),
                          "price_label": row.get("price_label") or ""}
                photos = row.get("photos") or []
                if isinstance(photos, str):
                    photos = [p.strip() for p in photos.split("|") if p.strip()]
                if not isinstance(photos, list) or len(photos) > 80 or not all(
                    isinstance(p, str) and len(p) <= 2048 and (p.startswith("https://") or p.startswith("/assets/"))
                    for p in photos):
                    raise ValueError(f"Строка {index}: некорректные адреса фотографий")
                values["attributes"] = {"photos": photos}
                if lot is None:
                    lot = CarLot(source=source, external_id=key)
                if lot.pk and all(getattr(lot, k) == v for k,v in values.items()):
                    continue
                for k, v in values.items():
                    setattr(lot, k, v)
                lot.full_clean()
                lot.save()
            run.applied, run.finished_at = len(seen), timezone.now()
            run.save(update_fields=["applied", "finished_at"])
    except Exception as exc:
        message = str(exc)[:300] if isinstance(exc, (ValueError, ValidationError)) else "Сбой импорта: " + type(exc).__name__
        ImportRun.objects.filter(pk=run.pk).update(error=message, finished_at=timezone.now())
        raise
    return run
