"""Bridge for the approved layouts. Only release HTML is trusted; editor input stays escaped."""
from collections import Counter
from copy import deepcopy
from functools import lru_cache
from hashlib import sha256
from html import escape
from pathlib import PurePosixPath
from urllib.parse import urlsplit

from django.conf import settings
from django.http import Http404
from lxml import etree, html


def valid_link(value):
    url = urlsplit(value)
    return not any(c in value for c in ("\\", "\r", "\n", "\t")) and (
        (value.startswith("/") and not value.startswith("//") and not url.netloc)
        or (url.scheme == "https" and bool(url.hostname))
    )


def release_file(path):
    relative = PurePosixPath(path.lstrip("/"))
    if ".." in relative.parts or "\\" in path:
        raise Http404
    if path.endswith("/"):
        relative /= "index.html"
    return settings.RELEASE_DIR / str(relative)


@lru_cache(maxsize=24)
def _source_document(file, modified):
    return html.document_fromstring(file.read_bytes(), parser=html.HTMLParser(encoding="utf-8"))


def read_document(path):
    try:
        file = release_file(path)
        return deepcopy(_source_document(file, file.stat().st_mtime_ns))
    except (FileNotFoundError, IsADirectoryError) as exc:
        raise Http404 from exc


def inner(element):
    return escape(element.text or "") + "".join(
        html.tostring(child, encoding="unicode") for child in element
    )


def replace_content(element, text):
    for child in list(element):
        element.remove(child)
    element.text = text


def first(element, xpath):
    return next(iter(element.xpath(xpath)), None)


def sections(main):
    counts = Counter()
    parts = {}
    for child in main:
        if not isinstance(child.tag, str):
            continue
        base = child.get("id") or (child.tag + "." + (child.get("class") or "").split(" ")[0])
        counts[base] += 1
        parts[f"{base}:{counts[base]}"] = child
    return parts


def layout_defaults(doc):
    main = first(doc, "//main")
    if main is None:
        return []
    result = []
    for key, section in sections(main).items():
        title = first(section, ".//h1|.//h2|.//h3")
        caption = " ".join(title.text_content().split())[:150] if title is not None else key
        result.append(("original", {"key": key, "caption": caption}))
    return result


def layout_hash(items):
    import json
    return sha256(json.dumps(items, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def put_image(node, image, spec="width-960"):
    rendition = image.get_rendition(spec)
    for key in ("srcset", "sizes"):
        node.attrib.pop(key, None)
    node.set("src", rendition.url)
    node.set("width", str(rendition.width))
    node.set("height", str(rendition.height))
    node.set("alt", image.default_alt_text or image.title)
    picture = node.getparent()
    if picture is not None and picture.tag == "picture":
        for source in picture.findall("source"):
            picture.remove(source)


def apply_editor_sections(main, page, content_blocks=None):
    parts = sections(main)
    for node in list(main):
        main.remove(node)
    main.text = None
    for block in page.body:
        if block.block_type != "original":
            if content_blocks is not None:
                from .frontend import add_block, editorial_data
                add_block(main, content_blocks, editorial_data(block))
                continue
            fragment = str(block.render())
            for node in html.fragments_fromstring(fragment):
                if isinstance(node, etree._Element):
                    main.append(node)
            continue
        value = block.value
        section = parts.get(value["key"])
        if section is None:
            continue
        for key, xpath in (("heading", ".//h1|.//h2|.//h3"), ("intro", ".//p"),
                           ("button_text", ".//*[contains(concat(' ',@class,' '),' btn ')]")):
            if value.get(key):
                node = first(section, xpath)
                if node is not None:
                    replace_content(node, value[key])
        if value.get("image"):
            img = first(section, ".//img")
            if img is not None:
                put_image(img, value["image"])
        for change in value.get("replacements") or ():
            target = " ".join(change["original"].split())
            for part in section.xpath(".//text()[not(ancestor::script or ancestor::style)]"):
                if target and " ".join(part.split()) == target:
                    # Retain icons, links and other children alongside the changed text node.
                    setattr(part.getparent(), "tail" if part.is_tail else "text", change["replacement"])
        main.append(section)
