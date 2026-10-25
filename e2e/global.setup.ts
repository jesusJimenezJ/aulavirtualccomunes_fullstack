
import { test as setup, expect } from "@playwright/test";
import { authFile } from "./config";

setup("authenticate", async ({ page }) => {
	const user = process.env.PLAYWRIGHT_TEST_USER || "frappe@example.com";
	const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "admin";

	await page.goto("/login");

	await page.locator("#login_email").fill(user);
	await page.locator("#login_password").fill(password);

	await Promise.all([
		page.waitForURL(
			(url) => !url.pathname.endsWith("/login"),
			{ timeout: 15000 }
		),
		page.getByRole("button", { name: "Iniciar sesión" }).click(),
	]);

	await expect(page).not.toHaveURL(/\/login(?:\?|$)/);

	await page.context().storageState({ path: authFile });

	console.log("[Playwright auth]", {
		url: page.url(),
		storageStateSaved: true,
	});
});
