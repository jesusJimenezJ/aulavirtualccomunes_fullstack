<template>
	<Dialog v-model:open="show" :title="'Constancia de aprendizaje'">
		<template #default>
			<div class="streak-dialog">
				<div class="streak-dialog__hero">
					<div class="streak-dialog__fire">🔥</div>

					<div class="streak-dialog__message">
						<div class="streak-dialog__eyebrow">
							{{
								streakInfo.data?.current_streak < 1
									? '¡Hoy es un buen día para comenzar!'
									: streakInfo.data?.current_streak < 10
									? '¡Sigue avanzando!'
									: '¡Vas excelente!'
							}}
						</div>

						<div class="streak-dialog__count">
							{{ streakInfo.data?.current_streak ?? 0 }}
							{{
								streakInfo.data?.current_streak === 1
									? 'día seguido'
									: 'días seguidos'
							}}
						</div>

						<p>Cada día que dedicas a aprender te acerca a tus objetivos.</p>
					</div>
				</div>

				<div class="streak-dialog__stats">
					<div class="streak-dialog__stat">
						<span class="streak-dialog__label">Racha actual</span>
						<strong>
							{{ streakInfo.data?.current_streak ?? 0 }}
							{{ streakInfo.data?.current_streak === 1 ? 'día' : 'días' }}
						</strong>
					</div>

					<div class="streak-dialog__stat">
						<span class="streak-dialog__label">Racha más larga</span>
						<strong>
							{{ streakInfo.data?.longest_streak ?? 0 }}
							{{ streakInfo.data?.longest_streak === 1 ? 'día' : 'días' }}
						</strong>
					</div>
				</div>

				<div class="streak-dialog__tip">
					<span class="lucide-lightbulb size-5" aria-hidden="true" />
					<p>
						Tu racha registra los días consecutivos en los que mantienes tu
						aprendizaje, ya sea mediante lecciones, cuestionarios o tareas.
						¡Continúa practicando y construye el hábito de aprender!
					</p>
				</div>
			</div>
		</template>
	</Dialog>
</template>

<script setup lang="ts">
import { Dialog } from 'frappe-ui'

const show = defineModel<boolean>({
	default: false,
})

defineProps<{
	streakInfo: {
		data?: {
			current_streak: number
			longest_streak: number
		}
	}
}>()
</script>

<style scoped>
.streak-dialog {
	padding: 0.25rem 0;
	color: #263d36;
}

.streak-dialog__hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 1.5rem 1rem;
	border: 1px solid #dce8e0;
	border-radius: 1rem;
	background: linear-gradient(135deg, #edf5ef, #f8f2e8);
	text-align: center;
}

.streak-dialog__fire {
	font-size: 2.5rem;
	line-height: 1.2;
}

.streak-dialog__message {
	margin-top: 1rem;
}

.streak-dialog__eyebrow {
	color: #176b60;
	font-size: 0.9rem;
	font-weight: 700;
}

.streak-dialog__count {
	margin-top: 0.5rem;
	color: #18312e;
	font-size: clamp(1.5rem, 5vw, 2rem);
	font-weight: 800;
	letter-spacing: -0.035em;
}

.streak-dialog__message p {
	max-width: 25rem;
	margin: 0.65rem auto 0;
	color: #5c6e67;
	font-size: 0.9rem;
	line-height: 1.6;
}

.streak-dialog__stats {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
	margin-top: 1rem;
}

.streak-dialog__stat {
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
	padding: 1rem;
	border: 1px solid #dce8e0;
	border-radius: 0.85rem;
	background: #fff;
}

.streak-dialog__label {
	color: #66736e;
	font-size: 0.85rem;
}

.streak-dialog__stat strong {
	color: #176b60;
	font-size: 1.15rem;
	font-weight: 750;
}

.streak-dialog__tip {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	margin-top: 1rem;
	padding: 1rem;
	border: 1px solid #e7dcc8;
	border-radius: 0.85rem;
	background: #fcf8f0;
	color: #5c6e67;
}

.streak-dialog__tip :deep(.lucide-lightbulb) {
	flex-shrink: 0;
	color: #a8752e;
}

.streak-dialog__tip p {
	margin: 0;
	font-size: 0.85rem;
	line-height: 1.65;
}

@media (max-width: 420px) {
	.streak-dialog__stats {
		grid-template-columns: 1fr;
	}
}
</style>
