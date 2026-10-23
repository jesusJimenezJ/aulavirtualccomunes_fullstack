import { isLinkEnabled, type SidebarVisibility } from '@/utils/mobileNav'

export interface Category {
	/** Sent to search_sqlite, which maps it to a doctype; never a doctype here. */
	id: string
	label: string
	/** A generated `lucide-*` class, the way the rest of the app names icons. */
	icon: string
	/** The category's own list page, and the sidebar entry it is gated by. */
	listRoute: string
}

/**
 * Course, evaluation and assignment search follow the same visibility rules as
 * the navigation, so the command palette cannot expose a module outside the
 * project's requirements.
 */
export const CATEGORIES: Category[] = [
	{
		id: 'courses',
		label: 'Courses',
		icon: 'lucide-book-open',
		listRoute: 'Courses',
	},	{
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
			.map((item) => item.to)
	)
}

/**
 * Categories whose page this user is being offered in the sidebar.
 *
 * `getSidebarLinks()` is only half of what the sidebar draws: AppSidebar filters
 * its result again against `get_sidebar_settings`, the per-site on/off flags, so
 * reading the first half alone offered a Jobs row on a site with Jobs switched
 * off. `isLinkEnabled` is the phone bar's reading of those same flags, and the
 * same label-to-key convention AppSidebar filters by.
 */
export function visibleCategories(
	sidebarLinks: SidebarGroup[],
	visibility?: SidebarVisibility
): Category[] {
	const offered = offeredRoutes(sidebarLinks)
	return CATEGORIES.filter(
		(category) =>
			offered.has(category.listRoute) &&
			isLinkEnabled(category.label, visibility)
	)
}

export function categoryById(id: string | null): Category | undefined {
	if (!id) return undefined
	return CATEGORIES.find((category) => category.id === id)
}

export interface NavTarget {
	id: string
	label: string
	/** A generated `lucide-*` class, the way the rest of the app names icons. */
	icon: string
	/** Route name. Selecting the row goes straight here. */
	route: string
}

/**
 * Sidebar pages with no records behind them, so there is nothing to scope a
 * search to — the row navigates instead of drilling in.
 *
 * Listed by hand rather than derived from the sidebar, because a sidebar `to`
 * is not always a route name: Contact Us carries a URL or a mailto address,
 * and pushing either as a route name lands nowhere.
 */
export const NAV_TARGETS: NavTarget[] = [
	{ id: 'home', label: 'Home', icon: 'lucide-home', route: 'Home' },
]

/** Nav targets whose page this user is being offered in the sidebar. */
export function visibleNavTargets(
	sidebarLinks: SidebarGroup[],
	visibility?: SidebarVisibility
): NavTarget[] {
	const offered = offeredRoutes(sidebarLinks)
	return NAV_TARGETS.filter(
		(target) =>
			offered.has(target.route) && isLinkEnabled(target.label, visibility)
	)
}
