<template>
	<SkeletonLoader v-if="!course.data" variant="course-page" />
	<div v-else class="course-overview p-5">
		<div
			class="flex flex-col md:flex-row items-start justify-between w-full gap-x-8 gap-y-8"
		>
			<div class="md:w-2/3 space-y-10 min-w-0">
				<section class="course-overview__intro space-y-4">
					<div v-if="course.data.category" class="course-overview__category">
						<span class="lucide-sparkles size-4" aria-hidden="true" />
						{{ course.data.category }}
					</div>
					<h1 class="text-4xl-semibold text-ink-gray-9">
						{{ course.data.title }}
					</h1>
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-2 text-ink-gray-7"
					>
						<template v-if="course.data.category">
							<router-link
								:to="{
									name: 'Courses',
									query: { category: course.data.category },
								}"
								class="flex items-center gap-1.5 font-medium hover:text-ink-gray-9"
							>
								<span class="lucide-tag size-4" />
								<span>{{ course.data.category }}</span>
							</router-link>
							<span class="lucide-dot size-5 text-ink-gray-7" />
						</template>
						<template v-if="course.data.enrollments">
							<div class="flex items-center gap-1.5">
								<span class="lucide-users-round size-4" />
								<span
									>{{ formatAmount(course.data.enrollments) }}
									{{ __('estudiantes') }}</span
								>
							</div>
							<span class="lucide-dot size-5 text-ink-gray-7" />
						</template>
						<div
							v-if="course.data.instructors?.length"
							class="flex items-center"
						>
							<span
								class="h-6 me-1"
								:class="{
									'avatar-group overlap': course.data.instructors.length > 1,
								}"
							>
								<UserAvatar
									v-for="instructor in course.data.instructors"
									:key="instructor.name"
									:user="instructor"
								/>
							</span>
							<CourseInstructors :instructors="course.data.instructors" />
						</div>
					</div>
					<div v-if="course.data.tags" class="flex flex-wrap gap-2">
						<Badge
							v-for="tag in course.data.tags.split(', ')"
							:key="tag"
							theme="gray"
							size="lg"
						>
							{{ tag }}
						</Badge>
					</div>
					<p
						v-if="course.data.short_introduction"
						class="text-ink-gray-7 leading-6"
					>
						{{ course.data.short_introduction }}
					</p>
					<div class="md:hidden">
						<CourseCardOverlay :course="course" />
					</div>
				</section>

				<section class="course-overview__panel">
					<div class="flex items-baseline justify-between gap-4 mb-4">
						<h2 class="text-3xl-semibold text-ink-gray-9">
							{{ __('Contenido del curso') }}
						</h2>
						<div class="text-base text-ink-gray-6">
							{{ outlineStats }}
						</div>
					</div>
					<div class="course-overview__outline border rounded-5 p-2">
						<SkeletonLoader
							v-if="outline.loading && !outline.data"
							variant="course-outline"
							:count="10"
						/>
						<div
							v-else-if="!hasCourseContent"
							class="flex items-center justify-center px-4 py-10 text-center"
						>
							<span class="text-sm text-ink-gray-6">
								{{ __('El contenido de este curso estará disponible pronto.') }}
							</span>
						</div>
						<CourseOutline
							v-else
							:courseName="course.data.name"
							:getProgress="course.data.membership ? true : false"
							:editorLinks="isCourseAdmin"
						/>
					</div>
				</section>

				<section
					v-if="course.data.description"
					class="course-overview__panel space-y-3"
				>
					<h2 class="text-3xl-semibold text-ink-gray-9">
						{{ __('Sobre este curso') }}
					</h2>
					<div
						v-safe-html:rich="course.data.description"
						class="ProseMirror prose prose-sm max-w-none !whitespace-normal prose-table:table-fixed prose-td:p-2 prose-th:p-2 prose-td:border prose-th:border prose-td:border-outline-gray-2 prose-th:border-outline-gray-2 prose-td:relative prose-th:relative prose-th:bg-surface-gray-2"
					/>
				</section>

				<CourseDocuments
					:courseName="course.data.name"
					:canManage="isCourseAdmin"
				/>
			</div>

			<aside
				class="hidden md:flex w-80 shrink-0 flex-col space-y-6 self-start sticky top-5"
			>
				<CourseCardOverlay :course="course" />
				<CourseCreatorCard :instructors="course.data.instructors || []" />
			</aside>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import { createResource, Badge } from 'frappe-ui'
