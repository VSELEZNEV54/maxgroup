from django import forms
from django.db import models
from wagtail import blocks
from wagtail.admin.panels import FieldPanel
from wagtail.contrib.settings.models import BaseSiteSetting, register_setting
from wagtail.documents.blocks import DocumentChooserBlock
from wagtail.fields import StreamField
from wagtail.images.blocks import ImageChooserBlock
from wagtail.models import Page
from wagtail.url_routing import RouteResult


class ReferenceBlock(blocks.CharBlock):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.field.widget.attrs["readonly"] = True


class TextChange(blocks.StructBlock):
    original = blocks.CharBlock(label="Текст в исходном разделе", help_text="Скопируйте фразу со страницы целиком.")
    replacement = blocks.CharBlock(label="Новый текст")

    class Meta:
        label = "Замена текста"


class SourceSection(blocks.StructBlock):
    key = ReferenceBlock(label="Код раздела")
    caption = ReferenceBlock(label="Исходный раздел")
    heading = blocks.CharBlock(required=False, label="Новый заголовок")
    intro = blocks.TextBlock(required=False, label="Новый первый абзац")
    image = ImageChooserBlock(required=False, label="Новая обложка раздела")
    button_text = blocks.CharBlock(required=False, label="Новая подпись первой кнопки")
    replacements = blocks.ListBlock(TextChange(), required=False, default=[], label="Другие тексты раздела")

    class Meta:
        label = "Раздел из макета"
        label_format = "{caption}"
        icon = "doc-full"


class TextSection(blocks.StructBlock):
    heading = blocks.CharBlock(label="Заголовок")
    text = blocks.RichTextBlock(label="Текст")
    image = ImageChooserBlock(required=False, label="Иллюстрация")

    class Meta:
        label = "Текст и фото"
        icon = "pilcrow"
        template = "website/section.html"


class LinkBlock(blocks.StructBlock):
    label = blocks.CharBlock(label="Текст")
    url = blocks.CharBlock(label="Путь сайта или HTTPS-ссылка", validators=[])

    def clean(self, value):
        result = super().clean(value)
        from .markup import valid_link
        if not valid_link(result["url"]):
            raise blocks.StructBlockValidationError(block_errors={"url": forms.ValidationError("Введите путь от / или адрес https://")})
        return result

    class Meta:
        label = "Ссылка"
        template = "website/link.html"


class VideoBlock(blocks.StructBlock):
    title = blocks.CharBlock(label="Подпись")
    video = DocumentChooserBlock(label="Файл видео")
    poster = ImageChooserBlock(required=False, label="Постер")

    class Meta:
        label = "Видео"
        template = "website/video.html"


class SitePage(Page):
    source_path = models.CharField(max_length=512, blank=True, db_index=True, editable=False)
    source_heading = models.CharField(max_length=255, blank=True, editable=False)
    source_layout_hash = models.CharField(max_length=64, blank=True, editable=False)
    source_section_keys = models.JSONField(default=list, editable=False)
    source_present = models.BooleanField(default=True, editable=False)
    kind = models.CharField(max_length=60, blank=True, editable=False)
    allow_index = models.BooleanField("Открыть для поиска", default=True)
    body = StreamField([("original", SourceSection()), ("section", TextSection()), ("link", LinkBlock()), ("video", VideoBlock())],
                       blank=True, verbose_name="Блоки страницы")
    content_panels = Page.content_panels + [FieldPanel("body")]
    promote_panels = Page.promote_panels + [FieldPanel("allow_index")]
    subpage_types = ["website.SitePage"]

    class Meta:
        verbose_name = "Страница сайта"

    def route(self, request, path_components):
        if self.live and self.kind in {"catalog", "selection", "country", "brand", "model"} and len(path_components) == 2:
            prefix, number = path_components
            if prefix == "page" and number.isascii() and number.isdigit() and len(number) <= 8:
                return RouteResult(self, kwargs={"number": int(number)})
        if len(path_components) == 1 and self.live:
            lot = self.lots.filter(slug=path_components[0], available=True, source_present=True).select_related("cover", "parent").first()
            if lot is not None:
                return RouteResult(self, kwargs={"lot": lot})
        return super().route(request, path_components)

    def serve(self, request, lot=None, number=1, **kwargs):
        from .views import public_page
        return public_page(request, self, lot=lot, number=number)

    def make_preview_request(self, original_request=None, preview_mode=None, extra_request_attrs=None):
        from .frontend import wants_page
        if original_request and wants_page(original_request):
            extra_request_attrs = {**(extra_request_attrs or {}), "maxgroup_frontend_preview": True}
        return super().make_preview_request(original_request, preview_mode, extra_request_attrs)

    def serve_preview(self, request, mode_name):
        response = self.serve(request)
        response["X-Robots-Tag"] = "noindex, nofollow"
        return response


@register_setting(icon="cog")
class SiteContacts(BaseSiteSetting):
    phone = models.CharField("Основной телефон", blank=True, max_length=40)
    email = models.EmailField("Основная почта", blank=True)
    footer_note = models.CharField("Подпись в подвале", blank=True, max_length=180)
    navigation = StreamField([("link", LinkBlock())], blank=True, verbose_name="Дополнительные ссылки в навигации")

    class Meta:
        verbose_name = "Контакты и навигация"
