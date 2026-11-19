import json
from collections import Counter
from time import time
from urllib.parse import urlencode

from django.core.paginator import Paginator, InvalidPage
from django.db.models import Case, Count, F, FloatField, Q, Value, When
from django.db.models.fields.json import KT
from django.db.models.functions import Cast, Coalesce
from django.http import Http404
from django.template.loader import render_to_string
from lxml import etree, html

from backend.website.markup import first, put_image, replace_content
from .models import CarLot

FIELDS = {"country": "country", "brand": "brand", "model": "model",
          "body": "attributes__body", "fuel": "attributes__engine__type", "drive": "attributes__drive",
          "age": "attributes__ageCat"}
SORTS = {"popular": "-popular", "price-asc": "amount", "price-desc": "-amount", "grade-desc": "-grade",
         "grade-asc": "grade", "year-desc": "-year", "mileage-asc": "mileage"}


def published_lots():
    return CarLot.objects.filter(available=True, source_present=True, parent__live=True, parent__source_present=True)


def quiz_inventory():
    rows = list(published_lots().exclude(source="model-offers").order_by().values(
        "brand", "model", "country", "mileage", amount=Coalesce("editor_price", "price"),
        body=F("attributes__body"), age=F("attributes__ageCat"),
        brandName=F("attributes__brand"), modelName=F("attributes__model")))
    for row in rows:
        row["price"] = row.pop("amount")
    return rows


def scoped_lots(page, ids, model_profile=None):
    qs = published_lots()
    if model_profile:
        return qs.filter(source="model-offers", parent__source_path=model_profile, attributes__expiresAt__gt=int(time() * 1000))
    qs = qs.exclude(source="model-offers")
    if page.kind == "catalog" and page.source_path == "/catalog/":
        return qs
    parts = page.source_path.strip("/").split("/")
    countries = {"avto-iz-yaponii": "japan", "avto-iz-korei": "korea", "avto-iz-kitaya": "china"}
    if page.kind in ("country", "brand", "model") and parts[0] in countries:
        qs = qs.filter(country=countries[parts[0]])
        if len(parts) >= 2:
            qs = qs.filter(brand=parts[1])
        if len(parts) >= 3:
            qs = qs.filter(model=parts[2])
        return qs
    return qs.filter(external_id__in=ids)


def filtered(qs, params):
    qs = qs.annotate(amount=Coalesce("editor_price", "price"))
    generation = params.get("generation")
    if generation:
        qs = qs.filter(Q(attributes__generationKey=generation) | Q(attributes__generation=generation))
    for field, column in FIELDS.items():
        val = params.get(field, "")
        if val:
            values = val.split("|")[:20] if field == "body" else [val]
            qs = qs.filter(**{column + "__in": values})
    for field, col in (("price", "amount"), ("year", "year"), ("mileage", "mileage"), ("hp", "attributes__engine__powerHp")):
        for suffix, op in (("min", "gte"), ("max", "lte")):
            val = params.get(f"{field}-{suffix}", "").replace(" ", "").replace("\xa0", "")
            if field == "price" and val == "over-5000000":
                qs = qs.filter(amount__gt=5000000)
            elif val.isascii() and val.isdigit() and len(val) <= 12:
                if field == "hp" and suffix == "max" and val == "160":
                    qs = qs.filter(attributes__isLowPower=True)
                else:
                    qs = qs.filter(**{col + "__" + op: int(val)})
    order = SORTS.get(params.get("sort"), "-popular")
    if order == "-popular":
        qs = qs.annotate(popular=Case(When(attributes__modelInTop30=True, then=Value(1)),
                                      When(source="model-offers", then=Value(1)), default=Value(0)))
    elif order.lstrip("-") == "grade":
        qs = qs.annotate(grade=Cast(KT("attributes__gradeValue"), FloatField()))
    column = F(order.lstrip("-"))
    return qs.order_by(column.desc(nulls_last=True) if order.startswith("-") else column.asc(nulls_last=True), "pk")


def car_count(number):
    last = number % 10
    word = "автомобилей" if 11 <= number % 100 <= 14 else (
        "автомобиль" if last == 1 else "автомобиля" if 2 <= last <= 4 else "автомобилей")
    return f"{number} {word}"


