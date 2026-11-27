"""Published page content for Next.js. Wagtail still resolves routes, revisions and permissions."""
from django.http import JsonResponse
from django.utils.cache import patch_vary_headers
from lxml import etree, html
from wagtail.rich_text import expand_db_html

from .markup import inner


CONTENT_TYPE = "application/vnd.maxgroup.page.v1+json"


def wants_page(request):
    return request.headers.get("Accept") == CONTENT_TYPE or getattr(request, "maxgroup_frontend_preview", False)


def image_data(image, spec="width-960"):
    if image is None:
        return None
    rendition = image.get_rendition(spec)
    return {"url": rendition.url, "width": rendition.width, "height": rendition.height,
            "alt": image.default_alt_text or image.title}


def editorial_data(block):
    value = block.value
    if block.block_type == "section":
        return {"type": "text", "heading": value["heading"], "richText": str(expand_db_html(value["text"].source)),
                "image": image_data(value.get("image"))}
    if block.block_type == "link":
        return {"type": "link", "label": value["label"], "url": value["url"]}
    if block.block_type == "video":
        return {"type": "video", "title": value["title"], "url": value["video"].url,
                "poster": image_data(value.get("poster"))}
    raise ValueError(f"Неизвестный редакторский блок: {block.block_type}")


def vehicle_data(lot):
    return {"type": "vehicle", "title": lot.title, "description": lot.description,
            "price": lot.price_text, "priceLabel": lot.price_label, "year": lot.year, "mileage": lot.mileage,
            "cover": image_data(lot.cover),
            "photos": [lot.photo_url(photo) for photo in lot.attributes.get("photos", [])]}


def listing_card_data(lot, url):
    photos = lot.attributes.get("photos") or []
    image = image_data(lot.cover, "width-480" if lot.source == "snapshot" else "fill-480x320")
    if image is None and photos:
        image = {"url": lot.photo_url(photos[0]), "alt": lot.title, "width": 480, "height": 320}
    return {"type": "listingCard", "id": lot.external_id, "url": url, "title": lot.title, "image": image,
            "year": lot.year, "mileage": lot.mileage, "grade": lot.attributes.get("auctionGrade"),
            "price": lot.price_text, "priceLabel": lot.price_label,
            "filterPrice": str(lot.display_price or "") if lot.source == "snapshot" else None}


def add_block(parent, blocks, value, *, index=None):
    marker = etree.Element("maxgroup-block")
    blocks[marker] = value
    if index is None:
        parent.append(marker)
    else:
        parent.insert(index, marker)


def page_document(doc, blocks=None):
    blocks = blocks or {}
    containers = {parent for node in blocks for parent in node.iterancestors()}

    def element(node):
        if node in blocks:
            return blocks[node]
        if node.tag == "main":
            return {"type": "main", "attrs": dict(node.attrib), "blocks": elements(node)}
        if node in containers:
            children = []
            if node.text:
                children.append({"type": "literal", "text": node.text})
            for child in node:
                if isinstance(child.tag, str):
                    children.append(element(child))
                if child.tail:
                    children.append({"type": "literal", "text": child.tail})
            return {"type": "group", "tag": node.tag, "attrs": dict(node.attrib), "blocks": children}
        # Existing layouts are trusted release fragments, including Django-escaped editor overrides.
        if node.tag in ("script", "style", "title"):
            content = node.text or ""
        else:
            content = inner(node)
        return {"type": "markup", "tag": node.tag, "attrs": dict(node.attrib), "html": content}

    def elements(parent):
        return [element(node) for node in parent if isinstance(node.tag, str)]

    body = doc.find("body")
    return {"version": 1, "htmlAttrs": dict(doc.attrib), "bodyAttrs": dict(body.attrib),
            "head": elements(doc.find("head")), "body": elements(body)}


def as_json(doc, status, blocks=None):
    return JsonResponse(page_document(doc, blocks), status=status, content_type=CONTENT_TYPE,
                        json_dumps_params={"ensure_ascii": False, "separators": (",", ":")})


class PageContentMiddleware:
    """Keep Wagtail's password forms and permission responses in the same HTTP contract."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not wants_page(request):
            return response
        if (response.get("Content-Type", "").startswith("text/html") and
                response.status_code in (200, 403, 404) and not response.streaming):
            doc = html.document_fromstring(response.content.decode(response.charset))
            if doc.find("head") is not None and doc.find("body") is not None:
                response.content = as_json(doc, response.status_code).content
                response["Content-Type"] = CONTENT_TYPE
        patch_vary_headers(response, ["Accept", "Cookie"])
        response["Cache-Control"] = "private, no-store"
        return response
