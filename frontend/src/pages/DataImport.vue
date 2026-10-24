<template>
	<PageHeader :breadcrumbs="breadcrumbs" />
	<div class="data-import-host">
		<DataImportWizard
			:data-import="dataImport"
			:on-open-list="openList"
			:on-new-import="newImport"
			@open-record="openRecord"
			@open-imports="openImports"
		/>
	</div>
</template>
<script setup lang="ts">
import { usePageMeta } from 'frappe-ui'
import {
	DataImportWizard,
	useDataImport,
} from '@framework/ui/components/DataImport/index'
import PageHeader from '@/components/Layouts/pages/PageHeader.vue'
import type { Breadcrumb } from '@/types'
import { sessionStore } from '../stores/session'
import { useRoute, useRouter } from 'vue-router'
import { computed, inject, onMounted, ref, watch } from 'vue'

const { brand } = sessionStore()
const route = useRoute()
const router = useRouter()
const user = inject<any>('$user')

// Both route segments are single dynamic params (routes.js), never repeated â€”
// narrowed here because vue-router types every param as `string | string[]`
// and `@framework/ui`'s DataImport takes `string | null | undefined`.
const doctypeParam = computed(() =>
	Array.isArray(route.params.doctype)
		? route.params.doctype[0]
		: route.params.doctype
)
const importNameParam = computed(() =>
	Array.isArray(route.params.importName)
		? route.params.importName[0]
		: route.params.importName
)

onMounted(() => {
	if (!user.data?.is_moderator) {
		router.push({
			name: 'Courses',
		})
	}
})

const doctypeMap = {
	'LMS Course': {
		title: 'Courses',
		listRoute: '/courses',
		pageRoute: `/courses/docname`,
	},
	'LMS Batch': {
		title: 'Batches',
		listRoute: '/batches',
	},
	'LMS Category': {
		title: 'Categories',
		listRoute: '/lms',
	},
}

const importName = ref<string | null>(null)

watch(
	importNameParam,
	(value) => {
		importName.value = value ?? null
	},
	{ immediate: true }
)

const dataImport = useDataImport(importName, {
	doctype: doctypeParam,
})

function openList(doctype: string) {
	const destination = doctypeMap[doctype as keyof typeof doctypeMap]
	router.push(destination?.listRoute ?? '/data-import')
}

function newImport(doctype: string) {
	router.push({
		name: 'NewDataImport',
		params: { doctype },
	})
}

function openRecord(doctype: string, name: string) {
	const destination = doctypeMap[doctype as keyof typeof doctypeMap]
	if (destination?.pageRoute) {
		router.push(destination.pageRoute.replace('docname', name))
	} else {
		router.push(destination?.listRoute ?? '/data-import')
	}
}

function openImports(_doctype: string) {
	router.push({ name: 'DataImportList' })
}
// Named here rather than taken from the imported component: its own trail is
// internal state we cannot reach, and the page still needs a back link on a
// phone.
const breadcrumbs = computed<Breadcrumb[]>(() => {
	const crumbs: Breadcrumb[] = [
		{ label: __('Data Import'), route: { name: 'DataImportList' } },
	]
	if (route.params.importName) crumbs.push({ label: __('Import') })
	else if (route.params.doctype)
		crumbs.push({ label: String(route.params.doctype) })
	return crumbs
})

usePageMeta(() => {
	return {
		title: __('Data Import'),
		icon: brand.favicon,
	}
})
</script>

<style scoped>
/* frappe-ui's DataImport hard-codes its own sticky header (no slot, no prop to
   turn it off), so suppressing it here is the only way this page gets the
   app's header like every other page.

   Its step indicator is rendered twice, `hidden lg:flex` inside that header and
   a `lg:hidden` copy in the page below it. Hiding the header alone would
   therefore leave a desk with no steps at all, so the in-page copy (matched on
   the width class only it carries) is shown at every width instead. */
.data-import-host :deep(> header) {
	display: none;
}

.data-import-host :deep(.lg\:hidden.w-\[90\%\]) {
	display: flex;
}
</style>
