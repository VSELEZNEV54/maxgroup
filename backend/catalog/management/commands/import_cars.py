import csv
import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from backend.catalog.importer import import_rows


class Command(BaseCommand):
    help = "Загрузить нормализованные лоты из CSV (UTF-8) или массива JSON"

    def add_arguments(self, parser):
        parser.add_argument("source")
        parser.add_argument("file", type=Path)

    def handle(self, source, file, **options):
        try:
            with file.open(encoding="utf-8-sig", newline="") as stream:
                rows = csv.DictReader(stream) if file.suffix.lower() == ".csv" else json.load(stream)
                if not isinstance(rows, (list, csv.DictReader)):
                    raise ValueError("Ожидается список лотов")
                run = import_rows(source, rows)
        except (OSError, ValueError, ValidationError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(f"Импорт №{run.pk}, обработано {run.applied}")
