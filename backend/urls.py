from django.urls import include, path, re_path
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as admin_urls
from wagtail.documents import urls as document_urls

from backend.catalog import views as catalog
from backend.leads.views import collect, form_context
from backend.web import health
from backend.website import views

urlpatterns = [
    path("health/", health),
    path("admin/", include(admin_urls)),
    path("documents/", include(document_urls)),
    path("api/leads/", collect, name="lead-submit"),
    path("api/leads/context/", form_context, name="lead-context"),
    path("robots.txt", views.robots),
    path("sitemap.xml", views.sitemap),
    path("404.html", views.not_found),
    re_path(r"^(?P<filename>favicon\.ico|site\.webmanifest|llms\.txt)$", views.release_asset),
    path("model-inventory/<slug:country>/<slug:model>.json", catalog.inventory),
    path("", include(wagtail_urls)),
]

handler404 = "backend.website.views.not_found"
