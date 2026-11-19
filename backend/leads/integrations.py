"""CRM credentials stay on the worker. Exceptions only describe the stage or HTTP status."""
import json
import os
import re
from urllib.parse import urlsplit

import requests


class DeliveryError(Exception):
    pass


class RetryLater(DeliveryError):
    pass


class Uncertain(DeliveryError):
    pass


def config(key):
    value = os.environ.get(key, "").strip()
    if not value:
        raise DeliveryError("Требуется настройка " + key)
    return value


def endpoint(key):
    base = config(key).rstrip("/")
    if urlsplit(base).scheme != "https" or not urlsplit(base).hostname:
        raise DeliveryError("Требуется HTTPS в " + key)
    return base


def call(method, url, *, creating=False, **kwargs):
    try:
        response = requests.request(method, url, timeout=(4, 15), allow_redirects=False, **kwargs)
    except requests.RequestException:
        raise (Uncertain if creating else RetryLater)("Ошибка соединения с CRM") from None
    if response.status_code == 429:
        raise RetryLater("CRM ограничила частоту запросов")
    if response.status_code >= 500:
        raise (Uncertain if creating else RetryLater)(f"HTTP {response.status_code}")
    if response.status_code == 204:
        return {}
    if not response.ok or response.is_redirect:
        raise DeliveryError(f"CRM HTTP {response.status_code}")
    try:
        result = response.json()
        if not isinstance(result, (dict, list)):
            raise ValueError
    except ValueError:
        raise (Uncertain if creating else RetryLater)("CRM вернула неожиданный ответ") from None
    return result


def note(lead):
    return "\n".join([lead.page, lead.name, lead.phone, json.dumps(lead.details, ensure_ascii=False)])[:8000]


class Amo:
    def __init__(self):
        self.base = endpoint("AMO_BASE_URL") + "/api/v4/leads"
        self.headers = {"Authorization": "Bearer " + config("AMO_ACCESS_TOKEN")}
        fields = [config(k) for k in ("AMO_EXTERNAL_ID_FIELD", "AMO_PHONE_FIELD", "AMO_DETAILS_FIELD")]
        if not all(v.isascii() and v.isdigit() for v in fields) or len(set(fields)) != 3:
            raise DeliveryError("Проверьте ID трёх пользовательских полей amoCRM")
        self.key, self.phone, self.details = map(int, fields)

    def find(self, lead):
        key = str(lead.pk)
        result = call("GET", self.base, headers=self.headers, params={"query": key, "limit": 250})
        for row in result.get("_embedded", {}).get("leads", []):
            if any(f["field_id"] == self.key and any(str(v.get("value")) == key for v in f["values"])
                   for f in row.get("custom_fields_values") or []):
                return str(row["id"])
        return ""

    def create(self, lead):
        fields = [{"field_id": field, "values": [{"value": value}]} for field,value in (
            (self.key, str(lead.pk)), (self.phone, lead.phone), (self.details, note(lead)))]
        result = call("POST", self.base, creating=True, headers=self.headers,
                      json=[{"name": lead.subject, "custom_fields_values": fields}])
        return str(result["_embedded"]["leads"][0]["id"])


class Bitrix:
    def __init__(self):
        self.base = endpoint("BITRIX_WEBHOOK_URL")
        self.key = config("BITRIX_EXTERNAL_ID_FIELD")
        if not re.fullmatch(r"UF_CRM_[A-Z0-9_]+", self.key):
            raise DeliveryError("Проверьте код поля Битрикс24")

    def execute(self, name, data, creating=False):
        result = call("POST", self.base + "/crm.lead." + name + ".json", json=data, creating=creating)
        if result.get("error"):
            if result["error"] == "QUERY_LIMIT_EXCEEDED":
                raise RetryLater("Битрикс24 ограничил частоту запросов")
            raise DeliveryError("Битрикс24 отклонил запрос")
        return result["result"]

    def find(self, lead):
        rows = self.execute("list", {"filter": {"=" + self.key: str(lead.pk)}, "select": ["ID", self.key]})
        return next((str(r["ID"]) for r in rows if str(r.get(self.key)) == str(lead.pk)), "")

    def create(self, lead):
        fields = {"TITLE": lead.subject, "NAME": lead.name, self.key: str(lead.pk),
                  "PHONE": [{"VALUE": lead.phone, "VALUE_TYPE": "WORK"}], "COMMENTS": note(lead)}
        return str(self.execute("add", {"fields": fields}, creating=True))


def connector(crm):
    return {"amo": Amo, "bitrix": Bitrix}[crm]()
