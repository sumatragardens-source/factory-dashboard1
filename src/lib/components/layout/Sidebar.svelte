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

<aside class="w-64 border-r border-border-card bg-bg-card flex flex-col shrink-0">
	<div class="p-6 border-b border-border-card">
		<h1 class="text-lg font-black tracking-tighter text-text-primary flex items-center gap-2">
			<span class="material-symbols-outlined text-primary">eco</span>
			SUMATRA GARDENS
		</h1>
		<p class="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-1">Factory Operations</p>
	</div>

	<nav class="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
		{#each NAV_ITEMS as item}
			{@const isActive = page.url.pathname === item.href || (item.href !== '/operations' && page.url.pathname.startsWith(item.href))}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors
					{isActive
						? 'bg-primary/20 text-text-primary font-semibold'
						: 'text-text-muted hover:bg-bg-card-hover'}"
			>
				<span class="material-symbols-outlined text-primary">{iconMap[item.icon] ?? 'circle'}</span>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>

	<div class="p-4 border-t border-border-card">
		<a
			href="/batches?action=new"
			class="w-full bg-primary text-white font-bold py-2 rounded text-xs tracking-widest hover:brightness-105 transition-all flex items-center justify-center gap-2 uppercase"
		>
			<span class="material-symbols-outlined text-sm">add_box</span>
			New Batch
		</a>
	</div>
</aside>
