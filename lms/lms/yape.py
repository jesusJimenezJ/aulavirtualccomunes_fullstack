import frappe
from frappe import _
from frappe.utils import now_datetime
from lms.lms.utils import complete_enrollment


def _get_payment(payment_name):
    if not payment_name:
        frappe.throw(_("Payment record is required."))

    payment = frappe.get_doc("LMS Payment", payment_name)

    if payment.member != frappe.session.user:
        frappe.throw(_("You are not authorized to access this payment."), frappe.PermissionError)

    return payment


def _require_reviewer():
    if not (
        frappe.session.user == "Administrator"
        or frappe.has_role("System Manager")
        or frappe.has_role("Moderator")
    ):
        frappe.throw(_("Only authorized reviewers can manage Yape payments."), frappe.PermissionError)


@frappe.whitelist()
def submit_yape_receipt(payment_name: str, operation_number: str, receipt_url: str):
    payment = _get_payment(payment_name)

    if payment.payment_method != "Yape":
        frappe.throw(_("This payment is not configured for Yape."))

    if payment.payment_received or payment.payment_status in ("Submitted", "Approved"):
        frappe.throw(_("This payment has already been submitted or processed."))

    if payment.payment_status == "Rejected":
        frappe.throw(_("This payment was rejected. Contact the administrator."))

    operation_number = (operation_number or "").strip()
    receipt_url = (receipt_url or "").strip()

    if not operation_number:
        frappe.throw(_("Enter the Yape operation number."))

    if not receipt_url:
        frappe.throw(_("Upload the payment receipt."))

    duplicate = frappe.db.exists(
        "LMS Payment",
        {
            "yape_operation_number": operation_number,
            "name": ["!=", payment.name],
        },
    )
    if duplicate:
        frappe.throw(_("This Yape operation number has already been used."))

    receipt = frappe.db.get_value(
        "File",
        {"file_url": receipt_url, "owner": frappe.session.user},
        ["name", "is_private"],
        as_dict=True,
    )

    if not receipt or not receipt.is_private:
        frappe.throw(_("The receipt must be uploaded as a private file owned by your account."))

    frappe.db.set_value(
        "File",
        receipt.name,
        {
            "attached_to_doctype": "LMS Payment",
            "attached_to_name": payment.name,
            "attached_to_field": "payment_receipt",
        },
    )

    frappe.db.set_value(
        "LMS Payment",
        payment.name,
        {
            "yape_operation_number": operation_number,
            "payment_receipt": receipt_url,
            "payment_status": "Submitted",
            "payment_submitted_on": now_datetime(),
        },
    )

    return {
        "success": True,
        "payment_name": payment.name,
        "payment_status": "Submitted",
        "message": _("Receipt submitted. Your payment is awaiting verification."),
    }


@frappe.whitelist()
def approve_yape_payment(payment_name: str):
    _require_reviewer()

    frappe.db.sql(
        "SELECT name FROM `tabLMS Payment` WHERE name = %s FOR UPDATE",
        payment_name,
    )

    payment = frappe.get_doc("LMS Payment", payment_name)

    if payment.payment_method != "Yape":
        frappe.throw(_("This is not a Yape payment."))

    if payment.payment_status == "Approved" and payment.payment_received:
        return {"success": True, "message": _("This payment was already approved.")}

    if payment.payment_status != "Submitted":
        frappe.throw(_("Only submitted payments can be approved."))

    if not payment.yape_operation_number or not payment.payment_receipt:
        frappe.throw(_("The operation number and receipt are required."))

    if not payment.payment_for_document_type or not payment.payment_for_document:
        frappe.throw(_("The payment is missing its course or batch reference."))

    frappe.db.set_value(
        "LMS Payment",
        payment.name,
        {
            "payment_received": 1,
            "payment_status": "Approved",
            "payment_verified_by": frappe.session.user,
            "payment_verified_on": now_datetime(),
        },
    )

    complete_enrollment(
        payment.name,
        payment.payment_for_document_type,
        payment.payment_for_document,
    )

    return {
        "success": True,
        "payment_name": payment.name,
        "payment_status": "Approved",
        "message": _("Payment approved and enrollment processed."),
    }


@frappe.whitelist()
def reject_yape_payment(payment_name: str, reason: str):
    _require_reviewer()

    if not reason or not reason.strip():
        frappe.throw(_("Provide a reason for rejecting the payment."))

    frappe.db.sql(
        "SELECT name FROM `tabLMS Payment` WHERE name = %s FOR UPDATE",
        payment_name,
    )

    payment = frappe.get_doc("LMS Payment", payment_name)

    if payment.payment_method != "Yape":
        frappe.throw(_("This is not a Yape payment."))

    if payment.payment_received or payment.payment_status == "Approved":
        frappe.throw(_("An approved payment cannot be rejected."))

    if payment.payment_status != "Submitted":
        frappe.throw(_("Only submitted payments can be rejected."))

    frappe.db.set_value(
        "LMS Payment",
        payment.name,
        {
            "payment_status": "Rejected",
            "payment_admin_notes": reason.strip(),
            "payment_verified_by": frappe.session.user,
            "payment_verified_on": now_datetime(),
        },
    )

    return {
        "success": True,
        "payment_name": payment.name,
        "payment_status": "Rejected",
        "message": _("Payment rejected."),
    }

@frappe.whitelist()
def get_yape_payment(payment_name: str):
    """Return only the authenticated user's Yape payment details."""
    payment = _get_payment(payment_name)

    if payment.payment_method != "Yape":
        frappe.throw(_("This record is not a Yape payment."))

    return {
        "name": payment.name,
        "member": payment.member,
        "payment_method": payment.payment_method,
        "payment_status": payment.payment_status,
        "payment_received": payment.payment_received,
        "amount": payment.amount,
        "amount_with_gst": getattr(payment, "amount_with_gst", None),
        "currency": payment.currency,
        "payment_for_document_type": getattr(payment, "payment_for_document_type", None),
        "payment_for_document": getattr(payment, "payment_for_document", None),
        "payment_submitted_on": getattr(payment, "payment_submitted_on", None),
        "payment_verified_on": getattr(payment, "payment_verified_on", None),
        "payment_admin_notes": getattr(payment, "payment_admin_notes", None),
    }
