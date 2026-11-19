"""Конвертация растрового изображения для сайта. Вызывается генератором страниц."""
import os
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence


def save_webp(image, destination, **options):
    # Параллельные сборки никогда не читают частично записанный файл.
    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as tmp:
        temporary = Path(tmp.name)
    try:
        image.save(temporary, "WEBP", quality=84, method=6, **options)
        temporary.chmod(0o644)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def convert(source, destination):
    with Image.open(source) as opened:
        animation = {}
        if getattr(opened, "is_animated", False):
            frames, durations = [], []
            for index, frame in enumerate(ImageSequence.Iterator(opened)):
                if index == 0 and opened.info.get("default_image"):
                    continue
                frames.append(frame.convert("RGBA"))
                durations.append(frame.info.get("duration", 100))
            animation = {"save_all": True, "duration": durations, "loop": opened.info.get("loop", 0)}
        else:
            oriented = ImageOps.exif_transpose(opened)
            frames = [oriented.convert("RGBA" if oriented.has_transparency_data else "RGB")]
        image = frames[0]
        for width in (480, 800):
            variant = destination.with_name(f"{destination.stem}-{width}.webp")
            if image.width <= width:
                variant.unlink(missing_ok=True)
                continue
            height = max(1, round(image.height * width / image.width))
            small = [frame.resize((width, height), Image.Resampling.LANCZOS) for frame in frames]
            save_webp(small[0], variant, append_images=small[1:], **animation)
        save_webp(image, destination, append_images=frames[1:], **animation)


def write_thumbnail(source, destination):
    with Image.open(source) as opened:
        photo = ImageOps.exif_transpose(opened).convert("RGB")
        photo.thumbnail((640, 480), Image.Resampling.LANCZOS)
        photo.save(destination, "WEBP", quality=84, method=5)


if __name__ == "__main__":
    if sys.argv[1:] == ["--thumbnail"]:
        write_thumbnail(sys.stdin.buffer, sys.stdout.buffer)
    else:
        convert(Path(sys.argv[1]), Path(sys.argv[2]))
