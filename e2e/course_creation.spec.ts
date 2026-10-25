import { test, expect } from "./fixtures";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeOnboardingModal, button, waitForApiCall } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Unique per run: generate_slug() appends a number if a title already exists.
// A fresh title avoids collisions with courses left by previous failed runs.
const courseTitle = `Test Course ${Date.now()}`;
let courseSlug: string;

const description =
	"Test Course Description. I need a very big description to test the UI. This is a very big description. It contains more than once sentence. Its meant to be this long as this is a UI test. Its unbearably long and I'm not sure why I'm typing this much. I'm just going to keep typing until I feel like its long enough. I think its long enough now. I'm going to stop typing now.";

// The settings navigation can be a button or a tab depending on the layout.
const settingsTab = (page: import("@playwright/test").Page) =>
	page
		.getByRole("button")
		.or(page.getByRole("tab"))
		.filter({ hasText: /Settings|Configuración/i });

test.describe.serial("Course Creation", () => {
	test("creates a new course with settings", async ({ page }) => {
		await page.goto("/lms/courses");
		await closeOnboardingModal(page);

		// Open the new-course form (English and Spanish UI).
		await button(page, /^(Create|Crear)$/i).click();

		await page
			.getByRole("menuitem", { name: /^(New Course|Nuevo curso)$/i })
			.click();

		// Scope the form interactions to the new-course form.
		const fields = page.getByTestId("new-course-fields");

		await fields
			.getByRole("textbox", {
				name: /^(Title|Título)( \(required\))?$/i,
			})
			.fill(courseTitle);

		// Select an instructor.
		const instructorLabel = fields
			.locator("label")
			.filter({ hasText: /Instructor|Instructores|Docente/i })
			.first();

		await expect(instructorLabel).toBeVisible({ timeout: 10000 });

		await instructorLabel
			.locator("xpath=..")
			.locator("button:visible")
			.first()
			.click({ timeout: 10000 });

		await page
			.locator('[data-slot="content-body"] [data-slot="input"]')
			.fill("frappe");

		await page
			.locator('[data-slot="content-body"] [role="option"]')
			.first()
			.click({ timeout: 30000 });

		await page.keyboard.press("Escape");

		// Thumbnail.
		await fields
			.locator('input[type="file"]')
			.setInputFiles(path.join(__dirname, "fixtures/profile.png"));

		// Short introduction.
		await fields
			.locator("label")
			.filter({
				hasText:
					/Short introduction|Introducción corta|Introducción breve/i,
			})
			.locator("xpath=..")
			.locator("textarea")
			.fill("Test Course Short Introduction to test the UI");

		// Description.
		await fields.locator("div.ProseMirror").evaluate((el, text) => {
			el.textContent = text;
		}, description);

		// Save is outside the fields container.
		await page.getByTestId("new-course-save").click();

		// Wait for the redirect to the newly created course.
		await page.waitForURL(/\/lms\/courses\/(?!new(?:$|[/#]))[^/]+$/, {
			timeout: 10000,
		});

		courseSlug = new URL(page.url()).pathname.split("/").pop() as string;

		await closeOnboardingModal(page);

		// Configure course settings.
		await settingsTab(page).click();

		// Preview video: locate the field by its translated label, then select
		// the visible text/URL input rather than relying on a placeholder.
		const previewVideoField = page
			.locator("label")
			.filter({
				hasText:
					/Preview video|Video de vista previa|Vídeo de vista previa/i,
			})
			.first()
			.locator("xpath=..");

		// Preview video: use the actual accessible name found in error-context.md.
const previewVideoInput = page.getByRole("textbox", {
	name: "YouTube link",
});

await expect(previewVideoInput).toBeVisible({ timeout: 10000 });

await previewVideoInput.fill(
	"https://www.youtube.com/embed/-LPmw2Znl2c",
);

		// Tags.
		await page
			.locator("label")
			.filter({ hasText: /Tags|Etiquetas/i })
			.locator("xpath=..")
			.locator("button")
			.first()
			.click();

		const tagInput = page.locator(
			'[data-slot="content-body"] [data-slot="input"]',
		);

		for (const tag of ["Learning", "Frappe", "ERPNext"]) {
			await tagInput.fill(tag);
			await tagInput.press("Enter");
		}

		await page.keyboard.press("Escape");

		await button(page, /^(Save|Guardar)$/i).click();

		// Publish the course.
		await page
			.locator("header")
			.getByRole("button", { name: /^(Publish|Publicar)$/i })
			.click();

		await expect(
			page.getByText(/Course published|Curso publicado/i),
		).toBeVisible({ timeout: 20000 });

		// Reload and verify the published state.
		await page.reload();
		await closeOnboardingModal(page);

		await expect(
			page
				.locator("header")
				.getByText(/^(Published|Publicado)$/i),
		).toBeVisible({ timeout: 10000 });

		await expect(
			page.locator("header").getByRole("button", {
				name: /^(Unpublish|Despublicar|Anular publicación)$/i,
			}),
		).toBeVisible();
	});

	test("adds a chapter and a lesson", async ({ page }) => {
		const outlineResponse = waitForApiCall(
			page,
			"/api/method/lms.lms.utils.get_course_outline",
			20000,
		);

		await page.goto(`/lms/courses/${courseSlug}`);
		await closeOnboardingModal(page);

		await page
			.getByRole("button")
			.or(page.getByRole("tab"))
			.filter({
				hasText: /^(Course editor|Editor del curso|Editor)$/i,
			})
			.click();

		await closeOnboardingModal(page);
		await outlineResponse;

		// Add a chapter.
		await page
			.getByRole("button", { name: /^(Add|Añadir|Agregar)$/i })
			.click();

		const chapterDialog = page
			.locator("[data-dismissable-layer]")
			.filter({
				has: page.locator("label", {
					hasText: /Title|Título/i,
				}),
			});

		await expect(chapterDialog).toBeVisible();

		await chapterDialog
			.locator("label")
			.filter({ hasText: /Title|Título/i })
			.locator("xpath=..")
			.locator("input")
			.fill("Test Chapter");

		await chapterDialog.getByTestId("chapter-save").click();

		await expect(page.getByText("Test Chapter")).toBeVisible({
			timeout: 15000,
		});

		// Dismiss onboarding before adding a lesson.
		await closeOnboardingModal(page);

		await button(
			page,
			/^(Add Lesson|Añadir lección|Agregar lección)$/i,
		).click({ timeout: 10000 });

		const titleField = page.locator("textarea.lesson-title");

		await expect(
			page.getByTestId("outline-draft-lesson"),
		).toBeVisible({ timeout: 15000 });

		await expect(titleField).toHaveValue("");

		const createResponse = waitForApiCall(
			page,
			"/api/method/lms.lms.api.create_lesson",
			15000,
		);

		await titleField.fill("Test Lesson");
		await createResponse;

		await expect(
			page
				.getByTestId("outline-lesson")
				.filter({ hasText: "Test Lesson" }),
		).toBeVisible({ timeout: 15000 });

		// Add a temporary lesson and delete it to verify editor cleanup.
		await button(
			page,
			/^(Add Lesson|Añadir lección|Agregar lección)$/i,
		).click({ timeout: 10000 });

		await expect(titleField).toHaveValue("");

		const throwawayResponse = waitForApiCall(
			page,
			"/api/method/lms.lms.api.create_lesson",
			15000,
		);

		await titleField.fill("Throwaway lesson");
		await titleField.blur();
		await throwawayResponse;

		await expect(
			page
				.getByTestId("outline-lesson")
				.filter({ hasText: "Throwaway lesson" }),
		).toBeVisible({ timeout: 15000 });

		await page
			.getByTestId("outline-lesson")
			.last()
			.locator(".lucide-trash-2")
			.click({ force: true });

		await expect(
			page.getByText(
				/Delete this lesson\?|¿Eliminar esta lección\?/i,
			),
		).toBeVisible();

		await page
			.locator("[data-dismissable-layer]")
			.getByRole("button", {
				name: /^(Delete|Eliminar|Borrar)$/i,
			})
			.click();

		await expect(
			page.getByText(
				/Lesson deleted successfully|Lección eliminada correctamente/i,
			),
		).toBeVisible();

		await expect(
  page.getByText(
    /Select a lesson on the right to start editing\.|Selecciona una lección a la derecha para comenzar a editar\./i,
  ),
).toBeVisible();

		await expect(
			page.getByTestId("outline-lesson"),
		).toHaveCount(1);

		await expect(
			page
				.getByTestId("outline-lesson")
				.filter({ hasText: "Test Lesson" }),
		).toBeVisible();
	});

	test("verifies the course overview", async ({ page }) => {
		await page.goto(`/lms/courses/${courseSlug}`);
		await closeOnboardingModal(page);

		await expect(page).toHaveURL(
			new RegExp(`/lms/courses/${courseSlug}`),
			{ timeout: 10000 },
		);

		await expect(page.getByText(courseTitle).first()).toBeVisible();

		await expect(
			page.getByText("Test Course Short Introduction to test the UI"),
		).toBeVisible();

		// Scope the tag lookup to the overview to avoid matching the sidebar.
		await expect(
			page.getByLabel(/Overview|Resumen/i).getByText("Learning"),
		).toBeVisible();

		await expect(page.locator("iframe").first()).toHaveAttribute(
			"src",
			"https://www.youtube.com/embed/-LPmw2Znl2c",
		);

		await expect(page.getByText("Test Chapter")).toBeVisible({
			timeout: 15000,
		});
	});

	test("deletes the course", async ({ page }) => {
		await page.goto(`/lms/courses/${courseSlug}`);
		await closeOnboardingModal(page);

		await settingsTab(page).click();

		await page
			.locator("header")
			.locator('button[aria-haspopup="menu"]')
			.first()
			.click({ force: true, timeout: 10000 });

		await page
			.locator("div[role=menu]")
			.getByRole("menuitem", {
				name: /^(Delete|Eliminar|Borrar)$/i,
			})
			.click();

		await page
			.locator("span")
			.filter({ hasText: /^(Delete|Eliminar|Borrar)$/i })
			.first()
			.click();

		await expect(page).toHaveURL(/\/lms\/courses(\/|\?|$)/, {
			timeout: 10000,
		});

		await expect(page.getByText(courseTitle)).toHaveCount(0);
	});
});