"""Exercise the public Next.js entry point against this release, without creating live leads."""
import json
import os
import sys
from urllib.parse import urlsplit

import requests
from lxml import html


def check(origin):
    host = urlsplit(os.environ.get("PUBLIC_ORIGIN", "http://localhost:8000")).netloc
    session = requests.Session()
    session.headers["Host"] = host
    cms = "http://127.0.0.1:8000"

    def get(path, status=200):
        response = session.get(origin + path, allow_redirects=False, timeout=25)
        assert response.status_code == status, (path, response.status_code)
        return response

    def parsed(response):
        return html.fromstring(response.content, parser=html.HTMLParser(encoding="utf-8"))

    def metadata(doc):
        return (
            doc.xpath("//head/title/text()"),
            doc.xpath("//head/link[@rel='canonical']/@href"),
            doc.xpath("//head/meta[@name='description' or @name='robots']/@content"),
            [json.loads(s) for s in doc.xpath("//head/script[@type='application/ld+json']/text()")],
            [e.text_content().strip() for e in doc.xpath("//h1")],
            doc.xpath("//script[starts-with(@src,'/assets/') or starts-with(@src,'../assets/')]/@src"),
        )

    def listing(doc):
        cards = [(c.get("data-car"), c.get("data-price"), c.xpath(".//a/@href"), c.xpath(".//img/@src"),
                  c.xpath(".//*[@class='car__title']/a/text()"), c.xpath(".//*[@class='car__amount']/text()"),
                  c.xpath(".//*[@class='car__price']/small/text()")) for c in doc.xpath("//*[@data-server-catalog]//*[@data-car]")]
        pages = [(p.tag, p.text_content(), p.get("href"), p.get("aria-current"))
                 for p in doc.xpath("//nav[@aria-label='Страницы каталога']/*")]
        return cards, pages

    for path, status in (("/", 200), ("/catalog/?country=japan", 200), ("/catalog/page/2/", 200),
                         ("/kvizy/honda-vezel/", 200), ("/not-an-existing-maxgroup-page/", 404)):
        public = get(path, status)
        reference = session.get(cms + path, allow_redirects=False, timeout=25)
        assert reference.status_code == status
        assert public.headers.get("X-MaxGroup-Renderer") == "next", path
        assert public.headers.get("X-Robots-Tag") == reference.headers.get("X-Robots-Tag"), path
        doc, expected = parsed(public), parsed(reference)
        assert doc.find("body").attrib == expected.find("body").attrib, path
        assert metadata(doc) == metadata(expected), path
        assert len(doc.xpath("//meta[@name='viewport']")) == 1, path
        assert not doc.xpath("//script[@id='__NEXT_DATA__']"), path
        if path.startswith("/catalog/"):
            assert listing(doc) == listing(expected), path

    # A real CSRF round trip, followed by server-side input validation. It creates no delivery.
    fresh = requests.Session()
    fresh.headers["Host"] = host
    home = fresh.get(origin + "/", timeout=25)
    form = parsed(home).xpath("//form[@data-server-lead and @action='/api/leads/']")[0]
    payload = {n.get("name"): n.get("value", "") for n in form.xpath(".//input[@type='hidden' and @name]")}
    payload.update(phone="", agree="on")
    invalid = fresh.post(origin + "/api/leads/", data=payload, headers={"Accept": "application/json"}, timeout=10)
    assert home.cookies.get("csrftoken") and invalid.status_code == 400, invalid.status_code
    assert get("/catalog/page/1/", 301).headers["Location"] == "/catalog/"
    assert "/admin/login/" in get("/admin/", 302).headers["Location"]
    assert get("/sitemap.xml").headers["Content-Type"].startswith("application/xml")
    assert get("/assets/css/main.css").content
    assert get("/health/").json()["status"] == "ok"
    print("Next.js: HTML, SEO, фильтры, пагинация, квиз, формы, редиректы, 404 и админка проверены.")


if __name__ == "__main__":
    check(sys.argv[1].rstrip("/"))
