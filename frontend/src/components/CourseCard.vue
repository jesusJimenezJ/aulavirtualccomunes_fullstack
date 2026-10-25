<template>
	<article v-if="course.title" class="course-card group">
		<div
			class="course-card__cover"
			:style="
				course.image
					? { backgroundImage: `url('${encodeURI(course.image)}')` }
					: { backgroundImage: gradientColor }
			"
		>
			<div class="course-card__cover-shade" />
			<span v-if="course.category" class="course-card__category">
				{{ course.category }}
			</span>
			<div
				v-if="!course.image"
				class="course-card__cover-mark"
				aria-hidden="true"
			>
				<span class="lucide-book-open size-8" aria-hidden="true" />
			</div>
		</div>

		<div class="course-card__body">
			<div class="course-card__stats">
				<Tooltip
					v-if="course.lessons"
					:text="__('Cantidad de lecciones del curso')"
				>
					<span class="course-card__stat">
						<span class="lucide-book-open size-4" aria-hidden="true" />
						<span aria-hidden="true"
							>{{ course.lessons }} {{ __('lecciones') }}</span
						>
						<span class="sr-only">{{ lessonCount }}</span>
					</span>
				</Tooltip>

					<!-- Valoración accesible del curso -->
<span v-if="course.rating != null" class="course-card__stat">
    <span class="lucide-star size-4" aria-hidden="true"></span>
    <span aria-hidden="true">
        {{ Number(course.rating).toFixed(1) }}
    </span>
    <span class="sr-only">
        {{ __('Valoración: {0} de 5').format(
            (Math.round(Number(course.rating) * 10) / 10).toFixed(1)
        ) }}
    </span>
</span>

<!-- Indicador de curso destacado -->
<span v-if="course.featured" class="course-card__stat">
    <span class="lucide-badge-check size-4" aria-hidden="true"></span>
    <span class="sr-only">{{ __('Curso destacado') }}</span>
</span>

<!-- Indicador de certificación -->
<span v-if="course.enable_certification" class="course-card__stat">
    <span class="lucide-award size-4" aria-hidden="true"></span>
    <span class="sr-only">{{ __('Certificación disponible') }}</span>
</span>

				<Tooltip
					v-if="course.enrollments"
					:text="__('Cantidad de estudiantes matriculados')"
				>
					<span class="course-card__stat">
						<span class="lucide-users-round size-4" aria-hidden="true" />
						<span aria-hidden="true">{{
							formatAmount(course.enrollments)
						}}</span>
						<span class="sr-only">
							{{
								__('Estudiantes matriculados: {0}').format(course.enrollments)
							}}
						</span>
					</span>
				</Tooltip>
			</div>
			<h3 class="course-card__title">
				<CardLink :to="to" :external="external">{{ course.title }}</CardLink>
			</h3>
			<p v-if="course.short_introduction" class="course-card__summary">
				{{ course.short_introduction }}
			</p>

			<div v-if="user && course.membership" class="course-card__progress">
				<ProgressBar
					:progress="course.membership.progress"
					:label="__('Course progress')"
				/>
				<span
					>{{ Math.ceil(course.membership.progress) }}%
					{{ __('completado') }}</span
				>
			</div>

			<div class="course-card__footer">
				<div v-if="course.instructors?.length" class="course-card__instructor">
					<div class="course-card__avatars">
						<UserAvatar
							v-for="instructor in course.instructors"
							:key="instructor.username || instructor.name"
							:user="instructor"
						/>
					</div>
					<CourseInstructors :instructors="course.instructors" />
				</div>
				<div v-if="course.paid_course" class="course-card__price">
					{{ course.price }}
				</div>
			</div>
		</div>
	</article>
</template>
<script setup>
import { sessionStore } from '@/stores/session'
import { formatAmount } from '@/utils'
import { Tooltip } from 'frappe-ui'
import { computed } from 'vue'
import CardLink from '@/components/CardLink.vue'
import CourseInstructors from '@/components/CourseInstructors.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ProgressBar from '@/components/ProgressBar.vue'

const { user } = sessionStore()

const props = defineProps({
	course: {
		type: Object,
		default: null,
	},
	to: {
		type: [Object, String],
		default: null,
	},
	external: {
		type: Boolean,
		default: false,
	},
})

const lessonCount = computed(() =>
	props.course.lessons == 1
		? __('1 lección')
		: __('{0} lecciones').format(props.course.lessons)
)

