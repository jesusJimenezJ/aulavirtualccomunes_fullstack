<template>
	<ListPage
		:breadcrumbs="breadcrumbs"
		:title="__('Catálogo de cursos')"
		:rows="courses.data || []"
		grid-class="course-catalog-grid"
		:loading="courses.list.loading || reloading"
		:total-count="courseCount"
		:has-next-page="courses.hasNextPage"
		v-model:page-length="pageLength"
		empty-name="Courses"
		empty-icon="lucide-book-open"
		@load-more="courses.next()"
	>
		<template #banner>
			<section class="catalog-hero" aria-labelledby="catalog-hero-title">
				<div class="catalog-hero__copy">
					<div class="catalog-hero__eyebrow">
						<span class="catalog-hero__eyebrow-dot" />
						Aula virtual de Psicología Social Comunitaria
					</div>
					<h2 id="catalog-hero-title">Aprendizaje que fortalece comunidades</h2>
					<p>
						Explora cursos, fundamentos y metodologías para comprender y
						trabajar con las comunidades.
					</p>
					<a class="catalog-hero__cta" href="#course-catalog">
						Ver cursos
						<span class="lucide-arrow-down-right size-4" aria-hidden="true" />
					</a>
				</div>
				<div class="catalog-hero__art" aria-hidden="true">
					<div class="catalog-hero__orbit catalog-hero__orbit--one" />
					<div class="catalog-hero__orbit catalog-hero__orbit--two" />
					<div class="catalog-hero__art-card">
						<span class="lucide-users-round size-7" />
						<span>Aprender en comunidad</span>
						<div class="catalog-hero__art-lines">
							<i />
							<i />
							<i />
						</div>
					</div>
					<div class="catalog-hero__art-chip">Psicología · Comunidad</div>
				</div>
			</section>
		</template>

		<template #name>
			<span id="course-catalog">{{ __('Catálogo de cursos') }}</span>
		</template>

		<template #actions>
			<Dropdown
				align="end"
				side="bottom"
				v-if="canCreateCourse()"
				:options="courseMenu"
			>
				<template v-slot="{ open }">
					<Button variant="solid">
						<template #prefix>
							<span class="lucide-plus size-4" />
						</template>
						{{ __('Crear') }}
						<template #suffix>
							<span
								:class="[
									'lucide-chevron-down ms-1 size-4 transform transition-transform',
									open ? 'rotate-180' : '',
								]"
							/>
						</template>
					</Button>
				</template>
			</Dropdown>
		</template>

		<template #filters>
			<TabButtons
				:options="courseTabs"
				v-model="currentTab"
				class="!w-fit shrink-0"
			/>
			<FormControl
				v-model="title"
				:placeholder="__('Buscar cursos')"
				:aria-label="__('Buscar cursos')"
				type="text"
			>
				<template #prefix>
					<span class="lucide-search size-4 text-ink-gray-5" />
				</template>
			</FormControl>
			<ClearableCombobox
				v-if="categories.data?.length"
				v-model="currentCategory"
				:options="categories.data.filter((c) => c.value)"
				:placeholder="__('Categoría')"
				:aria-label="__('Categoría')"
				@update:modelValue="updateCourses()"
			/>

			<Checkbox
    :model-value="certification"
    :label="__('Solo cursos con certificación')"
    @update:model-value="setCertification"
/>

		</template>

		<template #card="{ row }">
			<CourseCard
				:course="row"
				:to="{ name: 'CourseDetail', params: { courseName: row.name } }"
			/>
		</template>
	</ListPage>

	<router-view />
</template>
<script setup>
import {
    Button,
    Checkbox,
    createListResource,
    createResource,
    Dropdown,
    FormControl,
    TabButtons,
    usePageMeta,
} from 'frappe-ui'
import ClearableCombobox from '@/components/Controls/ClearableCombobox.vue'
import ListPage from '@/components/Layouts/pages/ListPage.vue'
import { computed, inject, onMounted, ref, watch } from 'vue'
import { sessionStore } from '@/stores/session'
import { canCreateCourse } from '@/utils'
import CourseCard from '@/components/CourseCard.vue'
import { useRouter } from 'vue-router'
import { openFormRoute } from '@/composables/useFormRoute'

