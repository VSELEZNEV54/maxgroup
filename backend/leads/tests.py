import os
import uuid
from unittest.mock import patch

import requests

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .integrations import Uncertain
from .models import Delivery, Lead
from .tasks import send_delivery


@override_settings(ALLOWED_HOSTS=["testserver"], CRM_ENABLED=False, CRM_DESTINATIONS=("amo", "bitrix"))
class IntakeTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        context = self.client.get("/api/leads/context/").json()
        self.csrf = context["csrf"]
        self.data = {"phone": "+7 (000) 000-00-00", "name": "Проверка", "agree": True, "page": "/",
                     "submission_id": context["submission_id"], "subject": "Проверка заявки"}

    def send(self, data):
        return self.client.post("/api/leads/", data=data, content_type="application/json",
                                headers={"X-CSRFToken": self.csrf, "Accept": "application/json"})

    def test_forms_validate_save_and_deduplicate(self):
        self.assertEqual(self.client.post("/api/leads/", self.data).status_code, 403)
        self.assertEqual(self.send({**self.data, "agree": False}).status_code, 400)
        self.assertEqual(self.send({**self.data, "phone": "1"}).status_code, 400)
        self.assertEqual(self.send(self.data).status_code, 201)
        self.assertEqual(self.send({**self.data, "createdAt": "2026-11-18T10:11:12Z"}).status_code, 200)
        self.assertEqual(self.send({**self.data, "subject": "другая тема"}).status_code, 409)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(set(Delivery.objects.values_list("crm", "status")), {("amo", "local"), ("bitrix", "local")})
        form = {**self.data, "submission_id": str(uuid.uuid4()), "agree": "on", "csrfmiddlewaretoken": self.csrf}
        self.assertContains(self.client.post("/api/leads/", form), "Заявка принята")

    def test_lead_manager_can_inspect_but_cannot_edit_journal(self):
        self.send(self.data)
        call_command("prepare_roles")
        manager = get_user_model().objects.create_user("lead-reader")
        manager.groups.add(Group.objects.get(name="Менеджеры заявок"))
        self.client.force_login(manager)
        lead = Lead.objects.get()
        base = "/admin/snippets/leads/lead/"
        self.assertContains(self.client.get(base), lead.subject)
        self.assertContains(self.client.get(base + f"inspect/{lead.pk}/"), lead.phone)
        edit = base + f"edit/{lead.pk}/"
        self.assertRedirects(self.client.get(edit), "/admin/", fetch_redirect_response=False)
        self.assertEqual(self.client.get(edit, headers={"X-Requested-With": "XMLHttpRequest"}).status_code, 403)

    @override_settings(CRM_ENABLED=True)
    def test_chat_handoff_creates_one_bitrix_delivery_with_conversation(self):
        data = {**self.data, "conversation": "Клиент: Доставка в Иркутск?"}
        def submit(payload):
            return self.client.post("/api/chat/lead/", payload, content_type="application/json",
                                    headers={"X-CSRFToken": self.csrf})
        self.assertEqual(submit({**data, "agree": False}).status_code, 400)
        self.assertEqual(submit(data).status_code, 201)
        self.assertEqual(submit(data).status_code, 200)
        lead = Lead.objects.get()
        self.assertEqual(lead.details["conversation"], data["conversation"])
        self.assertEqual(lead.details["source"], "chat")
        self.assertEqual(list(lead.deliveries.values_list("crm", "status")), [("bitrix", "pending")])
        self.assertEqual(submit({**data, "conversation": "Новая переписка"}).status_code, 409)
        row = lead.deliveries.get()
        with patch.dict(os.environ, {"BITRIX_WEBHOOK_URL": "https://example.invalid/rest/test",
                                     "BITRIX_EXTERNAL_ID_FIELD": "UF_CRM_MAXGROUP"}), \
                patch("backend.leads.integrations.call", side_effect=[{"result": []}, {"result": 42}]) as crm:
            send_delivery(row.pk)
            send_delivery(row.pk)
        self.assertEqual(crm.call_count, 2)
        args, kwargs = crm.call_args
        self.assertTrue(args[1].endswith("/crm.lead.add.json"))
        self.assertIn(data["conversation"], kwargs["json"]["fields"]["COMMENTS"])
        self.assertEqual(kwargs["json"]["fields"]["UF_CRM_MAXGROUP"], str(lead.pk))
        row.refresh_from_db()
        self.assertEqual((row.status, row.external_id), ("sent", "42"))

    def test_chat_validates_questions_and_recovers_from_model_outage(self):
        def ask(payload):
            return self.client.post("/api/chat/", payload, content_type="application/json", headers={"X-CSRFToken": self.csrf})
        self.assertEqual(self.client.post("/api/chat/", {}, content_type="application/json").status_code, 403)
        self.assertEqual(ask({"question": "а" * 501}).status_code, 400)
        self.assertEqual(ask({"question": "Доставка?", "history": ["invalid"]}).status_code, 400)
        with patch("backend.leads.chat.choose_topic", return_value="delivery"):
            self.assertEqual(ask({"question": "Какие сроки?"}).json(), {"topic": "delivery"})
        with patch("backend.leads.chat.choose_topic", return_value="selection"), \
                patch("backend.leads.chat.model_reply", return_value={"question": "Какой пробег вас устроит?"}):
            self.assertEqual(ask({"question": "Ищу кроссовер"}).json(),
                             {"topic": "selection", "answer": "Какой пробег вас устроит?"})
        with patch("backend.leads.chat.choose_topic", side_effect=requests.Timeout):
            self.assertEqual(ask({"question": "Какие сроки?"}).status_code, 503)
        self.assertFalse(Lead.objects.exists())

    @override_settings(CRM_ENABLED=True)
    def test_one_remote_delivery_cannot_duplicate_another(self):
        self.send(self.data)
        row = Delivery.objects.get(crm="amo")
        with patch("backend.leads.tasks.connector") as factory:
            api = factory.return_value
            api.find.side_effect = ["", "72"]
            api.create.side_effect = Uncertain("Соединение прервано")
            send_delivery(row.pk)
            Delivery.objects.filter(pk=row.pk).update(next_attempt=timezone.now())
            send_delivery(row.pk)
            send_delivery(row.pk)
            api.create.assert_called_once()
        row.refresh_from_db()
        self.assertEqual((row.status, row.external_id), ("sent", "72"))
        self.assertEqual(Delivery.objects.get(crm="bitrix").status, "pending")
