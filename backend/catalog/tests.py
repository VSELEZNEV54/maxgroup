from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from django.test import SimpleTestCase
from lxml import html

from .listing import apply_quiz_prices
from .quiz_quotes import select_quote


class QuizQuoteTests(SimpleTestCase):
    model = {"market": "KR", "brand": "Kia", "model": "K5", "year": 2023}

    def offer(self, amount, kind="estimated", status="active", year=2023):
        return {"id": amount, "identity": {"manufacturer": "Kia", "model": "K5"},
                "listing": {"sell_status": status, "year": year}, "source": {"country": "KR"},
                "pricing": {"presentation": {"amount_rub": amount, "kind": kind,
                                              "label": "Предварительная цена во Владивостоке"}}}

    def test_only_current_complete_quotes_for_the_illustrated_model_year(self):
        now = datetime.now(timezone.utc)
        feed = {"generated_at": now.isoformat(), "data": [
            self.offer(1, kind="known_part"), self.offer(2, status="sold"), self.offer(3, year=2020),
            self.offer(2000000), self.offer(1900000, kind="final")]}
        self.assertEqual(select_quote(feed, self.model)["price"], 1900000)
        feed["generated_at"] = (now + timedelta(seconds=2)).isoformat()
        self.assertEqual(select_quote(feed, self.model)["price"], 1900000)
        feed["data"] = feed["data"][:3]
        self.assertIsNone(select_quote(feed, self.model)["price"])
        feed["generated_at"] = (now - timedelta(days=2)).isoformat()
        with self.assertRaises(ValueError):
            select_quote(feed, self.model)

    def test_live_quote_and_expiry_in_rendered_captions(self):
        view = html.fromstring('<div><template data-quote-key="kia-k5"><figure data-quote-until="1">'
                               '<figcaption><span data-quiz-price="">Старая сумма</span></figcaption></figure></template></div>')
        with patch("backend.catalog.listing.time", return_value=2), patch("backend.catalog.listing.cache") as cache:
            cache.get_many.return_value = {"quiz-quote:kia-k5": {"price": 1900000, "expires": 3000}}
            apply_quiz_prices(view)
            self.assertEqual(view.xpath("//span/text()"), ["от 1 900 000 ₽ под ключ во Владивостоке"])
            cache.get_many.return_value = {"quiz-quote:kia-k5": {"price": None, "expires": 4000}}
            apply_quiz_prices(view)
            self.assertEqual(view.xpath("//span/text()"), ["Стоимость под ключ по запросу"])
        with patch("backend.catalog.listing.time", return_value=5), patch("backend.catalog.listing.cache") as cache:
            cache.get_many.return_value = {}
            view.xpath("//span")[0].text = "Вчерашняя сумма"
            apply_quiz_prices(view)
            self.assertEqual(view.xpath("//span/text()"), ["Стоимость под ключ по запросу"])
