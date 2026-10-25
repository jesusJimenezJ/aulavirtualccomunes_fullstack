
import { isLinkEnabled, type SidebarVisibility } from '@/utils/mobileNav'

export interface Category {
	id: string
	label: string
	icon: string
	listRoute: string
}

export const CATEGORIES: Category[] = [
	{
		id: 'courses',
		label: 'Courses',
		icon: 'lucide-book-open',
		listRoute: 'Courses',
	},
	{
		id: 'batches',
		label: 'Batches',
		icon: 'lucide-users',
		listRoute: 'Batches',
	},
	{
		id: 'jobs',
		label: 'Jobs',
		icon: 'lucide-briefcase',
		listRoute: 'Jobs',
	},
	{
		id: 'programs',
		label: 'Programs',
		icon: 'lucide-route',
		listRoute: 'Programs',
	},
	{
		id: 'quizzes',
		label: 'Quizzes',
		icon: 'lucide-circle-help',
		listRoute: 'Quizzes',
	},
	{
		id: 'assignments',
		label: 'Assignments',
		icon: 'lucide-pencil',
		listRoute: 'Assignments',
	},
]

interface SidebarItem {
	to?: string
}

interface SidebarGroup {
	items: SidebarItem[]
}

function offeredRoutes(sidebarLinks: SidebarGroup[]): Set<string | undefined> {
	return new Set(
		(sidebarLinks ?? [])
			.flatMap((group) => group.items ?? [])
			.map((item) => item.to),
	)
}

export function visibleCategories(
	sidebarLinks: SidebarGroup[],
	visibility?: SidebarVisibility,
): Category[] {
	const offered = offeredRoutes(sidebarLinks)

	return CATEGORIES.filter(
		(category) =>
			offered.has(category.listRoute) &&
			isLinkEnabled(category.label, visibility),
	)
}

export function categoryById(
	id: string | null,
): Category | undefined {
	return CATEGORIES.find((category) => category.id === id)
}

export interface NavTarget {
	id: string
	label: string
	icon: string
	route: string
}

export const NAV_TARGETS: NavTarget[] = [
	{
		id: 'home',
		label: 'Home',
		icon: 'lucide-home',
		route: 'Home',
	},
	{
		id: 'statistics',
		label: 'Statistics',
		icon: 'lucide-chart-no-axes-column',
		route: 'Statistics',
	},
	{
		id: 'certifications',
		label: 'Certifications',
		icon: 'lucide-award',
		route: 'CertifiedParticipants',
	},
	{
		id: 'programming-exercises',
		label: 'Programming Exercises',
		icon: 'lucide-code',
		route: 'ProgrammingExercises',
	},
]

export function visibleNavTargets(
	sidebarLinks: SidebarGroup[],
	visibility?: SidebarVisibility,
): NavTarget[] {
	const offered = offeredRoutes(sidebarLinks)

	return NAV_TARGETS.filter(
		(target) =>
			offered.has(target.route) &&
			isLinkEnabled(target.label, visibility),
	)
}