def lot_url(lot):
    return lot.parent.get_url().rstrip("/") + "/" + lot.slug + "/"


def rank_vehicle_options(make, model, facets, country, brand):
    totals = {"brand": Counter(), "model": Counter()}
    for row in facets:
        if country and row["country"] != country:
            continue
        n = row.get("count", 1)
        totals["brand"][row["brand"]] += n
        if not brand or row["brand"] == brand:
            totals["model"][row["model"]] += n
    paths = model.xpath("./option/@data-profile")
    profiles = dict(published_lots().filter(source="model-offers", parent__source_path__in=paths,
                    attributes__expiresAt__gt=int(time() * 1000)).order_by()
                    .values_list("parent__source_path").annotate(total=Count("pk")))
    for key, select in (("brand", make), ("model", model)):
        options = [o for o in select.findall("option") if o.get("value")]
        for option in options:
            path = option.get("data-profile")
            n = profiles.get(path, 0) if path else totals[key][option.get("value")]
            option.set("data-count", str(n))
            option.set("label", f"{option.text} ({n})")
            option.attrib.pop("data-until", None)
        for option in sorted(options, key=lambda o: (-int(o.get("data-count")), o.text.casefold())):
            select.append(option)


def apply_listing(doc, page, request, number):
    sections = doc.xpath("//*[@data-catalog-list][.//*[@data-cars]/*[@data-car] or @data-catalog-quiz]")
    if not sections:
        if number != 1:
            raise Http404
        return
    for section in sections:
        grid = first(section, ".//*[@data-cars]")
        originals = {el.get("data-car"): el for el in grid.xpath("./*[@data-car]")}
        qs = scoped_lots(page, originals, section.get("data-model-profile"))
        result = filtered(qs, request.GET).select_related("parent", "cover")
        paginator = Paginator(result, 24)
        try:
            selected = paginator.page(number)
        except InvalidPage as exc:
            raise Http404 from exc
        for e in originals.values():
            grid.remove(e)
        for index, lot in enumerate(selected.object_list):
            card = originals.get(lot.external_id) if lot.source_path else None
            if card is None:
                photos = lot.attributes.get("photos") or []
                fragment = render_to_string("website/car_card.html", {
                    "lot": lot, "url": lot_url(lot), "photo": lot.photo_url(photos[0]) if photos else "",
                })
                card = html.fragment_fromstring(fragment)
            else:
                refresh_card(card, lot)
            grid.insert(index, card)
        section.attrib.pop("data-catalog-list", None)
        section.set("data-server-catalog", "")
        form = first(section, ".//form[@data-filters]")
        base_url = page.get_url(request=request)
        form.set("method", "get")
        form.set("action", base_url)
        market = form.get("data-facet-market")
        facet_lots = published_lots().exclude(source="model-offers").filter(country=market) if market else qs
        facets = list(facet_lots.order_by().values("country", "brand", "model").annotate(count=Count("pk")))
        form.set("data-facets", json.dumps(facets, separators=(",", ":")))
        # Подготовить список также для HTML-формы без JavaScript.
        source = first(form, ".//script[@data-generation-options]")
        library = json.loads(source.text) if source is not None else {}
        make = first(form, ".//select[@data-filter='brand']")
        model = first(form, ".//select[@data-filter='model']")
        selected_brand = request.GET.get("brand") or make.get("data-default", "")
        brand_slug = selected_brand
        model_slug = request.GET.get("model") or model.get("data-default", "")
        if not brand_slug and model_slug:
            brands = {f["brand"] for f in facets if f["model"] == model_slug}
            if len(brands) == 1:
                brand_slug = brands.pop()
        generation = first(form, ".//select[@data-filter='generation']")
        versions = library.get(f"{brand_slug}/{model_slug}", [])
        if versions:
            generation.find("option").text = "Все поколения"
            for row in versions:
                etree.SubElement(generation, "option", value=row["id"]).text = f"{row['from']} – {row['to'] or 'н. в.'} · {row['label']}"
        for control in section.xpath(".//*[@data-filter]|.//*[@data-sort]"):
            key = control.get("data-filter", "sort")
            control.set("name", key)
            if key == "sort":
                control.set("form", form.get("id"))
            value = request.GET.get(key, control.get("data-default", ""))
            if control.tag == "select":
                if value and not any(o.get("value") == value for o in control.findall("option")):
                    etree.SubElement(control, "option", value=value).text = value
                for option in control.findall("option"):
                    option.attrib.pop("selected", None)
                    if option.get("value") == value:
                        option.set("selected", "selected")
            else:
                control.set("value", value)
        # Preserve dependent model choices when a feed introduces a new make or model.
        scope_brand = make.get("data-default")
        for key, select in (("brand", make), ("model", model)):
            known = {o.get("value") for o in select.findall("option")}
            for row in facets:
                val = row[key]
                if not val or val in known or (key == "model" and scope_brand and row["brand"] != scope_brand):
                    continue
                option = etree.SubElement(select, "option", value=val)
                option.text = val
                known.add(val)
                if select.get("data-default"):
                    parent_url = make.find("option").get("data-url")
                    if parent_url:
                        params = {"brand": val} if key == "brand" else {"brand": scope_brand, "model": val}
                        option.set("data-url", parent_url + "?" + urlencode(params))
        rank_vehicle_options(make, model, facets, request.GET.get("country"), selected_brand)
        for el in section.xpath(".//*[@data-results-count]"):
            el.text = car_count(paginator.count)
        if paginator.count:
            for head in section.xpath(".//*[@data-results-head]"):
                head.attrib.pop("hidden", None)
        quiz_id = section.get("data-catalog-quiz")
        if quiz_id:
            if len(selected) > 1:
                grid.classes.add("cars-grid--duo")
            else:
                grid.classes.discard("cars-grid--duo")
            if selected.has_next():
                quiz = doc.get_element_by_id(quiz_id, None)
                if quiz is not None:
                    quiz.getparent().remove(quiz)
        for el in form.xpath(".//*[@data-filter-show]"):
            el.text = "Показать автомобили"
        for el in section.xpath(".//*[@data-cars-empty]"):
            if paginator.count == 0:
                el.attrib.pop("hidden", None)
            else:
                el.set("hidden", "")
        for el in section.xpath(".//*[@data-filters-reset or @data-filters-reset-all]"):
            el.tag = "a"
            el.set("href", base_url)
            if request.GET:
                el.attrib.pop("hidden", None)
        for el in section.xpath(".//*[@data-cars-more]"):
            el.getparent().remove(el)
        if paginator.num_pages > 1:
            nav = etree.Element("nav", {"class": "btn-row", "aria-label": "Страницы каталога"})
            for n in paginator.get_elided_page_range(number, on_each_side=1, on_ends=1):
                if not isinstance(n, int):
                    etree.SubElement(nav, "span").text = str(n)
                    continue
                url = base_url if n == 1 else f"{base_url}page/{n}/"
                if request.GET:
                    url += "?" + request.GET.urlencode()
                anchor = etree.SubElement(nav, "a", href=url, attrib={"class": "btn btn--ghost"})
                anchor.text = str(n)
                if n == number:
                    anchor.set("aria-current", "page")
            grid.addnext(nav)


def refresh_card(card, lot):
    current = first(card, ".//*[contains(concat(' ',@class,' '),' car__price ')]")
    if current is not None:
        amount = current.find("span[@class='car__amount']")
        if amount is None:
            amount = current
        amount.text = lot.price_text
        small = current.find("small")
        if small is not None:
            small.text = lot.price_label
    if lot.editor_name:
        title = first(card, ".//*[contains(concat(' ',@class,' '),' car__title ')]/a")
        if title is not None:
            replace_content(title, lot.title)
        arrow = first(card, ".//a[@class='car__go']")
        if arrow is not None:
            arrow.set("aria-label", "Открыть объявление " + lot.title)
    if lot.cover_id:
        image = first(card, ".//img")
        if image is not None:
            put_image(image, lot.cover, "width-480")
    card.set("data-price", str(lot.display_price or ""))
