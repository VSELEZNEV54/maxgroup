import json
import re
import uuid
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

from django.conf import settings
from django.http import Http404, HttpResponse, HttpResponseNotAllowed, HttpResponsePermanentRedirect
from django.middleware.csrf import get_token
from django.template.loader import render_to_string
from django.template.response import TemplateResponse
from lxml import etree, html
from wagtail.models import Site

from backend.catalog.detail import edit_snapshot_detail
from backend.catalog.listing import apply_listing, apply_quiz_prices, lot_url, quiz_inventory, rank_vehicle_options, refresh_card
from backend.catalog.models import CarLot
from . import frontend
from .markup import apply_editor_sections, first, inner, put_image, read_document, release_file, replace_content, valid_link
from .models import SiteContacts, SitePage


def script_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def wire_forms(doc, request):
    forms = doc.xpath("//form[@data-lead-form or contains(concat(' ', @class, ' '), ' q-form ')]")
    if not forms:
        return
    apply_quiz_prices(doc)
    token = get_token(request)
    for form in forms:
        form.set("data-server-lead", "")
        form.set("action", "/api/chat/lead/" if "data-chat-lead" in form.attrib else "/api/leads/")
        form.set("method", "post")
        for name, value in (("csrfmiddlewaretoken", token), ("submission_id", str(uuid.uuid4())), ("page", request.path)):
            etree.SubElement(form, "input", type="hidden", name=name, value=value)
        for name in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid"):
            if request.GET.get(name):
                etree.SubElement(form, "input", type="hidden", name=name, value=request.GET[name][:250])
        err = etree.SubElement(form, "p", {"data-submit-error": "", "class": "form__note", "role": "alert", "hidden": ""})
        err.text = "Заявка не отправлена. Проверьте данные и попробуйте ещё раз."
        for note in form.xpath(".//p[contains(text(),'демонстрационная версия')]"):
            note.getparent().remove(note)
        index = first(form, "./script[@data-quiz-index]")
        if index is not None and "data-quiz-profile" not in form.attrib:
            inventory = quiz_inventory()
            index.text = script_json(inventory)
            make = first(form, ".//select[@name='q-brand']")
            model = first(form, ".//select[@name='q-model']")
            if make is not None and model is not None:
                market = first(form, ".//input[@name='q-country' and @checked]/@value")
                rank_vehicle_options(make, model, inventory, market, first(make, "./option[@selected]/@value"))
    config = first(doc, "//script[@id='q-config']")
    if config is not None:
        values = json.loads(config.text)
        values["endpoint"] = "/api/leads/"
        config.text = script_json(values)


def update_contacts(doc, contacts):
    if contacts.phone:
        tel = "tel:+" + re.sub(r"\D", "", contacts.phone)
        # Only the primary phone is shared. Keep the individual managers' direct lines.
        primary = first(doc, "//header//a[starts-with(@href,'tel:')]/@href")
        if primary:
            for a in doc.xpath("//a[@href=$old]", old=primary):
                a.set("href", tel)
                for el in a.iter():
                    if el.text and len(re.sub(r"\D", "", el.text)) >= 10:
                        el.text = contacts.phone
    if contacts.email:
        for a in doc.xpath("//a[starts-with(@href,'mailto:')]"):
            a.set("href", "mailto:" + contacts.email)
            if "@" in a.text_content():
                replace_content(a, contacts.email)
    foot = first(doc, "//footer")
    if foot is not None and contacts.footer_note:
        etree.SubElement(foot, "p", {"class": "container small"}).text = contacts.footer_note
    if contacts.navigation:
        for nav in [first(doc, "//header//nav"), foot]:
            if nav is not None:
                for block in contacts.navigation:
                    if valid_link(block.value["url"]):
                        etree.SubElement(nav, "a", href=block.value["url"]).text = block.value["label"]