const user = inject('$user')
const dayjs = inject('$dayjs')
const start = ref(0)
const currentCategory = ref(null)
const title = ref('')
const certification = ref(false)

const setCertification = (value) => {
	certification.value = value
	updateCourses()
}
const filters = ref({})
const currentTab = ref('live')
const { brand } = sessionStore()
const router = useRouter()

onMounted(() => {
	setFiltersFromQuery()
	updateCourses()
	// TextInput emits on input and change; watched after query hydration to avoid a refetch.
	watch(title, updateCourses)
})

const setFiltersFromQuery = () => {
	let queries = new URLSearchParams(location.search)
	title.value = queries.get('title') || ''
	currentCategory.value = queries.get('category') || null
	// `|| false` would keep the raw string, so ?certification=false read as on.
	certification.value = queries.get('certification') === 'true'
	const tab = queries.get('tab')
	if (tab) currentTab.value = tab
	// Compatibility shim: ?newCourse=1 was this page's ad-hoc deep link before
	// /courses/new existed. BatchCourseModal.vue:27 still emits it, as may
	// bookmarks and anything outside the SPA, so forward it rather than drop it.
	// replace(), so the query-param URL is not left behind as an entry the user
	// can go Back to and re-open the form from.
	if (queries.get('newCourse') == '1') {
		router.replace({ name: 'NewCourse' })
	}
}

const courses = createListResource({
	doctype: 'LMS Course',
	url: 'lms.lms.utils.get_courses',
	cache: ['courses', user.data?.name],
	pageLength: 24,
	start: start.value,
})

// The tabs filter on `enrolled`, `created` and `live`, which are not fields,
// so `frappe.client.get_count` cannot answer this; only the endpoint that
// resolves them can. Without it the footer can say how many rows it has but
// not how many there are.
const courseCountResource = createResource({
	url: 'lms.lms.utils.get_course_count',
	makeParams: () => ({ filters: filters.value }),
	onError: (error) => {
		console.error(error)
	},
})

const courseCount = computed(() => courseCountResource.data ?? null)

const getCourseCount = () => {
	// Same sequencing hazard as the list: nothing orders the responses, so a
	// slow count for filters the user has left would overwrite the current one.
	courseCountResource.abort()
	courseCountResource.submit()
}

// `list.loading` goes false mid-request: the aborted fetch's tail resolves
// after the new reload() has started and clears the flag for it, so the empty
// state flashes until the reload lands.
const reloading = ref(false)

const reloadCourses = async () => {
	reloading.value = true
	try {
		await courses.reload()
	} finally {
		reloading.value = false
	}
}

const pageLength = computed({
	get: () => courses.pageLength,
	set: (value) => {
		// reload() refetches only the rows already loaded when start > 0, so
		// without rewinding to the first page a bigger page size changes nothing.
		courses.update({ pageLength: value, start: 0 })
		reloadCourses()
	},
})

const categories = createListResource({
	doctype: 'LMS Category',
	url: 'lms.lms.utils.get_course_categories',
	cache: ['course_categories'],
	auto: true,
})

const updateCourses = () => {
	updateFilters()
	// createResource keeps no request sequence: every response assigns
	// `data`, so a slow fetch for filters the user has already left repaints
	// the list with the wrong courses seconds later. Cancel it first: an
	// aborted fetch is swallowed and never reaches the list.
	courses.list.abort()
	courses.update({
		filters: filters.value,
	})
	reloadCourses()
	getCourseCount()
}

const updateFilters = () => {
	updateCategoryFilter()
	updateTitleFilter()
	updateCertificationFilter()
	updateTabFilter()
	updateStudentFilter()
	setQueryParams()
}

const updateCategoryFilter = () => {
	if (currentCategory.value) {
		filters.value['category'] = currentCategory.value
	} else {
		delete filters.value['category']
	}
}

