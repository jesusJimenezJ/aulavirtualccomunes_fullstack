

import { test, expect } from "./fixtures";
import { closeOnboardingModal } from "./helpers";
import { authFile, baseURL } from "./config";
import type { Browser, Page } from "@playwright/test";

let quizName: string | undefined;

const runToken = Date.now();
const quizTitle = `Cypress Test Quiz ${runToken}`;
const questionText = `What is 2 + 2? (${runToken})`;

async function withPage(
	browser: Browser,
	fn: (page: Page) => Promise<void>
): Promise<void> {
	const context = await browser.newContext({
		storageState: authFile,
		baseURL,
	});

	try {
		const page = await context.newPage();
		await fn(page);
	} finally {
		await context.close();
	}
}

function labeledField(page: Page, label: string | RegExp) {
	const names: Record<string, RegExp> = {
		Title: /^(Title|Título)( \(required\))?$/i,
		"Passing Percentage":
			/^(Passing Percentage|Porcentaje de aprobación)( \(required\))?$/i,
	};

	const name =
		typeof label === "string"
			? names[label] ?? new RegExp(label, "i")
			: label;

	return page.getByRole("textbox", { name });
}

const quizButtonNames = {
	delete: /^(Delete|Eliminar|Borrar)$/i,
	saveQuestion: /^(Save question|Guardar pregunta)$/i,
	newQuestion: /^(New question|Nueva pregunta)$/i,
	start: /^(Start Quiz|Comenzar cuestionario|Iniciar cuestionario|Empezar cuestionario)$/i,
	check: /check|comprobar|verificar|revisar respuesta/i,
	submit:
		/submit|enviar|finish|complete|terminar|finalizar/i,
};