def update_head(doc, *, path, title="", description="", indexable=True, native=False, lot=None):
    head = doc.find("head")
    def meta(attr, key, value):
        if not value:
            return
        el = first(head, f"./meta[@{attr}='{key}']")
        if el is None:
            el = etree.SubElement(head, "meta", {attr: key})
        el.set("content", value)
    if title:
        element = head.find("title")
        if element is None:
            element = etree.SubElement(head, "title")
        element.text = title
        meta("property", "og:title", title)
        meta("name", "twitter:title", title)
    if description:
        meta("name", "description", description)
        meta("name", "twitter:description", description)
        meta("property", "og:description", description)
    canonical = settings.SEO_ORIGIN + path
    link = first(head, "./link[@rel='canonical']")
    if link is None:
        link = etree.SubElement(head, "link", rel="canonical")
    link.set("href", canonical)
    meta("property", "og:url", canonical)
    meta("name", "robots", "index, follow, max-image-preview:large" if indexable and settings.SITE_INDEXABLE else "noindex, follow")
    for script in head.xpath("./script[@type='application/ld+json']"):
        graph = json.loads(script.text)
        if "@graph" not in graph:
            continue
        if native:
            graph["@graph"] = [item for item in graph["@graph"] if item.get("@type") == "WebSite" or "Organization" in (item.get("@type") or [])]
            if lot:
                product = {"@type": "Vehicle", "name": lot.title, "url": canonical, "modelDate": str(lot.year or "")}
                if lot.display_price is not None and not lot.partial:
                    product["offers"] = {"@type": "Offer", "priceCurrency": "RUB", "price": lot.display_price, "url": canonical}
                graph["@graph"].append(product)
        if title:
            for item in graph["@graph"]:
                if item.get("@type") == "BreadcrumbList" and item.get("itemListElement"):
                    item["itemListElement"][-1].update(name=title, item=canonical)
                if lot and "Car" in (item.get("@type") or []):
                    item["name"] = lot.title
                    if lot.editor_price is not None and "offers" in item:
                        item["offers"]["price"] = lot.editor_price
                    if lot.cover_id:
                        src = lot.cover.get_rendition("width-960").url
                        item["image"] = [src if src.startswith("https://") else settings.SEO_ORIGIN + src]
        script.text = script_json(graph)


def edit_offer_detail(main, lot):
    """Редакторские поля дополняют объявление с его исходной комплектацией и номером."""
    if lot.editor_name:
        first(main, ".//h1").text = lot.title
        number = lot.external_id.removeprefix("lot-")
        for cta in main.xpath(".//*[@data-modal-car]"):
            cta.set("data-modal-title", "Заявка на " + lot.title)
            cta.set("data-modal-car", f"{lot.title} · № {number}")
            cta.set("data-modal-subject", f"Заявка на {lot.title}, объявление № {number}")
    if lot.editor_price is not None:
        replace_content(first(main, ".//*[@class='buybox__price-value']"), lot.price_text)
    if lot.cover_id:
        gallery = first(main, ".//*[@data-gallery-item]")
        photo = first(gallery, ".//img")
        put_image(photo, lot.cover)
        photo.attrib.pop("data-offer-photo", None)
        gallery.set("href", photo.get("src"))
        gallery.set("data-alt", photo.get("alt"))
        for caption in gallery.xpath(".//*[@class='model-photo-caption']"):
            caption.set("hidden", "")
    if lot.description:
        specs = first(main, ".//dl[contains(concat(' ', @class, ' '), ' spec ')]")
        paragraph = etree.Element("p", {"class": "prose"})
        paragraph.text = lot.description
        specs.addprevious(paragraph)


def public_page(request, page, *, lot=None, number=1):
    if request.method not in ("GET", "HEAD"):
        return HttpResponseNotAllowed(["GET", "HEAD"])
    if not page.source_present or page.kind == "routing":
        raise Http404
    base_url = page.get_url(request=request) or "/"
    if number == 1 and request.path.endswith("/page/1/"):
        return HttpResponsePermanentRedirect(base_url)
    path = lot_url(lot) if lot else (base_url if number == 1 else f"{base_url}page/{number}/")
    original = lot.source_path if lot else page.source_path
    native = not original
    content_blocks = {} if frontend.wants_page(request) else None
    doc = read_document(original or "/uslugi/")
    main = first(doc, "//main")
    title = description = ""
    if lot:
        raw = lot.attributes
        if native or lot.editor_price is not None or lot.description or lot.editor_name or lot.cover_id:
            if original and lot.source == "model-offers":
                edit_offer_detail(main, lot)
            elif original:
                edit_snapshot_detail(main, lot)
            else:
                for el in list(main):
                    main.remove(el)
                if content_blocks is not None:
                    frontend.add_block(main, content_blocks, frontend.vehicle_data(lot))
                else:
                    photos = [lot.photo_url(p) for p in raw.get("photos", [])]
                    main.append(html.fragment_fromstring(render_to_string("website/native_lot.html", {"lot": lot, "photos": photos})))
            title = lot.title + " | Макс Групп"
            description = lot.description[:180] or f"{lot.title}. {lot.price_text} {lot.price_label}."
    else:
        if main is not None:
            apply_editor_sections(main, page, content_blocks)
        if native and main is not None:
            if content_blocks is not None:
                frontend.add_block(main, content_blocks, {"type": "heading", "title": page.title}, index=0)
            else:
                header = etree.Element("section", {"class": "section section--sm"})
                etree.SubElement(etree.SubElement(header, "div", {"class": "container"}), "h1").text = page.title
                main.insert(0, header)
        if not native and page.title != page.source_heading:
            heading = first(doc, "//h1")
            if heading is not None:
                replace_content(heading, page.title)
        title = page.seo_title or (page.title if native or page.title != page.source_heading else "")
        description = page.search_description or (page.title if native else "")
        apply_listing(doc, page, request, number, content_blocks=content_blocks)
        for inventory in doc.xpath("//*[@data-model-offers]"):
            # Список уже учитывает актуальную публикацию, цены и фильтры Django.
            inventory.set("data-model-offers", "")
        if number > 1:
            title = (title or doc.find("head/title").text or page.title) + f" · Страница {number}"
    # Shared price/name overrides also apply to hand-picked cars on editorial pages.
    cards = doc.xpath("//*[@data-car]")
    if cards:
        lots = {v.external_id: v for v in CarLot.objects.filter(source="snapshot", external_id__in=[c.get("data-car") for c in cards]).select_related("cover")}
        for card in cards:
            record = lots.get(card.get("data-car"))
            if record and not (record.available and record.source_present):
                card.getparent().remove(card)
            elif record:
                refresh_card(card, record)
    active_filter = any(control.get("name") in request.GET and bool(request.GET[control.get("name")])
                        for control in doc.xpath("//*[@data-server-catalog]//*[@data-filter or @data-sort][@name]"))
    update_head(doc, path=path, title=title, description=description,
                indexable=(lot.allow_index if lot else page.allow_index) and not active_filter,
                native=native, lot=lot)
    update_contacts(doc, SiteContacts.for_request(request))
    wire_forms(doc, request)
    return document_response(request, doc, blocks=content_blocks)