const updateTitleFilter = () => {
	if (title.value) {
		filters.value['title'] = ['like', `%${title.value}%`]
	} else {
		delete filters.value['title']
	}
}

const updateCertificationFilter = () => {
	if (certification.value) {
		filters.value['certification'] = 1
	} else {
		delete filters.value['certification']
	}
}

const updateTabFilter = () => {
	delete filters.value['live']
	delete filters.value['created']
	delete filters.value['published_on']
	delete filters.value['upcoming']

	if (currentTab.value == 'enrolled' && user.data?.is_student) {
		filters.value['enrolled'] = 1
		delete filters.value['published']
	} else {
		delete filters.value['published']
		delete filters.value['enrolled']

		if (currentTab.value == 'live') {
			filters.value['published'] = 1
			filters.value['upcoming'] = 0
			filters.value['live'] = 1
		} else if (currentTab.value == 'upcoming') {
			filters.value['upcoming'] = 1
		} else if (currentTab.value == 'new') {
			filters.value['published'] = 1
			filters.value['published_on'] = [
				'>=',
				dayjs().add(-3, 'month').format('YYYY-MM-DD'),
			]
		} else if (currentTab.value == 'created') {
			filters.value['created'] = 1
		} else if (currentTab.value == 'unpublished') {
			filters.value['published'] = 0
		}
	}
}

const updateStudentFilter = () => {
	if (!user.data || (user.data?.is_student && currentTab.value != 'enrolled')) {
		filters.value['published'] = 1
	}
}

const setQueryParams = () => {
	let queries = new URLSearchParams(location.search)
	let filterKeys = {
		title: title.value,
		category: currentCategory.value,
		certification: certification.value,
	}

	Object.keys(filterKeys).forEach((key) => {
		if (filterKeys[key]) {
			queries.set(key, filterKeys[key])
		} else {
			queries.delete(key)
		}
	})

	let queryString = ''
	if (queries.toString()) {
		queryString = `?${queries.toString()}`
	}

	// Carry the existing state forward rather than replacing it with `{}`. This
	// page hosts form child routes whose open/close semantics hang off a marker
	// in history.state, and that marker only survives a reload through
	// window.history. `{}` also being truthy means vue-router never re-seeds its
	// own `position` key after such a reload, so every later pop delta is NaN.
	history.replaceState(history.state, '', `${location.pathname}${queryString}`)
}

watch(currentTab, () => {
	updateCourses()
})

const courseTabs = computed(() => {
	let tabs = [
		{
			label: __('Publicados'),
			value: 'live',
		},
		{
			label: __('Próximos'),
			value: 'upcoming',
		},
	]
	if (
		user.data?.is_moderator ||
		user.data?.is_instructor ||
		user.data?.is_evaluator
	) {
		tabs.push({ label: __('Creados'), value: 'created' })
		tabs.push({ label: __('No publicados'), value: 'unpublished' })
	} else if (user.data) {
		tabs.push({ label: __('Mis cursos'), value: 'enrolled' })
	}
	return tabs
})

const courseMenu = computed(() => {
	return [
		{
			label: __('Nuevo curso'),
			icon: 'lucide-book-open',
			onClick() {
				// openFormRoute, not a bare router.push: it stamps the history
				// entry so the form's own close() pops it instead of replacing.
				openFormRoute(router, { name: 'NewCourse' })
			},
		},
	]
})

const breadcrumbs = computed(() => [
	{
		label: __('Cursos'),
		route: { name: 'Courses' },
	},
])

usePageMeta(() => {
	return {
		title: __('Cursos'),
		icon: brand.favicon,
	}
})
</script>

<style scoped>
.catalog-hero {
	position: relative;
	display: flex;
	min-height: 17rem;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	margin: 1.25rem 1.5rem 0;
	padding: clamp(1.5rem, 3vw, 2.25rem);
	border: 1px solid var(--surface-green-2);
	border-radius: 1.25rem;
	overflow: hidden;
	background: radial-gradient(
			circle at 82% 15%,
			color-mix(in srgb, var(--ink-orange-5) 18%, transparent),
			transparent 25%
		),
		linear-gradient(112deg, var(--surface-amber-1) 0%, var(--surface-green-1) 58%, var(--surface-green-1) 100%);
	color: var(--ink-base);
	box-shadow: 0 10px 28px color-mix(in srgb, var(--ink-base) 7%, transparent);
}

