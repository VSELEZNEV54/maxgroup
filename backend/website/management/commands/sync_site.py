import json
from pathlib import PurePosixPath
from urllib.parse import urlsplit

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from wagtail.models import Page, Site

from backend.catalog.models import CarLot
from backend.website.markup import first, layout_defaults, layout_hash, read_document
from backend.website.models import SitePage


def parent_path(path):
    return path.rstrip("/").rsplit("/", 1)[0] + "/"


def merge_layout(page, defaults):
    """Keep editor deletions, ordering, changes and block IDs when a source section arrives."""
    blocks = list(page.body.get_prep_value())
    previous = set(page.source_section_keys)
    positions = {v["value"]["key"]: v for v in blocks if v["type"] == "original"}
    for i, (_, value) in enumerate(defaults):
        key = value["key"]
        if key in positions:
            positions[key]["value"]["caption"] = value["caption"]
        elif previous and key not in previous:
            block = {"type": "original", "value": value}
            following = next((positions[d["key"]] for _, d in defaults[i + 1:] if d["key"] in positions), None)
            blocks.insert(blocks.index(following) if following else len(blocks), block)
            positions[key] = block
    return blocks


class Command(BaseCommand):
    help = "Синхронизировать текущий макет, страницы и автомобили с сохранением редакторских правок"

    @transaction.atomic
    def handle(self, **options):
        root = settings.RELEASE_DIR
        manifest = root / "source-manifest.json"
        if not manifest.is_file():
            raise CommandError("Требуется выпуск с --django. Выполните make up.")
        source = json.loads(manifest.read_text())
        if source.get("version") != 1:
            raise CommandError("Неизвестная версия манифеста")
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [657194021])
        entries = {p["path"]: p for p in source["pages"] if p["kind"] not in ("car", "notFound")}
        car_pages = {p["path"]: p for p in source["pages"] if p["kind"] == "car"}
        for directory in sorted((root / "kvizy").rglob("index.html")):
            path = "/" + str(directory.parent.relative_to(root)) + "/"
            doc = read_document(path)
            heading = first(doc, "//h1")
            entries[path] = {"path": path, "heading": heading.text_content().strip() if heading is not None else "Подбор автомобиля",
                             "kind": "quiz", "indexable": False}

        # An existing deep URL can legitimately have no public landing at its parent URL.
        for path in list(entries):
            ancestor = parent_path(path)
            while ancestor not in entries:
                entries[ancestor] = {"kind": "routing", "heading": PurePosixPath(ancestor).name,
                                     "indexable": False}
                ancestor = parent_path(ancestor)
        saved = {p.source_path: p for p in SitePage.objects.exclude(source_path="")}
        tree_root = Page.get_first_root_node()
        changes = 0
        for path in sorted(entries, key=lambda s: (s.count("/"), s)):
            record = entries[path]
            defaults = [] if record["kind"] == "routing" else layout_defaults(read_document(path))
            digest = layout_hash(defaults)
            keys = [v["key"] for _,v in defaults]
            heading = " ".join(record["heading"].split())[:255]
            page = saved.get(path)
            if page is None:
                parent = tree_root if path == "/" else saved.get(parent_path(path))
                if parent is None:
                    raise CommandError(f"Без родительской страницы: {path}")
                slug = "max-group" if path == "/" else PurePosixPath(path).name
                page = SitePage(title=heading, slug=slug, source_heading=heading, source_path=path,
                                kind=record["kind"], allow_index=record["indexable"],
                                source_layout_hash=digest, source_section_keys=keys, body=defaults)
                parent.add_child(instance=page)
                page.save_revision().publish()
                saved[path] = page
                changes += 1
                continue
            # A revision can be edited or awaiting publication. Never publish a draft from an import.
            dirty = []
            if page.kind != record["kind"]:
                if page.kind == "routing" or record["kind"] == "routing":
                    page.allow_index = record["indexable"]
                    dirty.append("allow_index")
                page.kind = record["kind"]
                dirty.append("kind")
            if not page.source_present:
                page.source_present = True
                dirty.append("source_present")
            if not page.has_unpublished_changes:
                if page.source_heading != heading:
                    if page.title == page.source_heading:
                        page.title = heading
                        dirty.append("title")
                    page.source_heading = heading
                    dirty.append("source_heading")
                if page.source_layout_hash != digest:
                    page.body = merge_layout(page, defaults)
                    dirty.append("body")
                    page.source_layout_hash = digest
                    dirty.append("source_layout_hash")
                if page.source_section_keys != keys:
                    page.source_section_keys = keys
                    dirty.append("source_section_keys")
            if dirty:
                page.save(update_fields=dirty)
                if page.live and not page.has_unpublished_changes:
                    page.save_revision().publish()
                changes += 1
        SitePage.objects.exclude(source_path="").exclude(source_path__in=entries).update(source_present=False)
        origin = urlsplit(settings.PUBLIC_ORIGIN)
        site = Site.objects.filter(is_default_site=True).first() or Site(is_default_site=True)
        site.hostname, site.port = origin.hostname, origin.port or (443 if origin.scheme == "https" else 80)
        site.root_page = saved["/"]
        site.site_name = "Макс Групп"
        site.save()

        ids = {"snapshot": set(), "model-offers": set()}
        existing = {(lot.source, lot.external_id): lot for lot in CarLot.objects.filter(source__in=ids)}
        for row in source["cars"]:
            path = row["url"]
            provider = row.get("importProvider", "snapshot")
            ids[provider].add(row["id"])
            values = {
                "parent_id": saved[parent_path(path)].pk, "slug": PurePosixPath(path).name,
                "name": row["titleYear"], "country": row["country"], "brand": row["brandSlug"],
                "model": row["modelSlug"], "year": row.get("year"), "mileage": row.get("mileageKm"),
                "price": row.get("priceRub"), "price_label": row.get("priceLabel") or "",
                "partial": bool(row.get("priceIsPartial")), "source_path": path, "attributes": row, "source_present": True,
            }
            lot = existing.get((provider, row["id"]))
            if lot is None:
                CarLot.objects.create(source=provider, external_id=row["id"], allow_index=car_pages[path]["indexable"], **values)
            else:
                changed = [k for k,v in values.items() if getattr(lot, k) != v]
                if changed:
                    for k in changed:
                        setattr(lot, k, values[k])
                    lot.save(update_fields=[*changed, "updated_at"])
        for provider, keys in ids.items():
            CarLot.objects.filter(source=provider).exclude(external_id__in=keys).update(source_present=False)
        self.stdout.write(f"Страниц Wagtail {len(entries)}, изменено {changes}, автомобилей {sum(map(len, ids.values()))}")
