<script lang="ts">
	import { page } from '$app/state';
	import { NAV_ITEMS } from '$lib/constants/navigation';

	const iconMap: Record<string, string> = {
		activity: 'dashboard',
		layers: 'layers',
		package: 'inventory_2',
		settings: 'precision_manufacturing',
		'dollar-sign': 'payments',
		droplet: 'water_drop',
		'trending-up': 'trending_up',
		'alert-triangle': 'warning',
		clipboard: 'science'
	};
</script>

<aside class="w-16 border-r border-border-card bg-bg-card flex flex-col shrink-0 group/sidebar relative z-30">
	<!-- Hover target area -->
	<div class="p-3 flex items-center justify-center">
		<div class="h-6 w-6 rounded bg-border-card flex items-center justify-center">
			<span class="material-symbols-outlined text-text-muted text-[16px]">menu</span>
		</div>
	</div>

	<!-- Flyout nav panel - appears on sidebar hover -->
	<div
		class="absolute left-full top-0 w-56 h-full bg-bg-card border-r border-border-card flex-col opacity-0 pointer-events-none group-hover/sidebar:opacity-100 group-hover/sidebar:pointer-events-auto transition-opacity duration-200 shadow-xl shadow-black/30 z-40 hidden group-hover/sidebar:flex"
	>
		<!-- Logo + name -->
		<div class="p-5 border-b border-border-card">
			<h1 class="text-sm font-black tracking-tighter text-text-primary uppercase">Sumatra Gardens</h1>
			<p class="text-[9px] uppercase tracking-widest text-text-muted font-bold mt-0.5">Factory Operations</p>
		</div>

		<nav class="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
			{#each NAV_ITEMS as item}
				{@const isActive =
					page.url.pathname === item.href || (item.href !== '/operations' && page.url.pathname.startsWith(item.href))}
				<a
					href={item.href}
					class="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors
						{isActive ? 'bg-primary/20 text-text-primary font-semibold' : 'text-text-muted hover:bg-bg-card-hover'}"
				>
					<span class="material-symbols-outlined text-primary text-[18px]">{iconMap[item.icon] ?? 'circle'}</span>
					<span>{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="p-3 border-t border-border-card">
			<a
				href="/batches?action=new"
				class="w-full bg-primary text-bg-dark font-bold py-2 rounded text-xs tracking-widest hover:brightness-105 transition-all flex items-center justify-center gap-2 uppercase"
			>
				<span class="material-symbols-outlined text-sm">add_box</span>
				New Batch
			</a>
		</div>
	</div>
</aside>
