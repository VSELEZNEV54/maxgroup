from wagtail.permission_policies.base import ModelPermissionPolicy
from wagtail.snippets.views.snippets import SnippetViewSet


class JournalPermissions(ModelPermissionPolicy):
    def user_has_permission(self, user, action):
        return action == "view" and super().user_has_permission(user, "view")

    def user_has_any_permission(self, user, actions):
        return "view" in actions and self.user_has_permission(user, "view")


class JournalViewSet(SnippetViewSet):
    inspect_view_enabled = True
    add_to_admin_menu = True
    copy_view_enabled = False
    list_export = []  # Personal information is inspected in the authorised journal.

    @property
    def permission_policy(self):
        return JournalPermissions(self.model)
