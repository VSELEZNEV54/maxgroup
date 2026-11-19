import json
from collections import Counter
from io import BytesIO, StringIO
from xml.etree import ElementTree as ET

from django.conf import settings
from django.core.files.images import ImageFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from lxml import html
from PIL import Image as PillowImage
from wagtail.images import get_image_model
from wagtail.models import Site

from backend.catalog.importer import import_rows
from backend.catalog.models import CarLot, ImportRun
from backend.website.models import SitePage


@override_settings(ALLOWED_HOSTS=["testserver", "localhost"], SITE_INDEXABLE=False)
class SiteTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("sync_site", stdout=StringIO())
        cls.root = Site.objects.get(is_default_site=True).root_page.specific

    def test_page_registry_and_indexing(self):
        ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        original = ET.parse(settings.RELEASE_DIR / "sitemap.xml")
        current = ET.fromstring(self.client.get("/sitemap.xml").content)
        loc = "s:url/s:loc"
        self.assertEqual({e.text for e in original.findall(loc, ns)}, {e.text for e in current.findall(loc, ns)})
        self.assertEqual(self.client.get("/no-such-page-maxgroup/").status_code, 404)
        self.assertIn(b"Disallow: /", self.client.get("/robots.txt").content)
        response = self.client.get("/")
        self.assertEqual(response["X-Robots-Tag"], "noindex, nofollow")
        self.assertEqual(response.status_code, 200)

    def test_publish_draft_and_resynchronise(self):
        page = SitePage.objects.get(source_path="/uslugi/")
        title = "Заголовок после публикации"
        page.title = title
        revision = page.save_revision()
        call_command("sync_site", stdout=StringIO())
        self.assertNotEqual(SitePage.objects.get(pk=page.pk).title, title)
        revision.publish()
        call_command("sync_site", stdout=StringIO())
        response = self.client.get("/uslugi/")
        self.assertEqual(html.fromstring(response.content.decode()).xpath("//h1")[0].text_content(), title)
        child = SitePage(title="Новая страница", slug="new-editorial", body=[
            ("section", {"heading": "Редакторский раздел", "text": "<p>Текст раздела</p>"})])
        self.root.add_child(instance=child)
        child.save_revision().publish()
        self.assertContains(self.client.get("/new-editorial/"), "Редакторский раздел")
        child.unpublish()
        self.assertEqual(self.client.get("/new-editorial/").status_code, 404)

    def test_original_car_keeps_its_gallery_and_delivery_calculator(self):
        lot = CarLot.objects.get(source="snapshot", external_id="toyota-prius-2024-1")
        file = BytesIO()
        PillowImage.new("RGB", (40, 24), "navy").save(file, "PNG")
        file.seek(0)
        lot.cover = get_image_model().objects.create(title="Новая обложка", file=ImageFile(file, name="cover.png"))
        lot.editor_name, lot.editor_price = "Проверка обложки", 4321000
        lot.save()
        doc = html.fromstring(self.client.get(lot.source_path).content.decode())
        self.assertIn(lot.editor_name, doc.xpath("//h1")[0].text_content())
        self.assertEqual(doc.xpath("//*[@data-gallery-item]//img")[0].get("alt"), lot.cover.title)
        self.assertIn("4 321 000", doc.xpath("//*[@data-delivery-total]")[0].text_content())
        self.assertGreater(len(doc.xpath("//*[@data-gallery-item]")), 1)

    def test_selection_quiz_at_end_of_catalog_results(self):
        def listing(path):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            section = html.fromstring(response.content.decode()).xpath("//*[@data-server-catalog]")[0]
            self.assertFalse(section.xpath(".//*[@data-cars]/*[not(@data-car)]"))
            return section

        first_page = listing("/catalog/")
        self.assertFalse(first_page.xpath("//*[@id='podbor']"))
        last_url = first_page.xpath(".//nav[@aria-label='Страницы каталога']/a[last()]/@href")[0]
        last_page = listing(last_url)
        quiz_after_results = "following-sibling::*[1][self::section and @id='podbor']//form[@data-server-lead]"
        self.assertTrue(last_page.xpath(quiz_after_results))

        path = "/avto-iz-yaponii/toyota/harrier/"
        single = listing(path)
        self.assertEqual(len(single.xpath(".//*[@data-car]")), 1)
        quiz = single.xpath(quiz_after_results)[0]
        self.assertEqual(quiz.get("action"), "/api/leads/")
        self.assertEqual(quiz.xpath(".//select[@name='q-model']/option[@selected]/@value"), ["harrier"])
        fields = {el.get("name"): el.get("value", "") for el in quiz.xpath(".//input[@type='hidden'][@name]")}
        sent = self.client.post(quiz.get("action"), {
            **fields, "phone": "+79000000000", "agree": "on", "car": "Toyota Harrier",
        }, headers={"Accept": "application/json"})
        self.assertEqual(sent.status_code, 201)
        self.assertTrue(sent.json()["accepted"])

        empty = listing(path + "?year-min=2100")
        self.assertFalse(empty.xpath(".//*[@data-car]"))
        self.assertTrue(empty.xpath(".//*[@data-cars-empty and not(@hidden)]"))
        self.assertTrue(empty.xpath(quiz_after_results))

    def test_ranked_choices_cover_the_whole_market_and_use_published_stock(self):
        available = CarLot.objects.filter(available=True, source_present=True, parent__live=True,
                                          parent__source_present=True).exclude(source="model-offers")
        def options(path, field):
            doc = html.fromstring(self.client.get(path).content.decode())
            return doc.xpath(f"//select[@data-filter='{field}']/option[@value!='']")

        expected = Counter(available.values_list("brand", flat=True))
        for path in ("/catalog/", "/catalog/page/2/"):
            choices = options(path, "brand")
            counts = [int(o.get("data-count")) for o in choices]
            self.assertEqual(counts, sorted(counts, reverse=True))
            self.assertEqual(sum(counts), available.count())
            for o in choices:
                self.assertEqual(o.get("label"), f"{o.text} ({expected[o.get('value')]})")

        japan = available.filter(country="japan")
        sibling_counts = {o.get("value"): int(o.get("data-count")) for o in options("/avto-iz-yaponii/daihatsu/", "brand")}
        self.assertEqual(sibling_counts["toyota"], japan.filter(brand="toyota").count())
        lot = japan.filter(brand="toyota", model="prius").first()
        lot.available = False
        lot.save(update_fields=["available"])
        expected_prius = japan.filter(brand="toyota", model="prius").count()
        choices = options("/catalog/?brand=toyota&country=japan", "model")
        prius = next(o for o in choices if o.get("value") == "prius")
        self.assertEqual(int(prius.get("data-count")), expected_prius)
        home = html.fromstring(self.client.get("/").content.decode())
        index = json.loads(home.xpath("//script[@data-quiz-index]/text()")[0])
        self.assertEqual(sum(1 for c in index if (c["country"], c["brand"], c["model"]) == ("japan", "toyota", "prius")), expected_prius)

    def test_catalog_pagination_and_feed(self):
        def cards(path):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200)
            return html.fromstring(response.content.decode()).xpath("//*[@data-server-catalog]//*[@data-car]/@data-car")
        first, second = cards("/catalog/"), cards("/catalog/page/2/")
        self.assertEqual(len(first), 24)
        self.assertTrue(second and not set(first).intersection(second))
        self.assertEqual(self.client.get("/catalog/page/99999/").status_code, 404)
        parent = SitePage.objects.get(source_path="/avto-iz-yaponii/toyota/prius/")
        row = {"external_id": "import-001", "name": "Toyota Prius — тест импорта", "parent_path": parent.source_path,
               "price": "4000000", "year": 2024, "photos": ["/assets/img/cars/toyota-prius-2024-1/01.webp"]}
        import_rows("test-feed", [row])
        lot = CarLot.objects.get(source="test-feed")
        lot.editor_price = 4200000
        lot.save()
        import_rows("test-feed", [{**row, "price": 4100000}])
        detail = self.client.get(parent.source_path + "import-001/")
        self.assertContains(detail, "Toyota Prius — тест импорта")
        self.assertContains(detail, "4 200 000")
        self.assertIn("import-001", cards("/catalog/?price-min=4200000&price-max=4200000"))
        with self.assertRaises(ValueError):
            import_rows("test-feed", [{**row, "price": 1}, {**row, "external_id": "another", "price": "abc"}])
        lot.refresh_from_db()
        self.assertEqual(lot.price, 4100000)
        self.assertTrue(ImportRun.objects.latest("pk").error)
        import_rows("test-feed", [{**row, "available": False}])
        self.assertEqual(self.client.get(parent.source_path + "import-001/").status_code, 404)
