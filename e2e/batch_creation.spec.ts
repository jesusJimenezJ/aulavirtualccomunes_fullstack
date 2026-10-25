import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { closeOnboardingModal, waitForApiCall } from "./helpers";

const dateNow = Date.now();
const randomEvaluator = `evaluator${dateNow}@example.com`;

// Fill a field using its accessible label inside the member form.

const fillMemberField = async (
  page: Page,
  label: string | RegExp,
  value: string
) => {
  const fields = page.getByTestId("member-fields");

  // RegExp.toString() includes /.../flags, so use its source for matching.
  const fieldName = label instanceof RegExp ? label.source : label;
  let field;

  if (/Email|Correo electrónico/i.test(fieldName)) {
    field = fields.locator('input[type="email"]');
  } else if (/First Name|Nombre/i.test(fieldName)) {
    field = fields.locator(
      'input[placeholder="Ada"], input[placeholder="Jane"]'
    );
  } else if (/Last Name|Apellido/i.test(fieldName)) {
    field = fields.locator(
      'input[placeholder="Lovelace"], input[placeholder="Doe"]'
    );
  } else {
    field = fields.getByLabel(label);
  }

  await expect(field).toHaveCount(1);
  await field.fill(value);
};

// Open Settings > Users.
const openUsersSettings = async (page: Page) => {
  await page
    .getByRole("navigation", { name: /^(Main|Principal)$/i })
    .locator('[data-slot="sidebar-header"] button')
    .click();

  await page
    .getByRole("menuitem", { name: /^(Settings|Ajustes)$/i })
    .click();

  await page
    .getByRole("tab", { name: /^(Users|Usuarios)$/i })
    .click();
};

// Find the Users tab panel, regardless of the interface language.
const usersPanel = (page: Page) =>
  page.getByRole("tabpanel", { name: /^(Users|Usuarios)$/i });

// Open the member creation form from the Users panel.
const clickNewMember = async (page: Page) => {
  await usersPanel(page)
    .getByRole("button", { name: /^(New|Nuevo|Nueva)$/i })
    .click();
};

// Wait for the member form to close after saving.
const expectMemberFormClosed = async (page: Page) => {
  await expect(page.getByTestId("member-save")).toHaveCount(0);
};

