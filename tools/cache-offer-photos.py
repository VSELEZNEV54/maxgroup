"""Готовит миниатюры объявлений для статического хостинга из URL, полученных от CarHub."""
import io
import json
import os
import re
import tempfile
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from webp import write_thumbnail

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "offer-photos.nosync"
LOCK = threading.Lock()
next_request = 0.0


def store(source, target, expiry):
    with tempfile.NamedTemporaryFile(dir=CACHE, delete=False) as temp:
        path = Path(temp.name)
    try:
        write_thumbnail(source, path)
        path.chmod(0o644)
        os.utime(path, (time.time(), expiry))
        path.replace(target)
    finally:
        path.unlink(missing_ok=True)


def thumbnail(item):
    global next_request
    car_id, url = item
    target = CACHE / f"{car_id}.webp"
    if target.exists() and target.stat().st_mtime > time.time():
        return True
    previous = target.with_suffix(".jpg")
    if previous.exists() and previous.stat().st_mtime > time.time():
        try:
            store(previous, target, previous.stat().st_mtime)
            return True
        except OSError:
            pass
    with LOCK:
        delay = next_request - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        next_request = time.monotonic() + 0.6
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MaxGroup catalog thumbnails/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            control = response.headers.get("Cache-Control", "").lower()
            ttl = re.search(r"(?:^|,)\s*max-age=(\d+)", control)
            if not ttl or "no-store" in control or "private" in control:
                return False
            expiry = time.time() + min(86400, int(ttl.group(1)))
            if not response.headers.get_content_type().startswith("image/"):
                return False
            raw = response.read(12_000_001)
        if len(raw) > 12_000_000:
            return False
        store(io.BytesIO(raw), target, expiry)
        return True
    except (OSError, ValueError) as error:
        print(f"Фото {car_id}: {error}", flush=True)
        return False


if __name__ == "__main__":
    feed = json.loads((ROOT / "data/model-offers.json").read_text())
    urls = {car["id"]: car["photo"] for group in feed.values() for car in group["cars"]}
    CACHE.mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        ready = sum(pool.map(thumbnail, urls.items()))
    for path in CACHE.glob("*.webp"):
        if path.stem.isdigit() and int(path.stem) not in urls and path.stat().st_mtime < time.time():
            path.unlink(missing_ok=True)
    print(f"Миниатюры объявлений: {ready} из {len(urls)}", flush=True)
