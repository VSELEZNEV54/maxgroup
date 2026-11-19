import re
from urllib.parse import urlencode, urlsplit, urlunsplit

from lxml import etree

from backend.website.markup import first, put_image, replace_content


def edit_snapshot_detail(main, lot):
    box = first(main, ".//*[@class='buybox__card']")
    if lot.editor_name:
        first(box, ".//h1").text = lot.title
        for button in main.xpath(".//*[@data-modal-car]"):
            button.set("data-modal-car", lot.title)
            button.set("data-modal-subject", f"Заявка на {lot.title} ({lot.external_id})")
    if lot.cover_id:
        gallery = first(main, ".//*[@data-gallery]")
        cover = first(gallery, ".//*[@data-gallery-item]")
        if cover is None:
            cover = etree.SubElement(gallery, "a", {"class": "gallery__main", "data-gallery-item": ""})
        image = first(cover, ".//img")
        if image is None:
            image = etree.SubElement(cover, "img")
        put_image(image, lot.cover)
        cover.set("href", image.get("src"))
        cover.set("data-alt", image.get("alt"))
    if lot.description:
        paragraph = etree.Element("p", {"class": "prose"})
        paragraph.text = lot.description
        first(box, ".//h1").addnext(paragraph)
    if lot.editor_price is None:
        return
    replace_content(first(box, ".//*[@class='buybox__price-value']"), lot.price_text)
    # A manual total does not have a supplier itemisation.
    for detail in box.xpath(".//details[@class='breakdown-box']"):
        detail.getparent().remove(detail)
    sticky = first(main, ".//*[@class='buybar__price']")
    if sticky is not None:
        sticky.text = lot.price_text
    def total(fee_text):
        fee = int(re.sub(r"[^0-9]", "", fee_text) or "0")
        return f"{lot.editor_price + fee:,}".replace(",", " ") + " ₽"
    for option in main.xpath(".//option[@data-fee and @data-total]"):
        option.set("data-total", total(option.get("data-fee")))
    for cell in main.xpath(".//*[@id='modal-car-delivery']//dl/div[1]/dd | .//*[@data-delivery-total]"):
        cell.text = total("0")
    for row in main.xpath(".//table[contains(@class,'table--delivery')]/tbody/tr"):
        cells = row.findall("td")
        if len(cells) >= 2:
            cells[-1].text = "от " + total(cells[-2].text_content())
    for link in main.xpath(".//a[starts-with(@href, 'https://wa.me/') and contains(@href, 'text=')]"):
        url = urlsplit(link.get("href"))
        link.set("href", urlunsplit((url.scheme, url.netloc, url.path, urlencode({"text": f"{lot.title}, {lot.price_text}"}), "")))
