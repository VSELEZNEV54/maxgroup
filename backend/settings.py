import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RELEASE_DIR = Path(os.environ.get("MAXGROUP_RELEASE", BASE_DIR / "dist-backend"))
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = os.environ.get("DJANGO_DEBUG") == "1"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
CSRF_TRUSTED_ORIGINS = list(filter(None, os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")))
PUBLIC_ORIGIN = os.environ.get("PUBLIC_ORIGIN", "http://localhost:8000").rstrip("/")
SEO_ORIGIN = os.environ.get("SEO_ORIGIN", "https://www.maxgroupvl.ru").rstrip("/")
SITE_INDEXABLE = os.environ.get("SITE_INDEXABLE") == "1"
WAGTAILADMIN_BASE_URL = PUBLIC_ORIGIN
WAGTAIL_SITE_NAME = "Макс Групп"
ROOT_URLCONF = "backend.urls"
WSGI_APPLICATION = "backend.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "ru"
TIME_ZONE = "Asia/Vladivostok"
USE_TZ = True
USE_I18N = True

INSTALLED_APPS = [
    "backend.website", "backend.catalog", "backend.leads",
    "wagtail.contrib.settings", "wagtail.contrib.redirects",
    "wagtail.embeds", "wagtail.sites", "wagtail.users", "wagtail.snippets",
    "wagtail.documents", "wagtail.images", "wagtail.search", "wagtail.admin", "wagtail",
    "modelcluster", "taggit",
    "django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions",
    "django.contrib.messages", "django.contrib.staticfiles",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware", "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware", "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware", "wagtail.contrib.redirects.middleware.RedirectMiddleware",
    "backend.web.RequestLogMiddleware",
]
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "backend" / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request", "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages", "wagtail.contrib.settings.context_processors.settings",
    ]},
}]
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": os.environ.get("POSTGRES_DB", "maxgroup"), "USER": os.environ.get("POSTGRES_USER", "maxgroup"),
    "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""), "HOST": os.environ.get("POSTGRES_HOST", "db"),
    "PORT": os.environ.get("POSTGRES_PORT", "5432"), "CONN_MAX_AGE": 60, "CONN_HEALTH_CHECKS": True,
}}
STATIC_URL = "/static/"
STATIC_ROOT = Path(os.environ.get("STATIC_ROOT", BASE_DIR / ".local.nosync/static"))
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / ".local.nosync/media"))
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"},
}
if os.environ.get("MEDIA_BUCKET"):
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": os.environ["MEDIA_BUCKET"],
            "endpoint_url": os.environ.get("S3_ENDPOINT", "https://storage.yandexcloud.net"),
            "region_name": os.environ.get("S3_REGION", "ru-central1"),
            "custom_domain": os.environ["MEDIA_CDN_DOMAIN"],
            "file_overwrite": False, "querystring_auth": False,
        },
    }
WAGTAILDOCS_SERVE_METHOD = "serve_view"
WAGTAILDOCS_INLINE_CONTENT_TYPES = ["application/pdf", "video/mp4", "video/webm"]
if os.environ.get("NGINX_DOCUMENTS") == "1":
    SENDFILE_BACKEND = "backend.web"
WAGTAILSEARCH_BACKENDS = {"default": {"BACKEND": "wagtail.search.backends.database"}}
CACHE_URL = os.environ.get("CACHE_URL", "redis://cache:6379/0")
CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": CACHE_URL}}
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://broker:6379/0")
CELERY_TASK_IGNORE_RESULT = True
CELERY_TASK_DEFAULT_QUEUE = "imports"
CELERY_TASK_ROUTES = {"backend.leads.*": {"queue": "crm"}}
CELERY_BEAT_SCHEDULE = {
    "crm-outbox": {"task": "backend.leads.tasks.dispatch_pending", "schedule": 60.0},
    "inventory": {"task": "backend.catalog.tasks.refresh_configured_feed", "schedule": 900.0},
}
CRM_DESTINATIONS = tuple(filter(None, os.environ.get("CRM_DESTINATIONS", "amo,bitrix").split(",")))
if set(CRM_DESTINATIONS) - {"amo", "bitrix"}:
    raise ValueError("Незнакомое назначение CRM")
CRM_ENABLED = os.environ.get("CRM_ENABLED") == "1"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = PUBLIC_ORIGIN.startswith("https://")
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]
LOGGING = {
    "version": 1, "disable_existing_loggers": False,
    "formatters": {"json": {"()": "backend.web.JsonLogFormatter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "json"}},
    "loggers": {"maxgroup": {"handlers": ["console"], "level": "INFO", "propagate": False}},
}