import { formatAmount } from '@/utils/'
import type {
	CourseDetails,
	OutlineChapter,
	Resource,
	SessionUser,
} from '@/types'
import CourseCardOverlay from '@/components/CourseCardOverlay.vue'
import CourseOutline from '@/components/CourseOutline.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import CourseInstructors from '@/components/CourseInstructors.vue'
import CourseCreatorCard from '@/components/CourseCreatorCard.vue'
import CourseDocuments from '@/components/Courses/CourseDocuments.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps<{
	course: Resource<CourseDetails | null>
}>()

const user = inject<SessionUser>('$user')

const isCourseInstructor = computed<boolean>(() =>
	(props.course.data?.instructors || []).some(
		(i) => i.name === user?.data?.name
	)
)

const isCourseAdmin = computed<boolean>(
	() => Boolean(user?.data?.is_moderator) || isCourseInstructor.value
)

const outline = createResource({
	url: 'lms.lms.utils.get_course_outline',
	makeParams() {
		return { course: props.course.data?.name, progress: false }
	},
	auto: false,
}) as Resource<OutlineChapter[]>

watch(
	() => props.course.data?.name,
	(name) => {
		if (name) outline.fetch()
	},
	{ immediate: true }
)

const outlineStats = computed(() => {
	const chapters = outline.data || []
	const lessonCount = chapters.reduce(
		(acc, c) => acc + (c.lessons?.length || 0),
		0
	)
	const parts: string[] = []
	if (chapters.length) {
		parts.push(
			`${chapters.length} ${chapters.length === 1 ? 'sección' : 'secciones'}`
		)
	}
	if (lessonCount) {
		parts.push(`${lessonCount} ${lessonCount === 1 ? 'lección' : 'lecciones'}`)
	}
	return parts.join(' · ')
})

const hasCourseContent = computed(() => {
	const chapters = outline.data || []
	const lessonCount = chapters.reduce(
		(acc, c) => acc + (c.lessons?.length || 0),
		0
	)
	return chapters.length > 0 && lessonCount > 0
})
</script>

<style scoped>
.course-overview {
	width: min(100%, 78rem);
	margin-inline: auto;
}

.course-overview__intro {
	position: relative;
	padding: clamp(1.25rem, 3vw, 2rem);
	border: 1px solid var(--surface-green-2);
	border-radius: 1.25rem;
	background: radial-gradient(
			circle at 95% 8%,
			color-mix(in srgb, var(--ink-orange-5) 16%, transparent),
			transparent 25%
		),
		linear-gradient(
			120deg,
			var(--surface-green-1) 0%,
			var(--surface-amber-1) 100%
		);
}

.course-overview__category {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.4rem 0.7rem;
	border: 1px solid var(--outline-green-3);
	border-radius: 999px;
	background: color-mix(in srgb, var(--surface-base) 72%, transparent);
	color: var(--ink-green-7);
	font-size: 0.75rem;
	font-weight: 700;
}

.course-overview__intro h1 {
	max-width: 52rem;
	margin-top: 0.4rem;
	font-size: clamp(1.9rem, 3.3vw, 3rem);
	letter-spacing: -0.04em;
	line-height: 1.08;
}

.course-overview__intro > p {
	max-width: 48rem;
	font-size: 1rem;
	line-height: 1.7;
}

.course-overview__panel {
	padding: 1.25rem;
	border: 1px solid var(--outline-gray-2);
	border-radius: 1.1rem;
	background: var(--surface-base);
	box-shadow: 0 8px 24px color-mix(in srgb, var(--ink-base) 4%, transparent);
}

.course-overview__panel h2 {
	font-size: 1.3rem;
	letter-spacing: -0.02em;
}

.course-overview__outline {
	border-color: var(--outline-gray-2);
	background: var(--surface-base);
}

@media (max-width: 640px) {
	.course-overview {
		padding: 1rem;
	}

	.course-overview__panel {
		padding: 1rem;
	}
}
</style>
