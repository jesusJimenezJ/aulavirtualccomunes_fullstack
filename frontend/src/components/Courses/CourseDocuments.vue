<template>
	<section class="course-documents">
		<div class="course-documents__heading">
			<div>
				<p class="course-documents__eyebrow">{{ __('Material académico') }}</p>
				<h2>{{ __('Sílabo y cronograma') }}</h2>
				<p class="course-documents__description">
					{{ __('Consulta o descarga los documentos PDF de este curso.') }}
				</p>
				<p v-if="canManage" class="course-documents__visibility-note">
					{{
						__(
							'Los PDF se publican para que puedan consultarse desde el catálogo del curso.'
						)
					}}
				</p>
			</div>
			<span class="lucide-files size-5 text-ink-gray-6" aria-hidden="true" />
		</div>

		<div class="course-documents__grid">
			<article
				v-for="kind in documentKinds"
				:key="kind.field"
				class="course-documents__card"
			>
				<div class="course-documents__card-heading">
					<span class="course-documents__icon" aria-hidden="true">
						<span :class="kind.icon" class="size-5" />
					</span>
					<div>
						<h3>{{ kind.label }}</h3>
						<p>{{ __('Documento PDF') }}</p>
					</div>
				</div>

				<div
					v-if="documentsFor(kind.field).length"
					class="course-documents__files"
				>
					<a
						v-for="file in documentsFor(kind.field)"
						:key="file.name"
						:href="file.file_url"
						target="_blank"
						rel="noopener noreferrer"
						class="course-documents__file"
					>
						<span class="lucide-file-text size-4 shrink-0" aria-hidden="true" />
						<span class="min-w-0 flex-1 truncate">{{ file.file_name }}</span>
						<span
							class="lucide-arrow-down-to-line size-4 shrink-0"
							aria-hidden="true"
						/>
					</a>
				</div>
				<p v-else class="course-documents__empty">
					{{ __('Aún no se ha agregado este documento.') }}
				</p>

				<FileUploader
					v-if="canManage"
					:fileTypes="['.pdf']"
					:private="false"
					doctype="LMS Course"
					:docname="courseName"
					:fieldname="kind.field"
					@success="(file) => onUploaded(file.file_name)"
					@failure="onUploadFailure"
				>
					<template #default="{ openFileSelector, uploading }">
						<Button
							class="course-documents__upload"
							:loading="uploading"
							@click="openFileSelector"
						>
							<span class="lucide-upload size-4" aria-hidden="true" />
							{{ uploading ? __('Subiendo…') : __('Agregar PDF') }}
						</Button>
					</template>
				</FileUploader>
			</article>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	Button,
	FileUploader,
	UploadError,
	createResource,
	toast,
} from 'frappe-ui'
import { computed, watch } from 'vue'
import { resourceErrorMessage } from '@/utils/resource'

interface CourseFile {
	name: string
	file_name: string
	file_url: string
	attached_to_field: string
	creation: string
}

const props = defineProps<{
	courseName: string
	canManage?: boolean
}>()

const documentKinds = [
	{
		field: 'syllabus_pdf',
		label: __('Sílabo'),
		icon: 'lucide-book-open-check',
	},
	{
		field: 'schedule_pdf',
		label: __('Cronograma'),
		icon: 'lucide-calendar-days',
	},
]

const files = createResource({
	url: 'frappe.client.get_list',
	auto: false,
	onError(error) {
		toast.error(
			resourceErrorMessage(
				error,
				__('No se pudieron cargar los documentos del curso')
			)
		)
	},
	makeParams() {
		return {
			doctype: 'File',
			fields: [
				'name',
				'file_name',
				'file_url',
				'attached_to_field',
				'creation',
			],
			filters: {
				attached_to_doctype: 'LMS Course',
				attached_to_name: props.courseName,
				attached_to_field: ['in', documentKinds.map((kind) => kind.field)],
				is_private: 0,
			},
			order_by: 'creation desc',
			limit_page_length: 100,
		}
	},
})

const documents = computed<CourseFile[]>(
	() => (files.data || []) as CourseFile[]
)

watch(
	() => props.courseName,
	(courseName) => {
		if (courseName) files.reload()
	},
	{ immediate: true }
)

function documentsFor(field: string): CourseFile[] {
	return documents.value.filter((file) => file.attached_to_field === field)
}

function onUploaded(fileName: string) {
	toast.success(`${fileName} ${__('se agregó al curso')}`)
	files.reload()
}

function onUploadFailure(error: unknown) {
	const message =
		error instanceof UploadError ? error.message : __('No se pudo subir el PDF')
	toast.error(resourceErrorMessage(error, message))
}
</script>

<style scoped>
.course-documents {
	padding: clamp(1rem, 2.5vw, 1.5rem);
	border: 1px solid #e2eae4;
	border-radius: 1.1rem;
	background: #fff;
	box-shadow: 0 8px 24px rgba(24, 49, 46, 0.04);
}

.course-documents__heading,
.course-documents__card-heading {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
}

.course-documents__eyebrow {
	margin: 0 0 0.3rem;
	color: #176b60;
	font-size: 0.7rem;
	font-weight: 750;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.course-documents__heading h2 {
	margin: 0;
	color: #18312e;
	font-size: 1.25rem;
	font-weight: 750;
}

.course-documents__description,
.course-documents__card-heading p {
	margin: 0.25rem 0 0;
	color: #68766f;
	font-size: 0.85rem;
}

.course-documents__visibility-note {
	margin: 0.4rem 0 0;
	color: #8a5a31;
	font-size: 0.78rem;
}

.course-documents__grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
	margin-top: 1.25rem;
}

.course-documents__card {
	min-width: 0;
	padding: 1rem;
	border: 1px solid #e6ece7;
	border-radius: 0.85rem;
	background: #fbfcfa;
}

.course-documents__card-heading {
	justify-content: flex-start;
	align-items: center;
}

.course-documents__icon {
	display: grid;
	width: 2.5rem;
	height: 2.5rem;
	place-items: center;
	flex: none;
	border-radius: 0.7rem;
	background: #eaf3ed;
	color: #176b60;
}

.course-documents__card-heading h3 {
	margin: 0;
	color: #18312e;
	font-size: 0.95rem;
	font-weight: 700;
}

.course-documents__files {
	display: grid;
	gap: 0.5rem;
	margin-top: 0.85rem;
}

.course-documents__file {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	min-width: 0;
	padding: 0.65rem 0.7rem;
	border: 1px solid #e3eae4;
	border-radius: 0.65rem;
	background: #fff;
	color: #176b60;
	font-size: 0.82rem;
	text-decoration: none;
}

.course-documents__file:hover {
	border-color: #b9d5c5;
	background: #f4f8f4;
}

.course-documents__empty {
	margin: 0.9rem 0;
	color: #758179;
	font-size: 0.82rem;
}

.course-documents__upload {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	margin-top: 0.8rem;
}

@media (max-width: 640px) {
	.course-documents__grid {
		grid-template-columns: 1fr;
	}
}
</style>