def document_response(request, doc, status=200, blocks=None):
    if frontend.wants_page(request):
        return frontend.as_json(doc, status, blocks)
    from django.utils.html import format_html_join
    body = doc.find("body")
    attrs = format_html_join("", ' {}="{}"', ((k, v) for k,v in body.attrib.items() if k != "class"))
    return TemplateResponse(request, "website/document.html", {
        "head": inner(doc.find("head")), "body": inner(body), "body_class": body.get("class", ""),
        "body_attributes": attrs,
        "html_attributes": format_html_join("", ' {}="{}"', doc.attrib.items()),
    }, status=status)


def not_found(request, exception=None):
    doc = read_document("/404.html")
    wire_forms(doc, request)
    return document_response(request, doc, status=404)


def robots(request):
    if not settings.SITE_INDEXABLE:
        return HttpResponse("User-agent: *\nDisallow: /\n", content_type="text/plain")
    text = release_file("/robots.txt").read_text()
    text = re.sub(r"(?m)^Sitemap: .+$", "Sitemap: " + settings.SEO_ORIGIN + "/sitemap.xml", text)
    return HttpResponse(text, content_type="text/plain")


def sitemap(request):
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    ET.register_namespace("", ns["sm"])
    ET.register_namespace("image", "http://www.google.com/schemas/sitemap-image/1.1")
    old = ET.parse(release_file("/sitemap.xml"))
    source = {urlsplit(el.findtext("sm:loc", namespaces=ns)).path: el for el in old.getroot()}
    root = ET.Element("{%s}urlset" % ns["sm"])
    site = Site.find_for_request(request)
    pages = SitePage.objects.descendant_of(site.root_page, inclusive=True).live().public().filter(source_present=True)
    base_path = site.root_page.url_path
    def url_path(p):
        return "/" + p.url_path[len(base_path):]
    urls = [(url_path(p), p.last_published_at, bool(p.live_revision and p.live_revision.user_id))
            for p in pages.filter(allow_index=True).exclude(kind="routing").select_related("live_revision")
            .only("url_path", "last_published_at", "live_revision__user_id")]
    urls.extend((url_path(l.parent) + l.slug + "/", l.updated_at,
                 bool(l.editor_name or l.editor_price is not None or l.cover_id or l.description))
                for l in CarLot.objects.filter(
        available=True, source_present=True, allow_index=True, parent__in=pages)
        .select_related("parent").only("slug", "updated_at", "parent__url_path", "editor_name", "editor_price", "cover", "description"))
    for path, modified, edited in urls:
        elem = source.get(path)
        if elem is None:
            elem = ET.Element("{%s}url" % ns["sm"])
            ET.SubElement(elem, "{%s}loc" % ns["sm"])
        elem.find("sm:loc", ns).text = settings.SEO_ORIGIN + path
        if modified and (edited or path not in source):
            mod = elem.find("sm:lastmod", ns)
            if mod is None:
                mod = ET.SubElement(elem, "{%s}lastmod" % ns["sm"])
            mod.text = modified.date().isoformat()
        root.append(elem)
    return HttpResponse(ET.tostring(root, encoding="utf-8", xml_declaration=True), content_type="application/xml")


def release_asset(request, filename):
    from django.http import FileResponse
    types = {"favicon.ico": "image/x-icon", "site.webmanifest": "application/manifest+json", "llms.txt": "text/plain"}
    return FileResponse(release_file("/" + filename).open("rb"), content_type=types[filename])
