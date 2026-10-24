<template>
	<div class="">
		<CollapsibleSection :label="__('Visibilidad')">
			<div class="flex flex-col gap-y-4">
				<BooleanSwitch
					size="sm"
					v-model="doc.upcoming"
					:label="__('Próximo')"
					:description="__('Las matrículas se abrirán en la fecha programada.')"
					@update:modelValue="markDirty()"
				/>
				<BooleanSwitch
					size="sm"
					v-model="selfEnrollment"
					:label="__('Permitir inscripción directa')"
					:description="
						__('Permitir que los estudiantes se inscriban directamente.')
					"
				/>
				<BooleanSwitch
					size="sm"
					v-model="doc.enforce_lesson_completion"
					:label="__('Requerir completar las lecciones')"
					:description="
						__(
							'Los estudiantes deben completar cada lección antes de abrir la siguiente.'
						)
					"
					@update:modelValue="markDirty()"
				/>
			</div>
		</CollapsibleSection>

		<CollapsibleSection :label="__('Matrícula y pago')">
			<div class="flex flex-col gap-y-4">
				<BooleanSwitch
					size="sm"
					:modelValue="Boolean(doc?.paid_course)"
					:label="__('Curso de pago')"
					:description="
						__('Cobrar una tarifa de matrícula para acceder al curso.')
					"
					@update:modelValue="setPaidCourse"
				/>
				<template v-if="doc?.paid_course">
					<Link
						v-model="doc.currency"
						doctype="Currency"
						:label="__('Moneda')"
						:filters="{ enabled: 1 }"
						:placeholder="__('Selecciona una moneda')"
						variant="outline"
						:required="true"
						@update:modelValue="markDirty()"
					/>
					<FormControl
						v-model="doc.course_price"
						type="number"
						min="0"
						:label="__('Precio del curso')"
						variant="outline"
						:required="true"
						@input="markDirty()"
					/>
				</template>
			</div>
		</CollapsibleSection>
	</div>

	<Dialog
		v-model:open="showPaymentsAppModal"
		:title="__('Se necesita la aplicación de pagos')"
		:actions="[
			{
				label: __('Instalar la aplicación de pagos'),
				variant: 'solid',
				onClick: ({ close }: any) => {
					openPaymentsApp()
					close()
				},
			},
		]"
	>
		<template #default>
			<p class="text-p-base text-ink-gray-7">
				{{
					__(
						'Para cobrar por un curso, instala la aplicación de pagos desde Frappe Marketplace y vuelve a activar esta opción.'
					)
				}}
			</p>
		</template>
	</Dialog>
</template>

<script setup lang="ts">
import { Dialog, FormControl } from 'frappe-ui'
import BooleanSwitch from '@/components/Controls/BooleanSwitch.vue'
import { computed, inject, ref } from 'vue'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import Link from '@/components/Controls/Link.vue'
import { useSettings } from '@/stores/settings'
import type { CourseFormContext } from '@/types'
import { openExternal } from '@/utils/openExternal'

const { resource, markDirty } = inject<CourseFormContext>('courseForm')!

const settingsStore = useSettings()
// Only block when we positively know the app is missing; if settings haven't
// loaded yet, let it through (the backend validation is the hard guard).
const paymentsAppMissing = computed<boolean>(
	() =>
		!!settingsStore.settings.data &&
		!settingsStore.settings.data.is_payments_app_installed
)

const doc = computed(() => resource.doc)
const showPaymentsAppModal = ref<boolean>(false)

const selfEnrollment = computed<boolean>({
	get: () => !resource.doc?.disable_self_learning,
	set: (val: boolean) => {
		if (!resource.doc) return
		resource.doc.disable_self_learning = val ? 0 : 1
		markDirty()
	},
})

function setPaidCourse(val: boolean) {
	if (!resource.doc) return
	if (val && paymentsAppMissing.value) {
		showPaymentsAppModal.value = true
		return
	}
	resource.doc.paid_course = val ? 1 : 0
	markDirty()
}

function openPaymentsApp() {
	openExternal('https://frappecloud.com/marketplace/apps/payments')
}
</script>
