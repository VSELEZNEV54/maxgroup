from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from backend.website.admin import JournalViewSet
from .models import CarLot, ImportRun


class CarViewSet(SnippetViewSet):
    model = CarLot
    icon = "list-ul"
    menu_label = "Автомобили"
    add_to_admin_menu = True
    list_display = ["title", "country", "year", "price_text", "source", "available", "source_present"]
    search_fields = ["name", "editor_name", "external_id", "slug"]
    list_filter = ["country", "source", "available"]
    inspect_view_enabled = True


class ImportViewSet(JournalViewSet):
    model = ImportRun
    menu_label = "Импорты"
    icon = "download"
    list_display = ["source", "created_at", "finished_at", "applied", "error"]
    ordering = ["-pk"]


register_snippet(CarViewSet)
register_snippet(ImportViewSet)
