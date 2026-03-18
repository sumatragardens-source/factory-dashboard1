export interface NavItem {
	label: string;
	href: string;
	icon: string;
}

export const NAV_ITEMS: NavItem[] = [
	{ label: 'Operations', href: '/operations', icon: 'activity' },
	{ label: 'Batches', href: '/batches', icon: 'layers' },
	{ label: 'Inventory', href: '/inventory', icon: 'package' },
	{ label: 'Machines', href: '/machines', icon: 'settings' },
	{ label: 'Batch Costing', href: '/batch-costing', icon: 'dollar-sign' },
	{ label: 'Solvent Economics', href: '/solvent-economics', icon: 'droplet' },
	{ label: 'Yield & Analytics', href: '/yield-analytics', icon: 'trending-up' },
	{ label: 'Deviations', href: '/deviations', icon: 'alert-triangle' },
	{ label: 'Lab Results', href: '/lab-results', icon: 'clipboard' },
	{ label: 'Admin', href: '/admin', icon: 'upload' }
];
