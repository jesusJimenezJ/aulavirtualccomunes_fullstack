<template>
	<main class="home-page">
		<header class="home-heading">
			<div class="home-heading__copy">
				<div class="home-heading__eyebrow">
					<span class="lucide-sparkles size-4" aria-hidden="true" />
					Ccomunes
				</div>

				<h1>¡Hola, {{ firstName }}!</h1>

				<p>
					{{
						isInstructor
							? 'Este es tu espacio para organizar y compartir tus cursos.'
							: 'Continúa aprendiendo a tu ritmo. Tus cursos te esperan.'
					}}
				</p>
			</div>

			<div class="home-heading__actions">
				<span class="home-heading__role">
					{{ isInstructor ? 'Espacio docente' : 'Espacio de estudiante' }}
				</span>

				<router-link :to="{ name: 'Courses' }" class="home-heading__link">
					{{ isInstructor ? 'Ver cursos' : 'Explorar cursos' }}
					<span class="lucide-arrow-up-right size-4" aria-hidden="true" />
				</router-link>
			</div>
		</header>

		<AdminHome
			v-if="isInstructor"
			:live-classes="adminLiveClasses"
			:evals="adminEvals"
		/>

		<StudentHome v-else :my-live-classes="myLiveClasses" />
	</main>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { createResource, usePageMeta } from 'frappe-ui'

import StudentHome from '@/pages/Home/StudentHome.vue'
import AdminHome from '@/pages/Home/AdminHome.vue'

const user = inject<any>('$user')

const isInstructor = computed(() =>
	Boolean(
		user?.data?.is_moderator ||
			user?.data?.is_instructor ||
			user?.data?.is_evaluator
	)
)

const firstName = computed(() => {
	const name = user?.data?.full_name?.trim()
	return name ? name.split(/\s+/)[0] : 'estudiante'
})

// Clases en vivo del estudiante
const myLiveClasses = createResource({
	url: 'lms.lms.api.get_my_live_classes',
	auto: true,
})

// Clases en vivo del docente
const adminLiveClasses = createResource({
	url: 'lms.lms.api.get_admin_live_classes',
	auto: true,
})

// Evaluaciones próximas del docente
const adminEvals = createResource({
	url: 'lms.lms.api.get_admin_evals',
	auto: true,
})

usePageMeta(() => ({
	title: __('Inicio'),
}))
</script>

<style scoped>
.home-page {
	width: 100%;
	max-width: 82rem;
	margin-inline: auto;
	padding: clamp(1rem, 2.4vw, 1.75rem);
}

.home-heading {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	overflow: hidden;
	margin-bottom: 1.75rem;
	padding: clamp(1.25rem, 3vw, 2rem);
	border: 1px solid #dce9e1;
	border-radius: 1.25rem;
	background: radial-gradient(
			ellipse at 95% 5%,
			rgba(240, 210, 178, 0.42),
			transparent 35%
		),
		linear-gradient(112deg, #edf5ef 0%, #f8f7f0 100%);
}

.home-heading__copy,
.home-heading__actions {
	position: relative;
	z-index: 1;
}

.home-heading__eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	margin-bottom: 0.7rem;
	color: #176b60;
	font-size: 0.75rem;
	font-weight: 750;
	letter-spacing: 0.09em;
	text-transform: uppercase;
}

.home-heading h1 {
	margin: 0;
	color: #18312e;
	font-size: clamp(1.65rem, 3vw, 2.35rem);
	font-weight: 750;
	letter-spacing: -0.045em;
	line-height: 1.15;
}

.home-heading p {
	max-width: 40rem;
	margin: 0.65rem 0 0;
	color: #5c6e67;
	font-size: 1rem;
	line-height: 1.6;
}

.home-heading__actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.8rem;
}

.home-heading__role {
	padding: 0.4rem 0.7rem;
	border: 1px solid rgba(23, 107, 96, 0.2);
	border-radius: 999px;
	background: rgba(255, 255, 255, 0.72);
	color: #176b60;
	font-size: 0.75rem;
	font-weight: 650;
	white-space: nowrap;
}

.home-heading__link {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.55rem;
	min-height: 2.75rem;
	padding: 0.65rem 1rem;
	border-radius: 0.75rem;
	background: #176b60;
	color: #fff;
	font-size: 0.875rem;
	font-weight: 700;
	text-decoration: none;
	transition: background-color 150ms ease, transform 150ms ease;
}

.home-heading__link:hover {
	transform: translateY(-1px);
	background: #123f3a;
}

.home-heading__link:focus-visible {
	outline: 3px solid #e9b989;
	outline-offset: 3px;
}

@media (max-width: 640px) {
	.home-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.home-heading__actions {
		align-items: flex-start;
	}
}
</style>
