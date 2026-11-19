from django.core.exceptions import ValidationError
from django.db import models
from wagtail.admin.forms import WagtailAdminModelForm
from wagtail.admin.panels import FieldPanel, MultiFieldPanel


class CarEditorForm(WagtailAdminModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        locked = {"source"}
        if self.instance.pk:
            locked.update(("slug", "parent", "external_id"))
        if self.instance.source != "manual":
            locked.update(("name", "country", "brand", "model", "year", "mileage", "price", "partial", "price_label"))
        for name in locked.intersection(self.fields):
            self.fields[name].disabled = True


class CarLot(models.Model):
    base_form_class = CarEditorForm
    source = models.CharField("Источник", max_length=48, default="manual")
    external_id = models.SlugField("ID лота у источника", max_length=180)
    parent = models.ForeignKey("website.SitePage", verbose_name="Страница модели", on_delete=models.PROTECT,
                               related_name="lots")
    slug = models.SlugField("Постоянный адрес лота", max_length=180)
    name = models.CharField("Название в каталоге", max_length=240)
    country = models.CharField("Страна", max_length=16, db_index=True,
                               choices=[("japan", "Япония"), ("korea", "Корея"), ("china", "Китай")])
    brand = models.SlugField("Марка (slug)", max_length=100, db_index=True)
    model = models.SlugField("Модель (slug)", max_length=120, db_index=True)
    year = models.PositiveSmallIntegerField("Год", null=True, blank=True)
    mileage = models.PositiveIntegerField("Пробег, км", null=True, blank=True)
    price = models.PositiveBigIntegerField("Стоимость источника, ₽", null=True, blank=True)
    price_label = models.CharField("Что входит в цену", max_length=180, blank=True)
    partial = models.BooleanField("Частичный расчёт", default=False)
    available = models.BooleanField("Опубликован", default=True, db_index=True)
    source_present = models.BooleanField(default=True, editable=False)
    allow_index = models.BooleanField("Открыть для поиска", default=True)
    source_path = models.CharField(max_length=512, blank=True, editable=False)
    attributes = models.JSONField(default=dict, blank=True, editable=False)
    editor_name = models.CharField("Редакторский заголовок", max_length=240, blank=True)
    editor_price = models.PositiveBigIntegerField("Ручная цена, ₽", null=True, blank=True)
    cover = models.ForeignKey("wagtailimages.Image", on_delete=models.SET_NULL, null=True, blank=True,
                              verbose_name="Редакторская обложка", related_name="+")
    description = models.TextField("Описание редактора", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    panels = [
        FieldPanel("name"), MultiFieldPanel([FieldPanel(n) for n in (
            "editor_name", "description", "editor_price", "cover", "available", "allow_index")], heading="Публикация"),
        MultiFieldPanel([FieldPanel(n) for n in ("parent", "slug", "country", "brand", "model", "year",
                                                 "mileage", "price", "partial", "price_label", "source",
                                                 "external_id")], heading="Каталожные данные"),
    ]

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["source", "external_id"], name="unique_provider_lot"),
            models.UniqueConstraint(fields=["parent", "slug"], name="unique_lot_path"),
        ]
        indexes = [models.Index(fields=["country", "brand", "model"])]
        verbose_name = "Автомобиль"
        verbose_name_plural = "Автомобили"

    @property
    def title(self):
        return self.editor_name or self.name

    def clean(self):
        super().clean()
        if self.parent_id and self.slug and self.parent.get_children().filter(slug=self.slug).exists():
            raise ValidationError({"slug": "По этому адресу уже есть страница."})

    @property
    def display_price(self):
        return self.editor_price if self.editor_price is not None else self.price

    @property
    def price_text(self):
        if self.display_price is None:
            return "По запросу"
        value = f"{self.display_price:,}".replace(",", " ")
        return ("от " if self.partial else "") + value + " ₽"

    def __str__(self):
        return self.title

    @staticmethod
    def photo_url(path):
        return path if path.startswith("https://") else "/" + path.lstrip("/")


class ImportRun(models.Model):
    source = models.CharField("Источник", max_length=48)
    created_at = models.DateTimeField("Начало", auto_now_add=True)
    finished_at = models.DateTimeField("Завершение", null=True)
    applied = models.PositiveIntegerField("Обработано", default=0)
    error = models.CharField("Ошибка", max_length=300, blank=True)

    class Meta:
        verbose_name = "Импорт"
        verbose_name_plural = "Импорты каталога"
