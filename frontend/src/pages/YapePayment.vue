<script setup lang="ts">
import { computed, ref } from 'vue'
import { createResource } from 'frappe-ui'
import { useRoute } from 'vue-router'
import Uploader from '@/components/Controls/Uploader.vue'

const route = useRoute()

const paymentName = computed(() => String(route.params.paymentName || ''))
const operationNumber = ref('')
const receiptUrl = ref('')
const sending = ref(false)
const error = ref('')
const success = ref('')

const payment = createResource({
    url: 'lms.lms.yape.get_yape_payment',
    params: {
        payment_name: paymentName.value,
    },
    auto: true,
    onSuccess(data) {
        if (data.payment_method !== 'Yape') {
            error.value = 'Este registro no corresponde a un pago Yape.'
            return
        }
        if (data.payment_status === 'Approved' || data.payment_received) {
            error.value = 'Este pago ya fue aprobado.'
        }
    },
    onError() {
        error.value = 'No se pudo cargar el pago. Verifica tu sesión.'
    },
})


const amount = computed(() => {
    const data = payment.data
    if (!data) return ''
    const value = data.amount_with_gst || data.amount || 0
    return `${data.currency || 'PEN'} ${Number(value).toFixed(2)}`
})

const status = computed(() => payment.data?.payment_status || 'Cargando')


async function submitReceipt() {
    error.value = ''
    success.value = ''

    if (!operationNumber.value.trim()) {
        error.value = 'Ingresa el número de operación de Yape.'
        return
    }

    if (!receiptUrl.value) {
        error.value = 'Adjunta el comprobante de pago.'
        return
    }

    sending.value = true
    try {
        const result = await createResource({
            url: 'lms.lms.yape.submit_yape_receipt',
            params: {
                payment_name: paymentName.value,
                operation_number: operationNumber.value.trim(),
                receipt_url: receiptUrl.value,
            },
        }).submit()

        success.value = result.message || 'Comprobante enviado correctamente.'
        await payment.reload()
    } catch (e: any) {
        error.value = e?.messages?.[0] || e?.message || 'No se pudo enviar el comprobante.'
    } finally {
        sending.value = false
    }
}
</script>

<template>
    <div class="mx-auto max-w-3xl px-4 py-10">
        <div class="rounded-xl border bg-white p-6 shadow-sm">
            <h1 class="text-2xl font-semibold">Pago mediante Yape</h1>
            <p class="mt-2 text-gray-600">
                Realiza el pago y adjunta el comprobante para que sea verificado.
            </p>

            <div v-if="payment.loading" class="py-8 text-center">
                Cargando información del pago...
            </div>

            <div v-else-if="payment.data" class="mt-6 space-y-6">
                <div class="rounded-lg bg-gray-50 p-4">
                    <p class="text-sm text-gray-500">Código de pago</p>
                    <p class="font-semibold">{{ paymentName }}</p>
                    <p class="mt-3 text-sm text-gray-500">Importe</p>
                    <p class="text-2xl font-bold">{{ amount }}</p>
                    <p class="mt-3 text-sm text-gray-500">Estado</p>
                    <p class="font-medium">{{ status }}</p>
                </div>

                <div class="text-center">
                    <h2 class="text-lg font-semibold">Escanea el QR de Yape</h2>
                    <img
                        :src="`/assets/lms/images/PayYapeQR.jpeg`"
                        alt="Código QR para realizar el pago mediante Yape"
                        class="mx-auto mt-4 max-h-80 w-auto object-contain"
                    />
                    <p class="mt-3 text-sm text-gray-600">
                        Verifica el importe antes de confirmar la operación.
                    </p>
                </div>

                <div v-if="status === 'Pending'" class="space-y-4">
                    <div>
                        <label class="mb-2 block text-sm font-medium">
                            Número de operación
                        </label>
                        <input
                            v-model="operationNumber"
                            type="text"
                            class="w-full rounded-lg border px-3 py-2"
                            placeholder="Ingresa el número de operación"
                        />
                    </div>

                    <div>
                        <label class="mb-2 block text-sm font-medium">
                            Comprobante de Yape
                        </label>
                        <Uploader v-model="receiptUrl" :private="true" label="Comprobante de Yape" description="Sube una imagen del comprobante de pago." />
                    </div>

                    <button
                        class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
                        :disabled="sending || !receiptUrl"
                        @click="submitReceipt"
                    >
                        {{ sending ? 'Enviando...' : 'Enviar comprobante' }}
                    </button>
                </div>

                <div v-else-if="status === 'Submitted'" class="rounded-lg bg-amber-50 p-4 text-amber-800">
                    Tu comprobante fue enviado y está pendiente de verificación.
                </div>

                <div v-else-if="status === 'Approved'" class="rounded-lg bg-green-50 p-4 text-green-800">
                    Tu pago fue aprobado.
                </div>

                <div v-else-if="status === 'Rejected'" class="rounded-lg bg-red-50 p-4 text-red-800">
                    Tu pago fue rechazado. Contacta con el administrador.
                    <p v-if="payment.data.payment_admin_notes" class="mt-2">
                        Motivo: {{ payment.data.payment_admin_notes }}
                    </p>
                </div>
            </div>

            <div
                v-if="!payment.loading && !payment.data && !error"
                class="mt-4 rounded-lg bg-amber-50 p-3 text-amber-800"
            >
                No se recibió información del pago. Verifica el registro y vuelve a cargar la página.
            </div>

            <div v-if="error" class="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
                {{ error }}
            </div>
            <div v-if="success" class="mt-4 rounded-lg bg-green-50 p-3 text-green-700">
                {{ success }}
            </div>
        </div>
    </div>
</template>
