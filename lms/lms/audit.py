"""Persistent audit logging for LMS entities and role changes."""
import json

import frappe
from frappe.utils import now_datetime

AUDIT_DOCTYPE = "CCOMUNES Audit Log"
MAX_STATE_LENGTH = 12000

USER_FIELDS = (
    "name", "full_name", "first_name", "last_name", "email",
    "enabled", "user_type", "creation", "modified", "modified_by", "roles",
)
SENSITIVE_PARTS = (
    "password", "token", "secret", "api_key", "private_key",
    "reset", "otp", "authorization", "cookie",
)
SAFE_FIELD_TYPES = {
    "Data", "Select", "Check", "Int", "Float", "Currency",
    "Percent", "Date", "Datetime", "Time", "Link",
    "Dynamic Link", "Small Text", "Text", "Long Text",
}

def _safe_value(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_safe_value(v) for v in value[:100]]
    return str(value)

def snapshot(doc):
    """Capture a bounded, non-secret snapshot of a document."""
    if not doc:
        return None

    doctype = doc.doctype
    if doctype == "User":
        fields = USER_FIELDS
    else:
        meta = frappe.get_meta(doctype)
        fields = [
            f.fieldname for f in meta.fields
            if f.fieldname
            and f.fieldtype in SAFE_FIELD_TYPES
            and not any(part in f.fieldname.lower() for part in SENSITIVE_PARTS)
        ]

    result = {}
    for field in fields:
        if field == "roles" and doctype == "User":
            result["roles"] = sorted({
                row.role for row in (doc.get("roles") or []) if row.role
            })
        elif doc.get(field) is not None:
            result[field] = _safe_value(doc.get(field))

    result["name"] = doc.name
    result["doctype"] = doctype
    encoded = json.dumps(result, ensure_ascii=False, default=str)
    if len(encoded) > MAX_STATE_LENGTH:
        encoded = encoded[:MAX_STATE_LENGTH] + "... [truncated]"
    return encoded

def _insert_log(action, doctype, name, before=None, after=None,
                target_user=None, role=None, summary=None):
    """Insert in the current transaction; deliberately do not commit."""
    if not frappe.db.exists("DocType", AUDIT_DOCTYPE):
        frappe.log_error(
            "Audit DocType is not installed; event was not persisted.",
            "CCOMUNES Audit Log",
        )
        return

    session_user = getattr(frappe.session, "user", None)
    request_id = getattr(frappe.local, "request_id", None)
    source = "request" if getattr(frappe.local, "request", None) else "background"

    log = frappe.get_doc({
        "doctype": AUDIT_DOCTYPE,
        "action": action,
        "reference_doctype": doctype,
        "reference_name": str(name or ""),
        "actor": session_user if session_user and session_user != "Guest" else None,
        "event_timestamp": now_datetime(),
        "before_state": before,
        "after_state": after,
        "target_user": target_user,
        "role": role,
        "request_id": str(request_id) if request_id else None,
        "source": source,
        "summary": (summary or "")[:140],
    })
    log.insert(ignore_permissions=True)

def audit_after_insert(doc, method=None):
    _insert_log(
        "Create", doc.doctype, doc.name,
        after=snapshot(doc), summary="Documento creado",
    )

def audit_on_update(doc, method=None):
    if getattr(doc.flags, "in_insert", False):
        return

    previous = doc.get_doc_before_save()
    # Avoid inventing a "before" state when Frappe cannot provide one.
    before = snapshot(previous) if previous else None
    after = snapshot(doc)

    if before == after:
        return

    _insert_log(
        "Update", doc.doctype, doc.name,
        before=before, after=after, summary="Documento modificado",
    )

def audit_on_trash(doc, method=None):
    _insert_log(
        "Delete", doc.doctype, doc.name,
        before=snapshot(doc), summary="Documento eliminado",
    )

def log_role_change(user, role, before, after):
    if bool(before) == bool(after):
        return

    _insert_log(
        "Role Assigned" if after else "Role Revoked",
        "User", user,
        before=json.dumps({"user": user, "role": role, "assigned": bool(before)}),
        after=json.dumps({"user": user, "role": role, "assigned": bool(after)}),
        target_user=user,
        role=role,
        summary=("Rol asignado: " if after else "Rol revocado: ") + role,
    )
