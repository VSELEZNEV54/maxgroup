import os
from uuid import uuid4

from .settings import *

# Concurrent local chats and CI runs must own separate Django test databases.
DATABASES["default"]["TEST"] = {"NAME": "test_maxgroup_" + os.environ.setdefault("MAXGROUP_TEST_RUN", uuid4().hex[:12])}

CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
STORAGES = {**STORAGES, "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"}}
CRM_ENABLED = False
CELERY_BROKER_URL = "memory://"
