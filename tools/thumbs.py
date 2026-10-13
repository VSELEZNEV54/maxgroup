#!/usr/bin/env python3
"""Генерирует уменьшенные версии изображений (-480, -800) для srcset.
Запуск: python3 tools/thumbs.py            — все подходящие папки assets/img
        python3 tools/thumbs.py cars cases — только указанные подпапки
Шаблон img() в src/lib/core.mjs сам подхватывает варианты, если они лежат рядом с оригиналом.
Превью для мессенджеров (og:image, JPG 1200×630) делает отдельный скрипт — tools/og.py.
"""
import os
import sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img')
DIRS = sys.argv[1:] or ['cars', 'cases', 'hero', 'team', 'services', 'countries', 'reels', 'misc', 'reviews']
SIZES = [480, 800]
made = skipped = 0

for d in DIRS:
    for base, _, files in os.walk(os.path.join(ROOT, d)):
        for f in files:
            name, ext = os.path.splitext(f)
            if ext.lower() != '.webp' or name.endswith(tuple(f'-{s}' for s in SIZES)):
                continue
            src = os.path.join(base, f)
            try:
                im = Image.open(src)
                w, h = im.size
            except Exception as e:  # noqa: BLE001
                print('пропуск', src, e)
                continue
            for s in SIZES:
                dst = os.path.join(base, f'{name}-{s}{ext}')
                if w <= s * 1.15:
                    continue
                if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                    skipped += 1
                    continue
                t = im.convert('RGB') if im.mode not in ('RGB', 'RGBA') else im
                t = t.resize((s, max(1, round(h * s / w))), Image.LANCZOS)
                t.save(dst, 'WEBP', quality=78, method=6)
                made += 1

print(f'готово: создано {made}, актуальных {skipped}')
