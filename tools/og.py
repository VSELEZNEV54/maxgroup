#!/usr/bin/env python3
"""Превью для мессенджеров и соцсетей (og:image): JPG 1200×630 из первого фото каждого автомобиля.

Запуск: python3 tools/og.py            — все автомобили из assets/img/cars
        python3 tools/og.py toyota-prius-2024-1 …   — только указанные
        python3 tools/og.py cars/kia-carnival-2023-1/02.webp …   — любой кадр из assets/img (например, обложка статьи)
        python3 tools/og.py --force    — пересоздать, даже если файл свежий

Результат: assets/img/og/cars-<id>-01.jpg. Шаблон headTags() (src/lib/seo.mjs) сам подставляет такую копию
вместо assets/img/cars/<id>/01.webp, если она есть: страницы автомобиля, модели, марки, подборки и среза
указывают в ogImage первое фото, а в разметку уходит JPG.

Кадрирование. Фото с аукционов и площадок — 4:3 (у японских лотов 640×480), превью — 1,9:1.
Обрезать 4:3 до 1,9:1 по центру нельзя: теряется треть высоты, у автомобиля срезаются крыша или колёса.
Поэтому кадр вписывается по высоте целиком, а поля по бокам закрывает подложка — тот же снимок,
растянутый на весь холст, размытый и затемнённый. Маленький исходник при этом увеличивается не больше чем в 1,35 раза.
Широкие исходники (от 1,75:1) обрезаются по краям без подложки.
"""
import os
import sys
from PIL import Image, ImageFilter, ImageEnhance

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')
SRC = os.path.join(ROOT, 'cars')
DST = os.path.join(ROOT, 'og')
W, H = 1200, 630
MAX_UPSCALE = 1.35

args = [a for a in sys.argv[1:] if not a.startswith('--')]
force = '--force' in sys.argv


def cover(im, w, h):
    """Заполнить холст w×h с обрезкой по центру."""
    k = max(w / im.width, h / im.height)
    t = im.resize((max(w, round(im.width * k)), max(h, round(im.height * k))), Image.LANCZOS)
    x, y = (t.width - w) // 2, (t.height - h) // 2
    return t.crop((x, y, x + w, y + h))


def make(src, dst):
    im = Image.open(src).convert('RGB')
    if im.width / im.height >= 1.75:
        out = cover(im, W, H)
    else:
        # подложка: тот же кадр на весь холст, размытый и затемнённый
        out = cover(im, W, H).filter(ImageFilter.GaussianBlur(28))
        out = ImageEnhance.Brightness(out).enhance(0.55)
        k = min(H / im.height, MAX_UPSCALE)
        fg = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        if fg.width > W:
            fg = cover(fg, W, fg.height)
        out.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    out.save(dst, 'JPEG', quality=84, optimize=True, progressive=True)


os.makedirs(DST, exist_ok=True)
made = skipped = 0
ids = args or sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))
for item in ids:
    # путь к кадру («cars/<id>/02.webp») или id автомобиля (берётся первое фото)
    rel = item if '/' in item else f'cars/{item}/01.webp'
    src = os.path.join(ROOT, rel)
    if not os.path.exists(src):
        print('нет файла:', rel)
        continue
    # имя как в headTags(): img/cars/<id>/01.webp → img/og/cars-<id>-01.jpg
    dst = os.path.join(DST, os.path.splitext(rel)[0].replace('/', '-') + '.jpg')
    if not force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        skipped += 1
        continue
    try:
        make(src, dst)
        made += 1
    except Exception as e:  # noqa: BLE001
        print('пропуск', src, e)

print(f'og: создано {made}, актуальных {skipped}')