const gradientColor = computed(() => {
	let color = props.course.card_gradient?.toLowerCase() || 'blue'
	// token-exempt: card art stays dark in both themes.
	return `linear-gradient(to top right, black, var(--${color}-400))`
})
</script>
<style>
.course-card {
	position: relative;
	display: flex;
	min-height: 100%;
	flex-direction: column;
	overflow: hidden;
	border: 1px solid var(--outline-gray-2);
	border-radius: 1.1rem;
	background: var(--surface-base);
	color: var(--ink-base);
	box-shadow: 0 5px 18px color-mix(in srgb, var(--ink-base) 5%, transparent);
	transition: border-color 180ms ease, box-shadow 180ms ease,
		transform 180ms ease;
}

.course-card:hover {
	transform: translateY(-4px);
	border-color: var(--outline-gray-3);
	box-shadow: 0 18px 38px color-mix(in srgb, var(--ink-base) 12%, transparent);
}

.course-card__cover {
	position: relative;
	display: flex;
	min-height: 10rem;
	flex-direction: column;
	justify-content: flex-end;
	overflow: hidden;
	background-position: center;
	background-size: cover;
	background-color: var(--ink-green-7);
}

.course-card__cover-shade {
	position: absolute;
	inset: 0;
	background: linear-gradient(
		180deg,
		color-mix(in srgb, var(--ink-base) 5%, transparent) 12%,
		color-mix(in srgb, var(--ink-base) 76%, transparent) 100%
	);
	transition: opacity 180ms ease;
}

.course-card:hover .course-card__cover-shade {
	opacity: 0.9;
}

.course-card__category {
	position: absolute;
	top: 0.9rem;
	left: 0.9rem;
	max-width: calc(100% - 1.8rem);
	padding: 0.35rem 0.65rem;
	border: 1px solid color-mix(in srgb, var(--surface-base) 55%, transparent);
	border-radius: 999px;
	background: color-mix(in srgb, var(--surface-base) 92%, transparent);
	color: var(--ink-green-8);
	font-size: 0.7rem;
	font-weight: 700;
	line-height: 1.2;
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
}

.course-card__cover-mark {
	position: absolute;
	top: 50%;
	left: 50%;
	display: grid;
	width: 4.6rem;
	height: 4.6rem;
	place-items: center;
	border: 1px solid color-mix(in srgb, var(--surface-base) 42%, transparent);
	border-radius: 1.4rem;
	background: color-mix(in srgb, var(--surface-base) 14%, transparent);
	color: var(--surface-base);
	transform: translate(-50%, -58%) rotate(-7deg);
	backdrop-filter: blur(6px);
}

.course-card__body {
	display: flex;
	flex: 1;
	flex-direction: column;
	padding: 1rem 1.1rem 1.15rem;
}

.course-card__stats {
	display: flex;
	min-height: 1.5rem;
	align-items: center;
	gap: 0.9rem;
	color: var(--ink-gray-7);
	font-size: 0.75rem;
}

.course-card__stat {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}

.course-card__stat svg {
	color: var(--ink-green-7);
}

.course-card__title {
	margin: 0.55rem 0 0;
	color: var(--ink-base);
	font-size: 1.12rem;
	font-weight: 700;
	letter-spacing: -0.015em;
	line-height: 1.35;
}

.course-card__title a {
	color: inherit;
	text-decoration: none;
}

.course-card__title a:hover {
	text-decoration: underline;
	text-underline-offset: 3px;
}

.course-card__summary {
	display: -webkit-box;
	min-height: 3.4rem;
	margin: 0.45rem 0 1rem;
	overflow: hidden;
	color: var(--ink-gray-7);
	font-size: 0.88rem;
	line-height: 1.55;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.course-card__progress {
	margin: auto 0 1rem;
	color: var(--ink-gray-7);
	font-size: 0.75rem;
}

.course-card__progress > span {
	display: block;
	margin-top: 0.35rem;
}

.course-card__footer {
	display: flex;
	min-height: 2rem;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-top: auto;
	padding-top: 0.8rem;
	border-top: 1px solid var(--surface-gray-2);
}

.course-card__instructor,
.course-card__avatars {
	display: flex;
	min-width: 0;
	align-items: center;
}

.course-card__instructor {
	gap: 0.5rem;
	color: var(--ink-gray-8);
	font-size: 0.78rem;
	font-weight: 600;
}

.course-card__avatars {
	flex-shrink: 0;
}

.course-card__avatars > * + * {
	margin-inline-start: -0.45rem;
}

.course-card__price {
	color: var(--ink-green-7);
	font-size: 0.95rem;
	font-weight: 750;
}

.avatar-group {
	display: inline-flex;
	align-items: center;
}

.avatar-group .avatar {
	transition: margin 0.1s ease-in-out;
}

.avatar-group.overlap .avatar + .avatar {
	margin-inline-start: calc(-8px);
}
</style>
