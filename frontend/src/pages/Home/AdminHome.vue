<template>
	<div class="instructor-home">
		<!-- Bienvenida del docente -->
		<section class="instructor-home__welcome">
			<div>
				<span class="instructor-home__eyebrow">
					Ccomunes · Espacio docente
				</span>
				<h2>Gestiona tus cursos</h2>
				<p>
					Organiza tus cursos y contenidos de Psicología Social Comunitaria.
				</p>
			</div>

			<Button :route="{ name: 'NewCourse' }" class="instructor-home__browse">
				<template #prefix>
					<span class="lucide-plus size-4" />
				</template>
				Crear curso
			</Button>
		</section>

		<!-- Evaluaciones próximas -->
		<section v-if="evals?.data?.length" class="instructor-home__section">
			<h2 class="instructor-home__section-title">Evaluaciones próximas</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				<component
					:is="user?.data?.username ? 'router-link' : 'div'"
					v-for="evaluation in evals.data"
					:key="evaluation.name"
					:to="
						user?.data?.username
							? profileRoute(user.data.username, 'ProfileEvaluationSchedule')
							: undefined
					"
					class="instructor-home__card"
				>
					<h3 class="instructor-home__card-title">
						{{ evaluation.course_title || 'Evaluación programada' }}
					</h3>

					<div class="instructor-home__card-details">
						<div class="instructor-home__detail">
							<span class="lucide-calendar size-4" />
							<span>
								{{ dayjs(evaluation.date).format('DD MMMM YYYY') }}
							</span>
						</div>

						<div class="instructor-home__detail">
							<span class="lucide-clock size-4" />
							<span>{{ formatTime(evaluation.start_time) }}</span>
						</div>

						<div v-if="evaluation.timezone" class="instructor-home__detail">
							<span class="lucide-globe size-4" />
							<span>
								{{ formatTimezone(evaluation.timezone, evaluation.date) }}
							</span>
						</div>

						<div v-if="evaluation.member_name" class="instructor-home__detail">
							<span class="lucide-graduation-cap size-4" />
							<span>{{ evaluation.member_name }}</span>
						</div>
					</div>
				</component>
			</div>
		</section>

		<!-- Clases en vivo -->
		<section v-if="liveClasses?.data?.length" class="instructor-home__section">
			<h2 class="instructor-home__section-title">Próximas clases en vivo</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
				<article
					v-for="cls in liveClasses.data"
					:key="cls.name"
					class="instructor-home__card"
				>
					<h3 class="instructor-home__card-title">
						{{ cls.title }}
					</h3>

					<p class="instructor-home__description">
						{{ cls.description }}
					</p>

					<div class="instructor-home__card-details">
						<div class="instructor-home__detail">
							<span class="lucide-calendar size-4" />
							<span>
								{{ dayjs(cls.date).format('DD MMMM YYYY') }}
							</span>
						</div>

						<div class="instructor-home__detail">
							<span class="lucide-clock size-4" />
							<span>
								{{ formatTime(cls.time) }}
								-
								{{ dayjs(getClassEnd(cls)).format('HH:mm') }}
							</span>
						</div>

						<div v-if="canAccessClass(cls)" class="instructor-home__actions">
							<a
								v-if="
									(user?.data?.is_moderator || user?.data?.is_evaluator) &&
									cls.start_url
								"
								:href="safeUrl(cls.start_url)"
								v-external
								class="instructor-home__action"
							>
								<span class="lucide-monitor size-4" />
								Iniciar
							</a>

							<a
								v-if="cls.join_url"
								:href="safeUrl(cls.join_url)"
								v-external
								class="instructor-home__action"
							>
								<span class="lucide-video size-4" />
								Unirse
							</a>
						</div>

						<Tooltip
							v-else-if="hasClassEnded(cls)"
							text="Esta clase ha finalizado"
							placement="right"
						>
							<div class="instructor-home__ended">
								<span class="lucide-info size-4" />
								<span>Clase finalizada</span>
							</div>
						</Tooltip>
					</div>
				</article>
			</div>
		</section>

		<!-- Cursos creados -->
		<section
			v-if="createdCourses.data?.length"
			class="instructor-home__section"
		>
			<div class="flex items-center justify-between mb-3">
				<h2 class="instructor-home__section-title">Cursos creados</h2>

				<router-link :to="{ name: 'Courses' }">
					<span class="flex items-center gap-x-1 text-ink-gray-6 text-xs">
						Ver todos
						<span class="lucide-move-right size-3 rtl:rotate-180" />
					</span>
				</router-link>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
				<CourseCard
					v-for="course in createdCourses.data"
					:key="course.name"
					:course="course"
					:to="{
						name: 'CourseDetail',
						params: { courseName: course.name },
					}"
				/>
			</div>
		</section>

		<!-- Próximos lotes -->
		<section
			v-if="createdBatches.data?.length"
			class="instructor-home__section"
		>
			<div class="flex items-center justify-between mb-3">
				<h2 class="instructor-home__section-title">Próximos grupos</h2>

				<router-link :to="{ name: 'Batches' }">
					<span class="flex items-center gap-x-1 text-ink-gray-6 text-xs">
						Ver todos
						<span class="lucide-move-right size-3 rtl:rotate-180" />
					</span>
				</router-link>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
				<router-link
					v-for="batch in createdBatches.data"
					:key="batch.name"
					:to="{
						name: 'BatchDetail',
						params: { batchName: batch.name },
					}"
				>
					<BatchCard :batch="batch" />
				</router-link>
			</div>
		</section>

		<!-- Estado vacío -->
		<div
			v-if="!createdCourses.data?.length && !createdBatches.data?.length"
			class="instructor-home__empty"
		>
			<span class="lucide-graduation-cap size-10 text-ink-gray-5" />

			<h2 class="text-lg-semibold text-ink-gray-7">
				Aún no hay cursos ni grupos creados
			</h2>

			<p>
				Aquí aparecerán tus cursos y grupos. Crea tu primer curso para comenzar.
			</p>

			<router-link :to="{ name: 'NewCourse' }" class="mt-3">
				<Button>
					<template #prefix>
						<span class="lucide-plus size-4" />
					</template>
					Crear mi primer curso
				</Button>
			</router-link>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Button, createResource, Tooltip } from 'frappe-ui'
