"""Обновить данные карточек и реестр в документации из клиентского CSV."""
import csv
import json
import re
from collections import Counter
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
CSV_FILE = ROOT / "data/source/cars90-2026-11.csv"
DATA_FILE = ROOT / "data/popular-models.json"
DOC_FILE = ROOT / "docs/top-30.md"
MARKER = "<!-- Реестр из CSV -->"
COUNTRIES = {"Япония": "japan", "Китай": "china", "Корея": "korea"}


def engine_label(value):
    if value == "46143,0" or not value:
        return None
    if value == "1,5 НЕ МОГУ ПРАВИЛЬНО СОХРАНИТЬ":
        return "1,5 л (уточняется)"
    return re.sub(
        r"\b(\d+[.,]\d+)(T)?\b",
        lambda m: m[1].replace(".", ",") + (" л турбо" if m[2] else " л"),
        value,
    )


def read_models():
    models = []
    with CSV_FILE.open(encoding="utf-8-sig", newline="") as source:
        for raw in csv.DictReader(source):
            row = {key: " ".join(value.split()) for key, value in raw.items()}
            amount = row["Примерная цена под ключ, ₽"].removesuffix("₽").replace(" ", "")
            source_text = row["Источник цены"].replace("ОЦЕНКА", "Оценка")
            models.append({
                "sourceNumber": int(row["№"]),
                "country": COUNTRIES[row["Страна"]],
                "name": row["Марка и модель"],
                "years": row["Год"],
                "engine": engine_label(row["Двигатель / мощность"]),
                "trim": row["Комплектация"],
                "priceRub": int(amount) if amount else None,
                "priceFrom": "«от»" in source_text,
                "priceDestination": next((place for place in ("до Владивостока", "в РФ") if place in source_text), None),
                "priceSource": source_text,
                "note": row["Пометка"],
            })
    if Counter(m["country"] for m in models) != {key: 30 for key in COUNTRIES.values()}:
        raise ValueError("Ожидалось по 30 записей для Японии, Китая и Кореи")
    if len({m["sourceNumber"] for m in models}) != len(models):
        raise ValueError("Номера строк CSV должны быть уникальны")
    return models


def register(models):
    lines = []
    for country, key in COUNTRIES.items():
        rows = [m for m in models if m["country"] == key]
        sources = list(dict.fromkeys(m["priceSource"] for m in rows))
        notes = list(dict.fromkeys(m["note"] for m in rows))
        lines.extend([
            f"## {country}", "",
            "| № в CSV | Марка и модель | Год | Двигатель и мощность | Комплектация | Под ключ, ₽ | Источник | Пометка |",
            "|---:|---|---|---|---|---:|:---:|:---:|",
        ])
        for m in rows:
            amount = "По запросу"
            if m["priceRub"] is not None:
                amount = ("от " if m["priceFrom"] else "") + f'{m["priceRub"]:,}'.replace(",", " ")
            cells = [
                m["sourceNumber"], m["name"], m["years"], m["engine"] or "Уточняется",
                m["trim"], amount, sources.index(m["priceSource"]) + 1, notes.index(m["note"]) + 1,
            ]
            lines.append("| " + " | ".join(str(cell).replace("|", r"\|") for cell in cells) + " |")
        for heading, values in [("Источники цен", sources), ("Пометки в CSV", notes)]:
            lines.extend(["", f"**{heading}**", ""])
            lines.extend(f"{i}. {value}" for i, value in enumerate(values, 1))
        lines.append("")
    return "\n".join(lines)


def write_if_changed(path, text):
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    # Сборка может идти параллельно. После замены она прочитает целый файл.
    with TemporaryDirectory(dir=path.parent, prefix=".top-30-") as staging:
        temp = Path(staging) / path.name
        temp.write_text(text, encoding="utf-8")
        if path.exists():
            temp.chmod(path.stat().st_mode)
        temp.replace(path)


if __name__ == "__main__":
    models = read_models()
    intro, marker, _ = DOC_FILE.read_text(encoding="utf-8").partition(MARKER)
    if not marker:
        raise ValueError(f"В {DOC_FILE.name} отсутствует маркер реестра")
    report = intro + marker + "\n\n" + register(models)
    write_if_changed(DATA_FILE, json.dumps(models, ensure_ascii=False, indent=2) + "\n")
    write_if_changed(DOC_FILE, report)
