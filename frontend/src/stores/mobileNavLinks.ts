
import { call } from 'frappe-ui'
import { ref } from 'vue'
import { getSidebarLinks } from '@/utils'
import { useSettings } from '@/stores/settings'
import { isLinkEnabled, type NavLink } from '@/utils/mobileNav'

export interface MobileNavViewer {
	isSignedIn: boolean
	isModerator: boolean
	isInstructor: boolean
	isEvaluator: boolean
	hasUserInfo?: boolean
}

export const sidebarLinks = ref<NavLink[]>([])
export const otherLinks = ref<NavLink[]>([])

interface SidebarGroup {
	items?: NavLink[]
}

let latestRun = 0

const addLink = (
	links: NavLink[],
	label: string,
	icon: string,
	to = ''
): void => {
	if (links.some((link) => link.label === label)) return
	links.push({ label, icon, to })
}

const addLinkBefore = (
	links: NavLink[],
	label: string,
	icon: string,
	to: string,
	beforeLabel: string
): void => {
	if (links.some((link) => link.label === label)) return

	const index = links.findIndex((link) => link.label === beforeLabel)
	const newLink: NavLink = { label, icon, to }

	if (index === -1) {
		links.push(newLink)
	} else {
		links.splice(index, 0, newLink)
	}
}

const addSessionLinks = (
	links: NavLink[],
	viewer: MobileNavViewer
): void => {
	if (!viewer.isSignedIn) {
		addLink(links, 'Log in', 'LogIn')
		return
	}

	addLink(links, 'Notifications', 'Bell', 'Notifications')
	addLink(links, 'Profile', 'UserRound')
	addLink(links, 'Log out', 'LogOut')
}

/**
 * Rebuild both navigation lists for the current viewer.
 * Returns true only when this run successfully publishes the lists.
 */
export async function loadMobileNavLinks(
	viewer: MobileNavViewer
): Promise<boolean> {
	const run = ++latestRun
	const isCurrent = (): boolean => run === latestRun
	const { sidebarSettings, loadSidebarSettings } = useSettings()

	sidebarLinks.value = (getSidebarLinks(true) as SidebarGroup[])
		.flatMap((group) => group.items ?? [])

	await loadSidebarSettings()
	if (!isCurrent()) return false

	const visibility = sidebarSettings.data
	if (!visibility) return false

	const extras: NavLink[] = []

	if (viewer.isSignedIn) {
		if (viewer.isModerator) {
			// Place Programs immediately before Courses.
			addLinkBefore(
				sidebarLinks.value,
				'Programs',
				'GraduationCap',
				'Programs',
				'Courses'
			)
		} else {
			// Only show Programs to learners enrolled in a program.
			const programs = await call('lms.lms.utils.get_programs')
			if (!isCurrent()) return false

			const enrolled = programs?.enrolled ?? []

			if (enrolled.length > 0) {
				addLinkBefore(
					sidebarLinks.value,
					'Programs',
					'GraduationCap',
					'Programs',
					'Courses'
				)
			}
		}

		if (
			viewer.isModerator ||
			viewer.isInstructor ||
			viewer.isEvaluator
		) {
			addLink(extras, 'Quizzes', 'CircleHelp', 'Quizzes')
			addLink(extras, 'Assignments', 'ClipboardList', 'Assignments')
			addLink(
				extras,
				'Programming Exercises',
				'Code',
				'ProgrammingExercises'
			)
		}
	}

	addSessionLinks(extras, viewer)

	const isEnabled = (link: NavLink): boolean =>
		isLinkEnabled(link.label, visibility)

	sidebarLinks.value = sidebarLinks.value.filter(isEnabled)
	otherLinks.value = extras.filter(isEnabled)

	return true
}

const viewerKey = (viewer: MobileNavViewer): string =>
	[
		viewer.isSignedIn,
		viewer.isModerator,
		viewer.isInstructor,
		viewer.isEvaluator,
		viewer.hasUserInfo,
	]
		.map((flag) => (flag ? 1 : 0))
		.join('')

let loadedFor: string | null = null
let loaded: Promise<void> | null = null

/**
 * Reuse the load for the same viewer and allow retries after an unsuccessful
 * load or when a newer load supersedes the current one.
 */
export function ensureMobileNavLinks(
	viewer: MobileNavViewer
): Promise<void> {
	const key = viewerKey(viewer)

	if (loaded && loadedFor === key) return loaded

	const forget = (): void => {
		if (loadedFor !== key) return
		loadedFor = null
		loaded = null
	}

	loadedFor = key

	loaded = loadMobileNavLinks(viewer).then(
		(published) => {
			if (!published) forget()
		},
		() => {
			forget()
		}
	)

	return loaded
}
