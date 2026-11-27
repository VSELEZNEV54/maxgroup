"""Локальная модель подбирает ответ из опубликованных материалов компании."""
import hashlib
import json
import re
from functools import lru_cache

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_POST


@lru_cache(maxsize=2)
def topics_for(path, modified):
    return json.loads(path.read_text(encoding="utf-8"))


def model_reply(messages, schema, max_tokens):
    response = requests.post(settings.CHAT_MODEL_URL.rstrip("/") + "/v1/chat/completions",
        json={"model": "maxgroup", "messages": messages, "temperature": 0, "max_tokens": max_tokens,
              "response_format": {"type": "json_schema", "json_schema": {"name": "response", "schema": schema}}},
        timeout=(2, 18), allow_redirects=False)
    response.raise_for_status()
    return json.loads(response.json()["choices"][0]["message"]["content"])


def choose_topic(topics, question, history):
    words = set(re.findall(r"[а-яa-z0-9-]+", question.casefold().replace("ё", "е")))
    previous = history[-1]["topic"] if history else ""
    cities = {t["id"] for t in topics if t["id"].startswith("city-") and
              words.intersection(t["keywords"].casefold().replace("ё", "е").split())}
    if words.intersection({"телефон", "телефона", "связаться", "позвонить", "перезвоните", "адрес", "контакты"}):
        return "contact"
    if cities and (len(words) <= 4 or any(w.startswith(("автовоз", "достав", "перевоз", "отправ")) for w in words)):
        return next(iter(cities)) if len(cities) == 1 else "delivery"
    options = {t["id"]: t["question"] for t in topics if not t["id"].startswith("city-")
               or t["id"] == previous or t["id"] in cities}
    options["other"] = "Другой вопрос, уточнение у менеджера"
    messages = [{"role": "system", "content":
        "Ты консультант Макс Групп. Выбери тему последнего вопроса по смыслу. Учитывай предыдущие "
        "реплики для продолжения темы. Для доставки в конкретный город всегда выбирай этот город. "
        "Если ни один ответ не подходит, выбери other. Темы: " +
        json.dumps(options, ensure_ascii=False)}]
    if history and (len(words) <= 5 or words.intersection({"там", "тогда", "такой", "туда"})):
        turn = history[-1]
        messages.append({"role": "user", "content": turn["question"]})
        messages.append({"role": "assistant", "content": json.dumps({"topic": previous if previous in options else "other"})})
    messages.append({"role": "user", "content": question})
    schema = {"type": "object", "properties": {"topic": {"type": "string", "enum": list(options)}},
              "required": ["topic"], "additionalProperties": False}
    result = model_reply(messages, schema, 40)["topic"]
    if result == "delivery" and len(cities) == 1:
        return next(iter(cities))
    return result if result in options else "other"


def selection_question(question, history):
    prompts = {"model": "Какую марку или тип кузова вы рассматриваете?", "budget": "На какой бюджет ориентируемся?",
               "year": "Какой год выпуска вас устроит?", "mileage": "Какой пробег для вас приемлем?",
               "market": "Из какой страны хотите привезти автомобиль?", "ready": "Передать эти пожелания менеджеру?"}
    messages = [{"role": "system", "content":
        "Ты консультант по подбору авто. Выбери еще неизвестный параметр (field) и задай клиенту "
        "один короткий уточняющий вопрос (question) по-русски. Не пересказывай запрос. Пример для year: "
        "«Какой год выпуска вас устроит?». Если все пожелания собраны, выбери ready. "
        "Не предлагай конкретные машины, цены, сроки и телефоны."}]
    for turn in history:
        if turn["topic"] != "selection":
            continue
        messages.append({"role": "user", "content": turn["question"]})
        if turn.get("answer"):
            messages.append({"role": "assistant", "content": turn["answer"]})
    messages.append({"role": "user", "content": question})
    schema = {"type": "object", "properties": {"field": {"type": "string", "enum": list(prompts)},
              "question": {"type": "string"}}, "required": ["field", "question"], "additionalProperties": False}
    response = model_reply(messages, schema, 90)
    text = response["question"].strip()
    if len(text) <= 220 and text.endswith("?") and text.count("?") == 1 and not re.search(r"https?:|www\.|₽", text):
        return text
    return prompts.get(response.get("field"), "")


@require_POST
def reply(request):
    if request.content_type != "application/json" or int(request.META.get("CONTENT_LENGTH") or 0) > 10000:
        return JsonResponse({"error": "Ожидается короткий вопрос."}, status=400)
    try:
        data = json.loads(request.body)
        question = data["question"].strip()
        history = data.get("history", [])
        if not 0 < len(question) <= 500 or not isinstance(history, list) or len(history) > 4:
            raise ValueError
        for turn in history:
            if not isinstance(turn["question"], str) or not isinstance(turn["topic"], str):
                raise ValueError
            answer = turn.get("answer", "")
            if not isinstance(answer, str) or len(answer) > 350 or len(turn["question"]) > 500 or len(turn["topic"]) > 80:
                raise ValueError
    except (ValueError, AttributeError, KeyError, TypeError, RecursionError):
        return JsonResponse({"error": "Проверьте текст вопроса."}, status=400)
    # nginx добавляет адрес непосредственного клиента в конец X-Forwarded-For.
    ip = (request.META.get("HTTP_X_FORWARDED_FOR") or request.META.get("REMOTE_ADDR", "")).split(",")[-1].strip()
    key = "chat-limit:" + hashlib.sha256(ip.encode()).hexdigest()
    if not cache.add(key, 1, timeout=60):
        try:
            if cache.incr(key) > 15:
                return JsonResponse({"error": "Слишком много вопросов. Попробуйте через минуту."}, status=429)
        except ValueError:
            cache.add(key, 1, timeout=60)
    try:
        path = settings.RELEASE_DIR / "assets/chat/guide.json"
        topics = topics_for(path, path.stat().st_mtime_ns)
        topic = choose_topic(topics, question, history)
    except (requests.RequestException, OSError, ValueError, KeyError, IndexError, TypeError, RecursionError):
        return JsonResponse({"error": "ИИ сейчас недоступен. Выберите тему или передайте вопрос менеджеру."}, status=503)
    result = {"topic": topic}
    if topic == "selection":
        try:
            result["answer"] = selection_question(question, history)
        except (requests.RequestException, ValueError, KeyError, IndexError, TypeError, AttributeError):
            pass  # В интерфейсе остаётся ответ о подборе из справочника.
    return JsonResponse(result)
