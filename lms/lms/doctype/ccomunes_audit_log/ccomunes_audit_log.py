import frappe
from frappe import _


class CCOMUNESAuditLog(frappe.model.document.Document):
	def validate(self):
		if not self.is_new():
			frappe.throw(
				_("Audit records cannot be modified."),
				frappe.PermissionError,
			)

	def on_trash(self):
		frappe.throw(
			_("Audit records cannot be deleted."),
			frappe.PermissionError,
		)
