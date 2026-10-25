import time

import frappe
from frappe import _
from frappe.model.naming import append_number_if_name_exists
from frappe.utils import cint, escape_html, random_string
from frappe.website.utils import cleanup_page_name, is_signup_disabled

from lms.lms.utils import get_country_code, get_lms_route

ALLOWED_USER_CATEGORIES = {
	"Business Owner",
	"Manager (Sales/Marketing/Customer)",
	"Employee",
	"Student",
	"Freelancer/Just looking",
	"Others",
}


def validate_username_duplicates(doc, method):
	while not doc.username or doc.username_exists():
		doc.username = append_number_if_name_exists(
			doc.doctype,
			cleanup_page_name(doc.full_name),
			fieldname="username",
		)

	if " " in doc.username:
		doc.username = doc.username.replace(" ", "")

	if len(doc.username) < 4:
		doc.username = doc.email.replace("@", "").replace(".", "")


def add_lms_student_role(doc, method):
	"""Assign the student role only to website users."""
	if doc.user_type == "Website User":
		doc.append_roles("LMS Student")


@frappe.whitelist(allow_guest=True)  # nosemgrep: frappe-semgrep-rules.rules.security.guest-whitelisted-method
def sign_up(
	email: str,
	full_name: str,
	verify_terms: bool = False,
	user_category: str = "",
):
	if is_signup_disabled():
		frappe.throw(_("Sign Up is disabled"), _("Not Allowed"))

	email = (email or "").strip().lower()
	full_name = (full_name or "").strip()
	user_category = (user_category or "").strip()

	if not email or not full_name:
		frappe.throw(_("Email and full name are required."))

	category_enabled = cint(frappe.db.get_single_value("LMS Settings", "user_category") or 0)

	if category_enabled and user_category not in ALLOWED_USER_CATEGORIES:
		frappe.throw(_("Please select a valid user category."))

	if not category_enabled:
		user_category = ""

	signup_content = frappe.db.get_single_value("LMS Settings", "custom_signup_content")
	if signup_content and not cint(verify_terms):
		frappe.throw(_("You must accept the terms to register."))

	existing_user = frappe.db.get("User", {"email": email})
	if existing_user:
		if existing_user.enabled:
			return 0, _("Already Registered")
		return 0, _("Registered but disabled")

	max_signups_allowed_per_hour = cint(frappe.get_system_settings("max_signups_allowed_per_hour") or 300)
	users_created_past_hour = frappe.db.get_creation_count("User", 60)

	if users_created_past_hour >= max_signups_allowed_per_hour:
		return frappe.respond_as_web_page(
			_("Temporarily Disabled"),
			_(
				"Too many users signed up recently, so the registration is "
				"disabled. Please try back in an hour"
			),
			http_status_code=429,
		)

	# Do not assign Portal Settings.default_role during public signup.
	# The before_insert hook assigns LMS Student to Website Users.
	for attempt in range(3):
		try:
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": escape_html(full_name),
					"verify_terms": cint(verify_terms),
					"user_category": user_category,
					"country": "",
					"enabled": 1,
					"new_password": random_string(10),
					"user_type": "Website User",
				}
			)
			user.flags.ignore_permissions = True
			user.flags.ignore_password_policy = True
			user.insert()
			break

		except frappe.DuplicateEntryError:
			frappe.db.rollback()
			return 0, _("Already Registered")

		except frappe.QueryDeadlockError:
			frappe.db.rollback()
			if attempt == 2:
				raise
			time.sleep(0.1 * (attempt + 1))

	set_country_from_ip(None, user.name)

	if user.flags.email_sent:
		return 1, _("Signup successful. Please check your email for verification.")

	return 2, _("Signup successful. Please ask your administrator to verify your sign-up.")


def set_country_from_ip(login_manager: object = None, user: str = None):
	if not user and login_manager:
		user = login_manager.user

	if not user:
		return

	user_country = frappe.db.get_value("User", user, "country")
	if user_country:
		return

	frappe.db.set_value("User", user, "country", get_country_code())


def on_login(login_manager):
	default_app = frappe.db.get_single_value("System Settings", "default_app")
	if default_app == "lms":
		frappe.local.response["home_page"] = get_lms_route()
