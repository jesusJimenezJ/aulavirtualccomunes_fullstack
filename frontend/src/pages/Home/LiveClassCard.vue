<template>
	<div class="live-class">
		<div class="live-class__detail">
			<span class="lucide-calendar size-4" aria-hidden="true" />
			<span>{{ dayjs(cls.date).format('DD MMMM YYYY') }}</span>
		</div>

		<div class="live-class__detail">
			<span class="lucide-clock size-4" aria-hidden="true" />
			<span>
				{{ formatTime(cls.time) }} -
				{{ dayjs(getClassEnd(cls)).format('HH:mm') }}
			</span>
		</div>

		<div v-if="canAccessClass(cls)" class="live-class__actions">
			<a
				v-if="
					(user?.data?.is_moderator || user?.data?.is_evaluator) &&
					cls.start_url
				"
				:href="safeUrl(cls.start_url)"
				v-external
				class="live-class__button"
			>
				<span class="lucide-monitor size-4" aria-hidden="true" />
				Iniciar clase
			</a>

			<a
				v-if="cls.join_url"
				:href="safeUrl(cls.join_url)"
				v-external
				class="live-class__button"
			>
				<span class="lucide-video size-4" aria-hidden="true" />
				Unirme a la clase
			</a>
		</div>

		<Tooltip
			v-else-if="hasClassEnded(cls)"
			text="Esta clase ha finalizado"
			placement="right"
		>
			<div class="live-class__ended" :class="endedClass">
				<span class="lucide-info size-4" aria-hidden="true" />
				<span>Clase finalizada</span>
			</div>
		</Tooltip>

		<div v-else class="live-class__pending">
			<span class="lucide-clock size-4" aria-hidden="true" />
			<span>Clase programada</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { Tooltip } from 'frappe-ui'

import { formatTime } from '@/utils'
import { safeUrl } from '@/utils/safeUrl'

type LiveClassTiming = {
	date: string
	time: string
	duration: number
}

defineProps<{
	cls: LiveClassTiming & {
		start_url?: string
		join_url?: string
	}
	endedClass: string
}>()

const user = inject<any>('$user')
const dayjs = inject<any>('$dayjs')

const getClassEnd = (cls: LiveClassTiming) => {
	const classStart = new Date(`${cls.date}T${cls.time}`)
	return new Date(classStart.getTime() + (cls.duration || 0) * 60000)
}

const canAccessClass = (cls: LiveClassTiming) => {
	const now = dayjs()
	const start = dayjs(`${cls.date} ${cls.time}`)
	const end = dayjs(getClassEnd(cls))

	return now.isAfter(start.subtract(15, 'minutes')) && now.isBefore(end)
}

const hasClassEnded = (cls: LiveClassTiming) => new Date() > getClassEnd(cls)
</script>

<style scoped>
.live-class {
	display: flex;
	flex-direction: column;
	gap: 0.8rem;
	margin-top: auto;
	color: #5c6e67;
	font-size: 0.875rem;
}

.live-class__detail {
	display: flex;
	align-items: flex-start;
	gap: 0.55rem;
}

.live-class__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 0.35rem;
}

.live-class__button {
	display: inline-flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	gap: 0.45rem;
	padding: 0.6rem 0.75rem;
	border-radius: 0.55rem;
	background: #176b60;
	color: #fff;
	font-weight: 650;
	text-align: center;
	text-decoration: none;
	transition: background-color 150ms ease;
}

.live-class__button:hover {
	background: #123f3a;
}

.live-class__button:focus-visible {
	outline: 3px solid #e9b989;
	outline-offset: 3px;
}

.live-class__ended {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: #98651b;
}

.live-class__pending {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: #66736e;
}
</style>
