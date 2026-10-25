<template>
	<div class="enrollment-panel min-w-80 max-w-sm">
		<VideoPreview
			:video-link="course.data?.video_link"
			:fallback-image="course.data?.image"
		/>
		<div class="p-5">
			<div class="text-3xl-semibold text-ink-gray-9 mb-4">
				{{ priceLabel }}
			</div>
			<div v-if="!readOnlyMode">
				<div v-if="course.data?.membership" class="space-y-2 mb-8">
					<Button
						variant="solid"
						size="md"
						class="w-full"
						:route="{
							name: 'Lesson',
							params: {
								courseName: course.data?.name,
								chapterNumber: course?.data?.current_lesson
									? course?.data?.current_lesson.split('-')[0]
									: 1,
								lessonNumber: course?.data?.current_lesson
									? course?.data?.current_lesson.split('-')[1]
									: 1,
							},
						}"
					>
						<template #prefix>
							<span class="lucide-book-text size-4" />
						</template>
						<span>
							{{ __('Continuar aprendiendo') }}
						</span>
					</Button>
				</div>
				<Button
					v-else-if="course.data?.paid_course && !isAdmin"
					variant="solid"
					size="md"
					class="w-full mb-8 text-p-base-medium"
					:route="{
						name: 'Billing',
						params: {
							type: 'course',
							name: course.data.name,
						},
					}"
				>
					<template #prefix>
						<span class="lucide-credit-card size-4" />
					</template>
					<span>
						{{ __('Comprar este curso') }}
					</span>
				</Button>
				<Badge
					v-else-if="course.data?.disable_self_learning && !isAdmin"
					theme="blue"
					size="lg"
					class="mb-4"
				>
					{{ __('Contacta con el equipo académico para matricularte') }}
				</Badge>
				<Button
					v-else-if="!isAdmin"
					@click="enrollStudent()"
					variant="solid"
					class="w-full mb-8"
					size="md"
				>
					<template #prefix>
						<span class="lucide-book-text size-4" />
					</template>
					<span>
						{{ __('Matricularme') }}
					</span>
				</Button>
			</div>
			<section v-if="hasCourseStats" class="space-y-3">
				<div class="text-base text-ink-gray-9 mb-1">
					{{ __('Este curso incluye:') }}
				</div>
				<div
					v-if="enrolledLabel"
					class="flex items-center gap-3 text-ink-gray-8"
				>
					<span class="lucide-users size-4 shrink-0 text-ink-gray-7" />
					<span>{{ enrolledLabel }} {{ __('personas matriculadas') }}</span>
				</div>
				<div
					v-if="course.data?.video_link"
					class="flex items-center gap-3 text-ink-gray-8"
				>
					<span class="lucide-monitor-play size-4 shrink-0 text-ink-gray-7" />
					<span>{{ __('Video del curso') }}</span>
				</div>
				<div
					v-if="course.data?.lessons"
					class="flex items-center gap-3 text-ink-gray-8"
				>
					<span class="lucide-book-open size-4 shrink-0 text-ink-gray-7" />
					<span>
						{{ course.data?.lessons }}
						{{ course.data?.lessons === 1 ? 'lección' : 'lecciones' }}
					</span>
				</div>
				<div
					v-if="(course.data?.quiz_count || 0) > 0"
					class="flex items-center gap-3 text-ink-gray-8"
				>
					<span class="lucide-help-circle size-4 shrink-0 text-ink-gray-7" />
					<span>
						{{ course.data?.quiz_count }}
						{{
							course.data?.quiz_count === 1
								? __('tema de cuestionario')
								: __('temas de cuestionario')
						}}
					</span>
				</div>
			</section>
		</div>
	</div>
</template>
<script setup lang="ts">
import { computed, inject } from 'vue'
import { Badge, Button, call, toast } from 'frappe-ui'
import type { FrappeResourceError } from 'frappe-ui'
import { resourceErrorMessage } from '@/utils/resource'
import { useRouter } from 'vue-router'
import VideoPreview from '@/components/VideoPreview.vue'
import { useTelemetry } from '@framework/ui/telemetry/index'
import type {
	CourseDetails,
	CourseInstructorInfo,
	Resource,
	SessionUser,
} from '@/types'

const router = useRouter()
const user = inject<SessionUser>('$user')!
const readOnlyMode = (window as Window & { read_only_mode?: boolean })
	.read_only_mode
const { capture } = useTelemetry()

const props = withDefaults(
	defineProps<{
		course: Resource<CourseDetails | null>
	}>(),
	{}
)

function enrollStudent() {
	if (!user.data) {
		toast.warning(__('Inicia sesión para matricularte en este curso'))
		setTimeout(() => {
			window.location.href = `/login?redirect-to=${window.location.pathname}`
		}, 500)
		return
	}
	const courseName = props.course.data?.name
	if (!courseName) return
	call('frappe.client.insert', {
		doc: {
			doctype: 'LMS Enrollment',
			course: courseName,
			member: user.data.name,
		},
	})
		.then(() => {
			capture('enrolled_in_course', { course: courseName })
			toast.success(__('Te has matriculado en este curso'))
			setTimeout(() => {
				router.push({
					name: 'Lesson',
					params: {
						courseName,
						chapterNumber: 1,
						lessonNumber: 1,
					},
				})
			}, 1000)
		})
		.catch((err: FrappeResourceError) => {
			const msg = resourceErrorMessage(err, 'Error')
			toast.warning(__(msg))
			console.error(err)
		})
}

const is_instructor = (): boolean => {
	let user_is_instructor = false
	props.course.data?.instructors.forEach((instructor: CourseInstructorInfo) => {
		if (!user_is_instructor && instructor.name == user.data?.name) {
			user_is_instructor = true
		}
	})
	return user_is_instructor
}

const priceLabel = computed<string>(() => {
	if (props.course.data?.paid_course) return props.course.data?.price || ''
	return __('Gratis')
})

const enrolledLabel = computed<string>(() => {
	const n = props.course.data?.enrollments ?? 0
	if (!n) return ''
	if (n < 50) return String(n)
	const tier = n < 1000 ? 50 : 100
	return `${Math.floor(n / tier) * tier}+`
})

const hasCourseStats = computed<boolean>(() =>
	Boolean(
		enrolledLabel.value ||
			props.course.data?.video_link ||
			props.course.data?.lessons ||
			(props.course.data?.quiz_count ?? 0) > 0
	)
)

const isAdmin = computed<boolean>(() => {
	return Boolean(user.data?.is_moderator) || is_instructor()
})
</script>

<style scoped>
.enrollment-panel {
	border: 1px solid var(--surface-green-2);
	border-radius: 1.1rem;
	background: var(--surface-base);
	box-shadow: 0 14px 34px color-mix(in srgb, var(--ink-base) 9%, transparent);
}

.enrollment-panel > div:last-child {
	padding: 1.2rem;
}

.enrollment-panel > div:last-child > div:first-child {
	color: var(--ink-base);
	font-size: 1.8rem;
	letter-spacing: -0.04em;
}

.enrollment-panel section {
	padding-top: 1rem;
	border-top: 1px solid var(--surface-gray-2);
}

@media (max-width: 767px) {
	.enrollment-panel {
		width: 100%;
		min-width: 0;
		max-width: none;
	}
}
</style>
