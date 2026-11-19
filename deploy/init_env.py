"""Первичная настройка локальной среды. Существующие пароли остаются у владельца."""
import os
import secrets
from pathlib import Path

root = Path(__file__).resolve().parent.parent
template = (root / ".env.example").read_text()
for key in ("DJANGO_SECRET_KEY", "POSTGRES_PASSWORD", "LOCAL_ADMIN_PASSWORD"):
    template = template.replace(key + "=\n", key + "=" + secrets.token_urlsafe(36) + "\n")
try:
    fd = os.open(root / ".env", os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
except FileExistsError:
    pass
else:
    with os.fdopen(fd, "w") as stream:
        stream.write(template)