test.describe("Batch Creation", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log("[BROWSER CONSOLE]", msg.type(), msg.text());
    });

    page.on("pageerror", (error) => {
      console.log("[BROWSER ERROR]", error.stack || error.message);
    });
  });

  test("creates an evaluator via Users settings", async ({ page }) => {
    await page.goto("/lms/batches");
    await closeOnboardingModal(page);

    await openUsersSettings(page);
    await clickNewMember(page);

    await fillMemberField(
      page,
      /^(Email|Correo electrónico)$/i,
      randomEvaluator
    );

    await fillMemberField(
      page,
      /^(First Name|Nombre)$/i,
      "Evaluator"
    );
	    // Activar el rol Evaluator.
   
    
    // Activar el rol Evaluator (la interfaz puede estar en español).
    const evaluatorRole = page
      .getByTestId("member-fields")
      .getByRole("switch", { name: /^(Evaluator|Evaluador)$/i });

    await expect(evaluatorRole).toBeVisible();
    await evaluatorRole.click();
    await expect(evaluatorRole).toHaveAttribute("aria-checked", "true");



    // Save the user and wait for both API requests.
   
    // Registrar las esperas antes de pulsar Guardar.
    const userInsert = waitForApiCall(
      page,
      "/api/method/frappe.client.insert"
    ).then(
      (response) => ({ ok: true as const, response }),
      (error) => ({ ok: false as const, error })
    );

    const saveRole = waitForApiCall(
      page,
      "/api/method/lms.lms.api.save_role"
    ).then(
      (response) => ({ ok: true as const, response }),
      (error) => ({ ok: false as const, error })
    );

    await page.getByTestId("member-save").click();

    const insertResult = await userInsert;
    const roleResult = await saveRole;

    console.log(
      "[API DEBUG] frappe.client.insert:",
      insertResult.ok
        ? `HTTP ${insertResult.response.status()}`
        : insertResult.error.message
    );

    console.log(
      "[API DEBUG] save_role:",
      roleResult.ok
        ? `HTTP ${roleResult.response.status()}`
        : roleResult.error.message
    );

    if (insertResult.ok) {
      console.log("[API BODY] frappe.client.insert:", await insertResult.response.text());
    }
    if (roleResult.ok) {
      console.log("[API BODY] save_role:", await roleResult.response.text());
    }

    expect(insertResult.ok, "No se detectó la petición de inserción del usuario").toBeTruthy();
    expect(roleResult.ok, "No se detectó la petición de asignación del rol").toBeTruthy();

    expect(insertResult.response.ok()).toBeTruthy();
    expect(roleResult.response.ok()).toBeTruthy();


await expectMemberFormClosed(page);

    // Filter the Users list by the Evaluator role.
    const roleFilter = usersPanel(page).locator(
      "button[role='combobox']"
    );

    await expect(roleFilter).toHaveCount(1);
    await roleFilter.click();

    await page
      .getByRole("listbox")
      .getByText(/^(Evaluator|Evaluador)$/i)
      .click();

    await expect(
      usersPanel(page).getByText(randomEvaluator, { exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test("creates and verifies a new batch", async ({ page }) => {
    // Generate a unique student email for this test run.
    const randomStudent = `testuser_${Date.now()}@example.com`;

    await page.goto("/lms/batches");
    await closeOnboardingModal(page);

    // Create the student first so the enrolment form can find the user.
    await openUsersSettings(page);
    await clickNewMember(page);

    await fillMemberField(
      page,
      /^(Email|Correo electrónico)$/i,
      randomStudent
    );

    await fillMemberField(
      page,
      /^(First Name|Nombre)$/i,
      "Student"
    );

    const studentInsert = waitForApiCall(
      page,
      "/api/method/frappe.client.insert"
    );

    await page.getByTestId("member-save").click();

    await studentInsert;
    await expectMemberFormClosed(page);

    // Return to the batch list.
    await page.goto("/lms/batches");
    await closeOnboardingModal(page);

    // Open the new batch form.
    await page
      .getByRole("button", { name: /^(Create|Crear)$/i })
      .click();

    await page
      .getByRole("menuitem", {
        name: /^(New Batch|Nuevo lote)$/i,
      })
      .click();

    // Localizar los campos por su nombre accesible.
const batchDialog = page.getByRole("dialog");
await batchDialog
  .getByRole("combobox", { name: /Fecha de inicio/i })
  .fill("2030-10-01");

await batchDialog
  .getByRole("combobox", { name: /Fecha Final|Fecha de finalización|Fecha de fin/i })
  .fill("2030-10-31");

await batchDialog
  .getByRole("combobox", { name: /Hora de inicio/i })
  .fill("10:00");

await batchDialog
  .getByRole("combobox", { name: /Hora de finalización|Hora de fin/i })
  .fill("11:00");

    // Select the timezone.
   const tzInput = batchDialog.getByRole("combobox", {
  name: /Zona horaria|Timezone/i,
});
    await tzInput.click();
    await tzInput.fill("Asia/Kol");

    const tzListId = await tzInput.getAttribute("aria-controls");

    if (!tzListId) {
      throw new Error(
        "El campo de zona horaria no tiene aria-controls."
      );
    }

    const tzList = page.locator(`[id="${tzListId}"]`);

    await expect(tzList).toBeVisible();

    await tzList
      .locator("[data-slot='item']")
      .first()
      .click();

    await field(/^(Seat Count|Número de plazas|Cupos)$/i)
      .locator("input")
      .fill("10");

    await field(/^Description|^Descripción/i)
      .locator("textarea")
      .fill("Test Batch Short Description to test the UI");

    // Enter the long description in the rich-text editor.
    const descriptionEditor = page.locator("div.ProseMirror");

    await expect(descriptionEditor).toBeVisible();
    await descriptionEditor.click();

    await descriptionEditor.pressSequentially(
      "Test Batch Description. I need a very big description to test the UI. This is a very big description."
    );

    // Select the evaluator as the batch instructor.
    const instructorField = field(/^(Instructors|Instructores)$/i);

    await instructorField
      .locator("button:visible")
      .first()
      .click();

    const instructorInput = page.locator(
      '[data-slot="content-body"] [data-slot="input"]'
    );

    await instructorInput.fill(randomEvaluator);

    const instructorOption = page.locator(
      '[data-slot="content-body"] [role="option"]'
    );

    await expect(instructorOption).toHaveCount(1, {
      timeout: 10000,
    });

    await instructorOption.first().click();
    await page.keyboard.press("Escape");

    // Save the batch.
    await page
      .getByRole("button", { name: /^(Save|Guardar)$/i })
      .click();

    // Verify navigation to the batch settings page.
    await expect(page).toHaveURL(/#settings/, {
      timeout: 10000,
    });

    await closeOnboardingModal(page);

    // Publish the batch.
    await page
      .getByRole("button", { name: /^(Publish|Publicar)$/i })
      .click();

    await expect(
      page.getByText(/Batch published|Lote publicado/i)
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole("button", {
        name: /^(Unpublish|Despublicar)$/i,
      })
    ).toBeVisible();

    // Capture the batch identifier from the URL.
    const batchName = page.url().split("/").pop()!.split("#")[0];

    // Return to the list and find the published batch.
    await page.goto("/lms/batches");
    await closeOnboardingModal(page);

    await expect(page).toHaveURL(/\/lms\/batches/);

    await page
      .getByRole("radio", {
        name: /^(Upcoming|Próximamente)$/i,
      })
      .click();

    const batchLink = page.locator(
      `a[href='/lms/batches/${batchName}']`
    );

    const batchCard = page.locator("div.isolate", {
      has: batchLink,
    });

    await expect(batchLink).toBeVisible({ timeout: 10000 });
    await expect(batchLink).toHaveText("Test Batch");

    await expect(
      batchCard.getByText(
        "Test Batch Short Description to test the UI"
      )
    ).toBeVisible();

    await expect(
      batchCard.getByText("01 Oct 2030 - 31 Oct 2030")
    ).toBeVisible();

    await expect(
      batchCard.getByText("10:00 AM - 11:00 AM")
    ).toBeVisible();

    await expect(
      batchCard.getByText("Asia/Kolkata")
    ).toBeVisible();

    await expect(
      batchCard.getByText("Evaluator")
    ).toBeVisible();

    await expect(
      batchCard.getByText("10 Seats Left")
    ).toBeVisible();

    await batchLink.click();

    // Verify the batch detail page.
    await expect(
      page.getByText("Test Batch").first()
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByText(
        "Test Batch Short Description to test the UI"
      )
    ).toBeVisible();

    await expect(
      page.getByText("Evaluator")
    ).toBeVisible();

    // Use the visible batch overlay to avoid the hidden responsive copy.
    const overlay = page
      .locator(".border-2.rounded-5.lg\\:w-72:visible")
      .first();

    await expect(
      overlay.getByText("01 Oct 2030 - 31 Oct 2030")
    ).toBeVisible();

    await expect(
      overlay.getByText("10:00 AM - 11:00 AM")
    ).toBeVisible();

    await expect(
      overlay.getByText("Asia/Kolkata")
    ).toBeVisible();

    await expect(
      overlay.getByText("10 Seats Left")
    ).toBeVisible();

    await expect(
      page.getByText(
        "Test Batch Description. I need a very big description to test the UI."
      )
    ).toBeVisible();

    // Open the Dashboard tab or button.
    await page
      .getByRole("button")
      .or(page.getByRole("tab"))
      .filter({ hasText: /^Dashboard$/ })
      .click();

    await closeOnboardingModal(page);

    // Open the enrolment form.
    await page
      .getByRole("button", { name: /^(Enroll|Inscribir)$/i })
      .click();

    const enrollDialog = page
      .locator('div[role="dialog"]')
      .first();

    const studentField = enrollDialog
      .locator("label")
      .filter({ hasText: /^Student$/ })
      .locator("xpath=..")
      .locator("input");

    await expect(studentField).toHaveCount(1);
    await studentField.fill(randomStudent);

    // The student search should return a matching selectable item.
    const studentOption = page.locator("[data-slot='item']");

    await expect(studentOption.first()).toBeVisible({
      timeout: 30000,
    });

    await studentOption.first().click();

    // Save the enrolment.
    await page.getByTestId("batch-student-save").click();

    // Return to Overview and verify the remaining seats.
    await page
      .getByRole("button")
      .or(page.getByRole("tab"))
      .filter({ hasText: /^Overview$/ })
      .click();

    const overlayAfterEnroll = page
      .locator(".border-2.rounded-5.lg\\:w-72:visible")
      .first();

    await expect(
      overlayAfterEnroll.getByText("9 Seats Left")
    ).toBeVisible({ timeout: 10000 });
  });
});
