<template>
	<Sidebar
		:collapsed="sidebarStore.isSidebarCollapsed"
		width="14rem"
		:ariaLabel="__('Main')"
		class="border-e"
		@update:collapsed="setCollapsed"
	>
		<UserDropdown />
		<div class="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
			<div v-if="sidebarSettings.data" class="flex flex-col gap-0.5">
				<template v-for="row in sidebarRows" :key="row.key">
					<div v-if="row.kind === 'gap'" class="h-2.5" aria-hidden="true" />
					<SidebarSection
						v-else-if="row.kind === 'accordion'"
						:label="__(row.label)"
						collapsible
						:collapsed="!sidebarStore.isGroupOpen(row.key)"
						@update:collapsed="sidebarStore.toggleGroup(row.key)"
					>
						<SidebarLink
							v-for="item in row.items"
							:key="item.key"
							:link="item.link"
						/>
					</SidebarSection>
					<SidebarLink v-else :link="row.link" />
				</template>
			</div>
		</div>
		<div class="mt-auto flex flex-col gap-1 px-2 pb-2">
			<div
				v-if="readOnlyMode && !sidebarStore.isSidebarCollapsed"
				class="z-10 m-2 bg-surface-elevation-2 py-2.5 px-3 text-p-xs text-ink-gray-7 rounded-5"
			>
				{{ readOnlyNotice }}
			</div>
			<template v-if="isStudent && !profileIsComplete">
				<SidebarItem
					v-if="sidebarStore.isSidebarCollapsed"
					:label="__('Completa tu perfil')"
					icon="lucide-user"
					:route="profileRoute"
					:active="false"
				/>
				<SidebarCard
					v-else
					:title="__('Completa tu perfil')"
					:description="
						__('Destaca lo que te hace único y muestra tus habilidades.')
					"
					icon="lucide-user"
					:action="{
						label: __('Mi perfil'),
						route: profileRoute,
						iconLeft: 'lucide-chevrons-right',
					}"
				/>
			</template>

			<SidebarCollapseToggle
				class="mt-1"
				:aria-label="
					sidebarStore.isSidebarCollapsed ? __('Expand') : __('Collapse')
				"
			/>
		</div>
	</Sidebar>
	<CommandPalette v-model="settingsStore.isCommandPaletteOpen" />
</template>

<script setup>
import { getSidebarLinks } from '@/utils'
import { usersStore } from '@/stores/user'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'
import {
	Sidebar,
	SidebarCard,
	SidebarCollapseToggle,
	SidebarItem,
	SidebarSection,
	Tooltip,
} from 'frappe-ui'
import { buildSidebarRows } from '@/utils/sidebarRows'
import { ref, onMounted, inject, watch, onUnmounted, computed } from 'vue'
import UserDropdown from '@/components/Sidebar/UserDropdown.vue'
import SidebarLink from '@/components/Sidebar/SidebarLink.vue'
import CommandPalette from '@/components/CommandPalette/CommandPalette.vue'
import {
	loadUnreadCount,
	unreadCount,
	unreadNotifications,
} from '@/stores/notifications'

const { userResource } = usersStore()
let sidebarStore = useSidebar()
const socket = inject('$socket')
const sidebarLinks = ref(null)
const { sidebarSettings, loadSidebarSettings } = useSettings()
const settingsStore = useSettings()
const readOnlyMode = window.read_only_mode
const readOnlyNotice = __(
	'El sitio está en mantenimiento. No podrás realizar cambios hasta que se restablezca el acceso.'
)
onMounted(() => {
	addKeyboardShortcut()
	updateSidebarLinks()
	loadUnreadCount()
	socket.on('publish_lms_notifications', () => {
		unreadNotifications.reload()
	})
})

// The count lives in stores/notifications now, so the badge follows it rather
// than being written from the resource's onSuccess.
watch(unreadCount, () => updateUnreadCount())

const sidebarRows = computed(() =>
	buildSidebarRows(sidebarLinks.value ?? [], sidebarSettings.data)
)

const onKeyboardShortcut = (e) => {
	if (
		e.key === 'k' &&
		(e.ctrlKey || e.metaKey) &&
		!e.repeat &&
		!e.target.classList.contains('ProseMirror')
	) {
		toggleCommandPalette()
		e.preventDefault()
	}
}

const addKeyboardShortcut = () => {
	window.addEventListener('keydown', onKeyboardShortcut)
}

const toggleCommandPalette = () => {
	settingsStore.isCommandPaletteOpen = !settingsStore.isCommandPaletteOpen
}

const updateUnreadCount = () => {
	sidebarLinks.value?.forEach((link) => {
		link.items.forEach((item) => {
			if (item.label === 'Notificaciones') {
				item.count = unreadCount.value || 0
			}
		})
	})
}

const setCollapsed = (collapsed) => {
	sidebarStore.isSidebarCollapsed = collapsed
	localStorage.setItem('isSidebarCollapsed', JSON.stringify(collapsed))
}

watch(userResource, async () => {
	await userResource.promise
	updateSidebarLinks()
})

watch(settingsStore.settings, () => {
	updateSidebarLinks()
})

watch(
	() => sidebarSettings.data,
	() => updateSidebarLinks(),
	{ deep: true }
)

const updateSidebarLinks = () => {
	sidebarLinks.value = getSidebarLinks()
	loadSidebarSettings()
	updateUnreadCount()
}

const isStudent = computed(() => {
	return userResource.data?.is_student
})

const profileRoute = computed(() => ({
	name: 'Profile',
	params: { username: userResource.data?.username },
}))

const profileIsComplete = computed(() => {
	return (
		userResource.data?.user_image &&
		userResource.data?.headline &&
		userResource.data?.bio
	)
})

onUnmounted(() => {
	socket.off('publish_lms_notifications')
	window.removeEventListener('keydown', onKeyboardShortcut)
})
</script>
