from .settings import *

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
STORAGES = {**STORAGES, "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}}
CRM_ENABLED = False
CELERY_BROKER_URL = "memory://"
