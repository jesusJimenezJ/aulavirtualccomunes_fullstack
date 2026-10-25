<template>
	<div class="student-home">
		<!-- Bienvenida -->
		<section class="student-home__welcome">
			<div>
				<span class="student-home__eyebrow">Ccomunes</span>
				<h2>Tu aprendizaje, en un solo lugar</h2>
				<p>
					Retoma tus cursos de Psicología Social Comunitaria y continúa con sus
					lecciones.
				</p>
			</div>

			<router-link :to="{ name: 'Courses' }" class="student-home__browse">
				Explorar cursos
				<span class="lucide-arrow-up-right size-4" aria-hidden="true" />
			</router-link>
		</section>

		<!-- Clases en vivo -->
		<section v-if="myLiveClasses?.data?.length" class="student-home__section">
			<h2 class="student-home__section-title">Mis próximas clases en vivo</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
				<article
					v-for="cls in myLiveClasses.data"
					:key="cls.name"
					class="student-home__card"
				>
					<h3 class="student-home__card-title">{{ cls.title }}</h3>

					<p v-if="cls.description" class="student-home__description">
						{{ cls.description }}
					</p>

					<div class="student-home__details">
						<div class="student-home__detail">
							<span class="lucide-calendar size-4" />
							<span>{{ dayjs(cls.date).format('DD MMMM YYYY') }}</span>
						</div>

						<div class="student-home__detail">
							<span class="lucide-clock size-4" />
							<span>
								{{ formatTime(cls.time) }}
								-
								{{ dayjs(getClassEnd(cls)).format('HH:mm') }}
							</span>
						</div>

						<a
							v-if="canAccessClass(cls) && cls.join_url"
							:href="safeUrl(cls.join_url)"
							v-external
							class="student-home__join"
						>
							<span class="lucide-video size-4" />
							Unirme a la clase
						</a>

						<div v-else-if="hasClassEnded(cls)" class="student-home__ended">
							<span class="lucide-info size-4" />
							Esta clase ha finalizado
						</div>

						<div v-else class="student-home__pending">
							<span class="lucide-clock size-4" />
							Clase programada
						</div>
					</div>
				</article>
			</div>
		</section>

		<!-- Cursos del estudiante -->
		<section v-if="myCourses.data?.length" class="student-home__section">
			<div class="flex items-center justify-between mb-3">
				<h2 class="font-semibold text-md text-ink-gray-9">
					{{
						myCourses.data[0].membership
							? __('Mis cursos')
							: __('Cursos destacados')
					}}
				</h2>

				<router-link :to="{ name: 'Courses' }">
					<span class="flex items-center gap-x-1 text-ink-gray-6 text-xs">
						Ver todos
						<span class="lucide-move-right size-3 rtl:rotate-180" />
					</span>
				</router-link>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
				<CourseCard
					v-for="course in myCourses.data"
					:key="course.name"
					:course="course"
					:to="{
						name: 'CourseDetail',
						params: { courseName: course.name },
					}"
				/>
			</div>
		</section>

		<!-- Grupos del estudiante -->
		<section v-if="myBatches.data?.length" class="student-home__section">
			<div class="flex items-center justify-between mb-3">
				<h2 class="student-home__section-title">Mis próximos grupos</h2>

				<router-link :to="{ name: 'Batches' }">
					<span class="flex items-center gap-x-1 text-ink-gray-6 text-xs">
						Ver todos
						<span class="lucide-move-right size-3 rtl:rotate-180" />
					</span>
				</router-link>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
				<router-link
					v-for="batch in myBatches.data"
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
	</div>
</template>

<script setup lang="ts">
import { createResource } from 'frappe-ui'
import { inject } from 'vue'

import { formatTime } from '@/utils'
import { safeUrl } from '@/utils/safeUrl'
import CourseCard from '@/components/CourseCard.vue'
import BatchCard from '@/pages/Batches/components/BatchCard.vue'

const dayjs = inject<any>('$dayjs')

const props = defineProps<{
	myLiveClasses?: {
		data?: any[]
	}
}>()

const myLiveClasses = props.myLiveClasses

const myCourses = createResource({
	url: 'lms.lms.api.get_my_courses',
	auto: true,
})

const myBatches = createResource({
	url: 'lms.lms.api.get_my_batches',
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
.student-home {
	padding-bottom: 2rem;
}

.student-home__welcome {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	margin-top: 1.5rem;
	padding: 1.5rem clamp(1.2rem, 3vw, 2rem);
	border: 1px solid var(--surface-green-2);
	border-radius: 1.15rem;
	background: linear-gradient(110deg, var(--surface-green-1), var(--surface-amber-1));
}

.student-home__eyebrow {
	color: var(--ink-green-7);
	font-size: 0.72rem;
	font-weight: 750;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.student-home__welcome h2 {
	margin: 0.4rem 0 0.35rem;
	color: var(--ink-base);
	font-size: clamp(1.3rem, 2.5vw, 1.8rem);
	font-weight: 750;
	letter-spacing: -0.03em;
}

.student-home__welcome p {
	max-width: 42rem;
	margin: 0;
	color: var(--ink-gray-7);
	line-height: 1.55;
}

.student-home__browse {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem 1rem;
	border-radius: 0.7rem;
	background: var(--ink-green-7);
	color: white;
	font-size: 0.85rem;
	font-weight: 700;
	text-decoration: none;
}

.student-home__browse:hover {
	background: var(--ink-green-8);
}

.student-home__section {
	margin-top: 2.5rem;
}

.student-home__section-title {
	margin-bottom: 0.85rem;
	color: var(--ink-gray-8);
	font-size: 1.1rem;
	font-weight: 700;
}

.student-home__card {
	display: flex;
	height: 100%;
	flex-direction: column;
	padding: 1rem;
	border: 1px solid var(--surface-green-2);
	border-radius: 0.9rem;
	background: var(--surface-base);
	transition: border-color 160ms ease, box-shadow 160ms ease,
		transform 160ms ease;
}

.student-home__card:hover {
	border-color: var(--ink-green-4);
	box-shadow: 0 8px 22px color-mix(in srgb, var(--ink-green-8) 8%, transparent);
	transform: translateY(-2px);
}

.student-home__card-title {
	margin: 0 0 0.8rem;
	color: var(--ink-gray-8);
	font-size: 1rem;
	font-weight: 700;
	line-height: 1.4;
}

.student-home__description {
	margin: 0 0 1rem;
	color: var(--ink-gray-7);
	font-size: 0.9rem;
	line-height: 1.5;
}

.student-home__details {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	margin-top: auto;
	color: var(--ink-gray-7);
	font-size: 0.875rem;
}

.student-home__detail {
	display: flex;
	align-items: flex-start;
	gap: 0.55rem;
}

.student-home__join {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.45rem;
	padding: 0.6rem 0.8rem;
	border-radius: 0.55rem;
	background: var(--ink-green-7);
	color: var(--surface-base);
	font-weight: 650;
	text-decoration: none;
}

.student-home__join:hover {
	background: var(--ink-green-8);
}

.student-home__ended {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	color: var(--ink-amber-7);
}

.student-home__pending {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	color: var(--ink-gray-7);
}

@media (max-width: 640px) {
	.student-home__welcome {
		align-items: flex-start;
		flex-direction: column;
	}
}
</style>
