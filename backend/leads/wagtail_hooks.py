from wagtail.snippets.models import register_snippet

from backend.website.admin import JournalViewSet
from .models import Delivery, Lead


class LeadViewSet(JournalViewSet):
    model = Lead
    icon = "mail"
    menu_label = "Заявки"
    list_display = ["subject", "phone", "page", "created_at"]
    search_fields = ["phone", "name", "subject"]
    ordering = ["-created_at"]
    inspect_view_fields = ["id", "created_at", "name", "phone", "subject", "page", "consent", "details"]


class DeliveryViewSet(JournalViewSet):
    model = Delivery
    icon = "tasks"
    menu_label = "Доставка в CRM"
    list_display = ["lead", "crm", "status", "attempts", "external_id"]
    list_filter = ["crm", "status"]
    ordering = ["-pk"]


register_snippet(LeadViewSet)
register_snippet(DeliveryViewSet)
