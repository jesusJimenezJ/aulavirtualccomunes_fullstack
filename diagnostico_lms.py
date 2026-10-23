import frappe

print("=== USUARIOS ===")
for row in frappe.get_all(
    "User",
    fields=["name", "enabled", "user_type"],
    order_by="creation desc",
    limit=15
):
    print(row)

print("=== CURSOS ===")
for row in frappe.get_all(
    "LMS Course",
    fields=["name", "title", "published"],
    order_by="creation desc",
    limit=15
):
    print(row)

print("=== MATRÍCULAS ===")
print(frappe.db.get_table_columns("LMS Enrollment"))