import { inject } from 'vue'

import { formatTime } from '@/utils'
import { formatTimezone } from '@/utils/timezone'
import { profileRoute } from '@/utils/routes'
import { safeUrl } from '@/utils/safeUrl'

import CourseCard from '@/components/CourseCard.vue'
import BatchCard from '@/pages/Batches/components/BatchCard.vue'

const user = inject<any>('$user')
const dayjs = inject<any>('$dayjs')

const props = defineProps<{
	liveClasses?: {
		data?: any[]
	}
	evals?: {
		data?: any[]
	}
}>()

const liveClasses = props.liveClasses
const evals = props.evals

const createdCourses = createResource({
	url: 'lms.lms.api.get_created_courses',
	auto: true,
})

const createdBatches = createResource({
	url: 'lms.lms.api.get_created_batches',
	auto: true,
})

function getClassEnd(cls: any) {
	return dayjs(`${cls.date} ${cls.time}`).add(cls.duration || 0, 'minutes')
}

function canAccessClass(cls: any) {
	const now = dayjs()
	const start = dayjs(`${cls.date} ${cls.time}`)
	const end = getClassEnd(cls)

	return now.isAfter(start.subtract(15, 'minutes')) && now.isBefore(end)
}

function hasClassEnded(cls: any) {
	return dayjs().isAfter(getClassEnd(cls))
}
</script>

<style scoped>
.instructor-home {
	padding-bottom: 2rem;
}

.instructor-home__welcome {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	margin-top: 1.5rem;
	padding: 1.5rem clamp(1.2rem, 3vw, 2rem);
	border: 1px solid var(--surface-green-2);
	border-radius: 1.15rem;
	background: linear-gradient(110deg, var(--ink-green-8), var(--ink-green-7));
	color: var(--surface-base);
}

.instructor-home__eyebrow {
	color: var(--surface-green-2);
	font-size: 0.72rem;
	font-weight: 750;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.instructor-home__welcome h2 {
	margin: 0.4rem 0 0.35rem;
	font-size: clamp(1.3rem, 2.5vw, 1.8rem);
	font-weight: 750;
	letter-spacing: -0.03em;
}

.instructor-home__welcome p {
	max-width: 42rem;
	margin: 0;
	color: color-mix(in srgb, var(--surface-base) 80%, transparent);
	line-height: 1.55;
}

.instructor-home__section {
	margin-top: 2.5rem;
}

.instructor-home__section-title {
	margin-bottom: 0.85rem;
	color: var(--ink-gray-8);
	font-size: 1.1rem;
	font-weight: 700;
}

.instructor-home__card {
	display: flex;
	flex-direction: column;
	height: 100%;
	padding: 1rem;
	border: 1px solid var(--surface-green-2);
	border-radius: 0.9rem;
	background: var(--surface-base);
	color: inherit;
	text-decoration: none;
	transition: border-color 160ms ease, box-shadow 160ms ease,
		transform 160ms ease;
}

.instructor-home__card:hover {
	border-color: var(--ink-green-4);
	box-shadow: 0 8px 22px color-mix(in srgb, var(--ink-green-8) 8%, transparent);
	transform: translateY(-2px);
}

.instructor-home__card-title {
	margin: 0 0 0.8rem;
	color: var(--ink-gray-8);
	font-size: 1rem;
	font-weight: 700;
	line-height: 1.4;
}

.instructor-home__card-details {
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
	margin-top: auto;
	color: var(--ink-gray-7);
	font-size: 0.875rem;
}

.instructor-home__detail {
	display: flex;
	align-items: flex-start;
	gap: 0.55rem;
}

.instructor-home__detail :deep(span:first-child) {
	flex-shrink: 0;
}

.instructor-home__description {
	margin: 0 0 1rem;
	color: var(--ink-gray-7);
	font-size: 0.9rem;
	line-height: 1.5;
}

.instructor-home__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.4rem;
}

.instructor-home__action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	padding: 0.45rem 0.7rem;
	border-radius: 0.5rem;
	background: var(--surface-green-1);
	color: var(--ink-green-8);
	font-size: 0.85rem;
	font-weight: 600;
	text-decoration: none;
}

.instructor-home__action:hover {
	background: var(--surface-green-2);
}

.instructor-home__ended {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--ink-amber-7);
}

.instructor-home__empty {
	display: flex;
	min-height: 15rem;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.6rem;
	margin-top: 2.5rem;
	padding: 2rem;
	border: 1px dashed var(--outline-green-3);
	border-radius: 1rem;
	background: var(--surface-base);
	text-align: center;
}

.instructor-home__empty p {
	max-width: 38rem;
	margin: 0;
	color: var(--ink-gray-7);
	line-height: 1.55;
}

@media (max-width: 640px) {
	.instructor-home__welcome {
		align-items: flex-start;
		flex-direction: column;
	}
}
</style>
