"""Verified Vladivostok quotes for the illustrated models in the homepage quiz."""
import json
from datetime import datetime, timedelta, timezone

import requests
from django.core.cache import cache

from backend.website.markup import release_file

FRESH_FOR = timedelta(hours=24)
PRICE_API = "https://carhubauto.ru/api/v2/cars"


def quiz_models():
    return json.loads(release_file("quiz-gallery.json").read_text())


def select_quote(data, model):
    checked = datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if checked > now + timedelta(minutes=5) or checked <= now - FRESH_FOR:
        raise ValueError("Outdated provider response")
    candidates = []
    for car in data["data"]:
        listing, identity = car["listing"], car["identity"]
        price = car["pricing"].get("presentation") or {}
        if (car["source"]["country"] == model["market"] and listing["sell_status"] == "active"
                and listing["year"] == model["year"] and identity["manufacturer"].casefold() == model["brand"].casefold()
                and identity["model"].casefold() == model["model"].casefold()
                and price.get("kind") in {"final", "estimated"}
                and "владивосток" in (price.get("label") or "").casefold()
                and isinstance(price.get("amount_rub"), int) and price["amount_rub"] > 0):
            candidates.append((price["amount_rub"], car["id"]))
    amount, offer_id = min(candidates, default=(None, None))
    return {"price": amount, "offerId": offer_id, "expires": int((min(checked, now) + FRESH_FOR).timestamp() * 1000)}


def refresh_quote(model):
    params = {"source_country": model["market"], "manufacturer": model["brand"], "model": model["model"],
              "year_min": model["year"], "year_max": model["year"],
              "available_only": "true", "photo_only": "true", "limit": 48}
    response = requests.get(PRICE_API, params=params, timeout=(4, 12))
    response.raise_for_status()
    quote = select_quote(response.json(), model)
    cache.set("quiz-quote:" + model["key"], quote, timeout=int(FRESH_FOR.total_seconds()))