.catalog-hero__copy {
	position: relative;
	z-index: 1;
	max-width: 45rem;
}

.catalog-hero__eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	margin-bottom: 0.7rem;
	color: var(--ink-green-7);
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.catalog-hero__eyebrow-dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
	background: var(--ink-orange-5);
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--ink-orange-5) 14%, transparent);
}

.catalog-hero h2 {
	max-width: 37rem;
	margin: 0;
	font-size: clamp(1.85rem, 2.7vw, 2.4rem);
	font-weight: 750;
	letter-spacing: -0.035em;
	line-height: 1.08;
}

.catalog-hero p {
	max-width: 38rem;
	margin: 0.7rem 0 1rem;
	color: var(--ink-gray-7);
	font-size: 0.98rem;
	line-height: 1.55;
}

.catalog-hero__cta {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	min-height: 2.65rem;
	padding: 0.65rem 1rem;
	border-radius: 0.75rem;
	background: var(--ink-green-7);
	color: var(--surface-base);
	font-weight: 700;
	text-decoration: none;
	transition: transform 160ms ease, box-shadow 160ms ease;
}

.catalog-hero__cta:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 22px color-mix(in srgb, var(--ink-base) 16%, transparent);
}

.catalog-hero__art {
	position: relative;
	display: grid;
	width: min(30%, 16rem);
	min-width: 12rem;
	min-height: 10rem;
	place-items: center;
}

.catalog-hero__orbit {
	position: absolute;
	border: 1px solid color-mix(in srgb, var(--ink-green-7) 18%, transparent);
	border-radius: 50%;
}

.catalog-hero__orbit--one {
	width: 12rem;
	height: 12rem;
}

.catalog-hero__orbit--two {
	width: 8.75rem;
	height: 8.75rem;
}

.catalog-hero__art-card {
	position: relative;
	display: flex;
	width: 10rem;
	min-height: 8.5rem;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 0.7rem;
	padding: 1rem;
	border: 1px solid color-mix(in srgb, var(--surface-base) 30%, transparent);
	border-radius: 1rem;
	background: var(--ink-green-7);
	color: var(--surface-base);
	box-shadow: 0 14px 30px color-mix(in srgb, var(--ink-green-8) 20%, transparent);
	transform: rotate(5deg);
}

.catalog-hero__art-card > span:first-child {
	color: var(--surface-green-2);
}

.catalog-hero__art-card > span:nth-child(2) {
	font-size: 0.9rem;
	font-weight: 700;
}

.catalog-hero__art-lines {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: 0.35rem;
}

.catalog-hero__art-lines i {
	width: 100%;
	height: 0.25rem;
	border-radius: 999px;
	background: color-mix(in srgb, var(--surface-base) 28%, transparent);
}

.catalog-hero__art-lines i:nth-child(2) {
	width: 72%;
	background: var(--ink-orange-4);
}

.catalog-hero__art-lines i:nth-child(3) {
	width: 48%;
}

.catalog-hero__art-chip {
	position: absolute;
	right: -0.25rem;
	bottom: 0.1rem;
	padding: 0.45rem 0.65rem;
	border: 1px solid color-mix(in srgb, var(--ink-green-7) 20%, transparent);
	border-radius: 999px;
	background: var(--surface-base);
	color: var(--ink-green-8);
	font-size: 0.72rem;
	font-weight: 650;
	backdrop-filter: blur(8px);
}

@media (max-width: 700px) {
	.catalog-hero {
		min-height: 0;
		margin: 0.85rem 1rem 0;
		padding: 1.4rem;
	}

	.catalog-hero__art {
		display: none;
	}
}

:deep(.course-catalog-grid) {
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 22rem));
	justify-content: start;
}
</style>
