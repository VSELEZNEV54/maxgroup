"""Фото первого экрана квизов: сырые PNG генератора → WebP для страницы.

    python3 квизы/renders.py <папка с <file>_raw.png> [--force]

Список сцен и промпты в квизы/renders.json. На выходе assets/img/renders/<file>.webp (1400 px)
и <file>-800.webp (800 px), пропорции исходника сохраняются. Затем пересобрать квизы: node квизы/build.mjs
"""
import glob
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "assets", "img", "renders")


def save(im, width, path, q):
    h = round(im.height * width / im.width)
    im.resize((width, h), Image.LANCZOS).save(path, "WEBP", quality=q, method=6)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    known = {it["file"] for it in json.load(open(os.path.join(HERE, "renders.json")))["items"]}
    os.makedirs(OUT, exist_ok=True)
    done = 0
    for f in sorted(glob.glob(os.path.join(args[0], "*_raw.png"))):
        name = os.path.basename(f)[: -len("_raw.png")]
        if name not in known:
            print(f"пропуск {name}: нет в renders.json")
            continue
        big = os.path.join(OUT, name + ".webp")
        if os.path.exists(big) and not force:
            print(f"есть {name}, пропуск (--force перезаписать)")
            continue
        im = Image.open(f).convert("RGB")
        save(im, min(1400, im.width), big, 82)
        save(im, 800, os.path.join(OUT, name + "-800.webp"), 80)
        done += 1
        print(f"ok {name}: {os.path.getsize(big) // 1024} КБ")
    # размеры для srcset в build.mjs
    sizes = {os.path.basename(f)[:-5]: Image.open(f).size for f in glob.glob(os.path.join(OUT, "*.webp")) if not f.endswith("-800.webp")}
    json.dump(sizes, open(os.path.join(OUT, "sizes.json"), "w"), ensure_ascii=False, indent=1, sort_keys=True)
    print(f"обработано {done}, в папке {len(glob.glob(os.path.join(OUT, '*-800.webp')))} из {len(known)}")