test.describe("Quiz", () => {
	test.beforeAll(async ({ browser }, testInfo) => {
		testInfo.setTimeout(90000);

		await withPage(browser, async (page) => {
			console.log("[QUIZ DEBUG] Abriendo formulario de creación");

			await page.goto("/lms/quizzes/new");
			await closeOnboardingModal(page);

			const title = labeledField(page, "Title");
			await expect(title).toBeVisible({ timeout: 15000 });
			await title.fill(quizTitle);
			await title.blur();

			console.log("[QUIZ DEBUG] Título ingresado:", quizTitle);

			await page.waitForURL(/\/lms\/quizzes\/edit\//, {
				timeout: 20000,
			});

			const urlParts = page.url().split("/");
			quizName = urlParts[urlParts.length - 1]?.split(/[?#]/)[0];

			if (!quizName) {
				throw new Error(
					"No se pudo obtener el identificador del cuestionario."
				);
			}

			console.log("[QUIZ DEBUG] Cuestionario creado:", quizName);

			const passingPercentage = labeledField(
				page,
				"Passing Percentage"
			);

			await expect(passingPercentage).toBeVisible({
				timeout: 15000,
			});
			await passingPercentage.fill("60");

			const toolbar = page.getByTestId("question-toolbar");

			await toolbar
				.getByRole("button", {
					name: quizButtonNames.newQuestion,
				})
				.click();

			const draft = page.getByTestId("draft-card");
			await expect(draft).toBeVisible({ timeout: 15000 });

			console.log("[QUIZ DEBUG] Editor de pregunta abierto");

			const questionEditor = draft.locator("div.ProseMirror");
			await expect(questionEditor).toBeVisible();
			await questionEditor.click();
			await questionEditor.pressSequentially(questionText);

			const option1 = draft.getByRole("textbox", {
				name: /^(Option 1|Opción 1)$/i,
				exact: true,
			});

			const option2 = draft.getByRole("textbox", {
				name: /^(Option 2|Opción 2)$/i,
				exact: true,
			});

			await expect(option1).toBeVisible({ timeout: 10000 });
			await option1.fill("3");

			await expect(option2).toBeVisible({ timeout: 10000 });
			await option2.fill("4");

			const correctAnswer = draft.getByRole("radio", {
				name: /Option 2.*(correct answer|respuesta correcta)|Opción 2.*respuesta correcta/i,
			});

			await expect(correctAnswer).toBeVisible({
				timeout: 10000,
			});
			await correctAnswer.click();

			console.log("[QUIZ DEBUG] Pregunta y opciones completadas");

			await page
				.getByRole("button", {
					name: quizButtonNames.saveQuestion,
				})
				.click();

			await draft.waitFor({
				state: "detached",
				timeout: 20000,
			});

			console.log("[QUIZ DEBUG] Pregunta guardada");

			await page.keyboard.press("Control+s");

			const saveToast = page.getByText(
				/Quiz updated successfully|Cuestionario actualizado correctamente|Cuestionario actualizado/i
			);

			try {
				await saveToast.waitFor({
					state: "visible",
					timeout: 10000,
				});
				console.log("[QUIZ DEBUG] Cuestionario guardado");
			} catch {
				console.log(
					"[QUIZ DEBUG] No se encontró el mensaje de confirmación."
				);
			}
		});
	});

	test.afterAll(async ({ browser }, testInfo) => {
		testInfo.setTimeout(90000);

		if (!quizName) {
			console.log(
				"[QUIZ CLEANUP] Limpieza omitida: no se creó el cuestionario."
			);
			return;
		}

		await withPage(browser, async (page) => {
			const deleteButton = () =>
				page.getByRole("button", {
					name: quizButtonNames.delete,
				});

			// Eliminar envíos asociados antes de borrar el cuestionario.
			await page.goto(
				`/lms/quizzes/submissions?quiz=${encodeURIComponent(quizName!)}`
			);
			await closeOnboardingModal(page);

			const submissionCheckbox = page
				.locator('input[type="checkbox"]')
				.first();

			if (await submissionCheckbox.isVisible().catch(() => false)) {
				await submissionCheckbox.click();
				await deleteButton().click();

				await expect(submissionCheckbox).toBeHidden({
					timeout: 10000,
				});
			}

			// Eliminar el cuestionario.
			await page.goto(
				`/lms/quizzes/edit/${encodeURIComponent(quizName!)}`
			);
			await closeOnboardingModal(page);

			await deleteButton().click();

			const dialog = page.getByRole("dialog").filter({
				hasText: /Delete this quiz\?|¿Eliminar este cuestionario\?/i,
			});

			await expect(dialog).toBeVisible({ timeout: 10000 });

			await dialog
				.getByRole("button", {
					name: quizButtonNames.delete,
				})
				.click();

			await page.waitForURL(/\/lms\/quizzes\/?$/);

			console.log("[QUIZ CLEANUP] Cuestionario eliminado");

			// Eliminar la pregunta del banco.
			await page.goto("/lms/quizzes/questions");
			await closeOnboardingModal(page);

			const search = page.getByRole("textbox", {
				name: /^(Search|Buscar)$/i,
			});

			await search.fill(questionText);

			const questionResult = page.getByText(questionText, {
				exact: true,
			});

			if (await questionResult.isVisible().catch(() => false)) {
				await page.locator('input[type="checkbox"]').first().click();
				await deleteButton().click();

				await expect(questionResult).toHaveCount(0, {
					timeout: 10000,
				});
			}

			console.log("[QUIZ CLEANUP] Limpieza finalizada");
		});
	});

	test.describe("multiple choice quiz", () => {
		test("shows quiz info on the start screen", async ({ page }) => {
			test.skip(!quizName, "No se pudo crear el cuestionario.");

			await page.goto(`/lms/quiz/${quizName}`);
			await closeOnboardingModal(page);

			await expect(page.getByText(quizTitle).first()).toBeVisible({
				timeout: 15000,
			});

			const stat = (labels: RegExp) =>
				page
					.locator("dl > div")
					.filter({
						has: page.getByText(labels),
					})
					.locator("dd");

			await expect(
				stat(/^(Questions|Preguntas)$/i)
			).toHaveText("1");

			await expect(
				stat(
					/^(Pass mark|Passing score|Nota mínima|Porcentaje de aprobación)$/i
				)
			).toHaveText("60%");
		});

		test("starts the quiz and shows the question with answer choices", async ({
			page,
		}) => {
			test.skip(!quizName, "No se pudo crear el cuestionario.");

			await page.goto(`/lms/quiz/${quizName}`);
			await closeOnboardingModal(page);

			const start = page.getByRole("button", {
				name: quizButtonNames.start,
			});

			await expect(start).toBeEnabled({ timeout: 15000 });
			await start.click();

			await expect(
				page.getByText(questionText, { exact: true })
			).toBeVisible({ timeout: 15000 });

			await expect(page.getByRole("radio").first()).toBeVisible({
				timeout: 10000,
			});
		});

		test("submits the quiz and shows the result", async ({ page }) => {
			test.skip(!quizName, "No se pudo crear el cuestionario.");

			await page.goto(`/lms/quiz/${quizName}`);
			await closeOnboardingModal(page);

			const start = page.getByRole("button", {
				name: quizButtonNames.start,
			});

			await expect(start).toBeVisible({ timeout: 15000 });
			await start.click();

			await expect(
				page.getByText(questionText, { exact: true })
			).toBeVisible({ timeout: 15000 });

			// Elegir la segunda opción (4), que es la respuesta correcta
			// creada en beforeAll. Si solo hay una opción, usarla.
			const answers = page.getByRole("radio");
			await expect(answers.first()).toBeVisible({ timeout: 10000 });
			const answerCount = await answers.count();
			await answers.nth(answerCount > 1 ? 1 : 0).click();

			console.log("[QUIZ DEBUG] Respuesta seleccionada");


console.log("[QUIZ DEBUG] Estado del cuestionario:", {
    url: page.url(),
    radios: await page.getByRole("radio").count(),
    botones: await page.locator("button:visible").allTextContents(),
    texto: (await page.locator("body").innerText()).slice(0, 2500),
});


			// Algunas versiones comprueban la respuesta antes de permitir enviar.
			const checkButton = page.getByRole("button", {
				name: quizButtonNames.check,
			}).first();

			if (await checkButton.isVisible().catch(() => false)) {
				await checkButton.click();
				console.log("[QUIZ DEBUG] Respuesta comprobada");
			}

			// Buscar el botón de envío con variantes habituales en inglés/español.
			const submitButton = page.getByRole("button", {
				name: quizButtonNames.submit,
			}).first();

			if (!(await submitButton.isVisible().catch(() => false))) {
				console.log(
					"[QUIZ DEBUG] Botones visibles:",
					JSON.stringify(
						(await page.locator("button:visible").allTextContents())
							.map((value) => value.trim())
							.filter(Boolean)
					)
				);
				console.log(
					"[QUIZ DEBUG] Texto visible de la página:",
					(await page.locator("body").innerText()).slice(0, 5000)
				);
				throw new Error(
					"No se encontró el botón de envío. Revisa los controles y el texto visible registrados arriba."
				);
			}

			await submitButton.click();

			// Esperar el resultado visible, sin asumir una ruta API específica.
			await expect(
				page.getByText(
					/score|correct|result|puntuación|resultado|puntaje|passed|aprobado/i
				).first()
			).toBeVisible({ timeout: 20000 });

			console.log("[QUIZ DEBUG] Resultado del cuestionario visible");
		});
	});
});
