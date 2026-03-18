<script lang="ts">
	import { page } from '$app/state';
	import { NAV_ITEMS } from '$lib/constants/navigation';

	interface Props {
		title?: string;
		alertCounts?: { high: number; medium: number; low: number; total: number };
	}

	let { title = 'Operations', alertCounts }: Props = $props();

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

<header class="h-14 border-b border-border-card bg-bg-card flex items-center justify-between px-6 shrink-0">
	<div class="flex items-center gap-3">
		<!-- Leaf icon with nav flyout on hover -->
		<div class="group/nav relative">
			<a href="/operations" class="h-7 w-7 rounded-md bg-primary flex items-center justify-center cursor-pointer">
				<i class="fa-solid fa-leaf text-bg-dark text-xs"></i>
			</a>
			<!-- Flyout nav panel -->
			<div class="absolute left-0 top-full mt-1 w-56 bg-bg-card border border-border-card rounded-xl flex-col shadow-xl shadow-black/30 z-50 opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto transition-opacity duration-200 hidden group-hover/nav:flex">
				<div class="p-4 border-b border-border-card">
					<h1 class="text-sm font-black tracking-tighter text-text-primary uppercase">Sumatra Gardens</h1>
					<p class="text-[9px] uppercase tracking-widest text-text-muted font-bold mt-0.5">Factory Operations</p>
				</div>
				<nav class="flex-1 p-3 space-y-0.5 overflow-y-auto no-scrollbar">
					{#each NAV_ITEMS as item}
						{@const isActive = page.url.pathname === item.href || (item.href !== '/operations' && page.url.pathname.startsWith(item.href))}
						<a
							href={item.href}
							class="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors
								{isActive
									? 'bg-primary/20 text-text-primary font-semibold'
									: 'text-text-muted hover:bg-bg-card-hover'}"
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
		</div>

		<div class="flex items-center gap-2">
			<h1 class="text-sm font-black tracking-tight text-text-primary uppercase">Sumatra Gardens</h1>
			<span class="text-text-muted">|</span>
			<span class="text-sm font-bold text-text-secondary uppercase tracking-wide">Dashboard</span>
		</div>
	</div>

	<div class="flex items-center gap-6">
		<!-- System status -->
		<div class="flex items-center gap-2">
			<div class="h-2 w-2 rounded-full bg-primary"></div>
			<span class="text-[10px] font-bold text-text-muted uppercase">System: Nominal</span>
		</div>

		<div class="flex items-center gap-4">
			<a href="/batches" class="bg-primary text-bg-dark px-4 py-1.5 rounded font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
				<span class="material-symbols-outlined text-sm">add_box</span>
				Create New Batch
			</a>

			<a href="/operations" class="p-1.5 text-text-muted rounded-full relative hover:text-text-primary transition-colors" title="{alertCounts?.total ?? 0} active alerts">
				<span class="material-symbols-outlined text-[20px]">notifications</span>
				{#if alertCounts && alertCounts.total > 0}
					<span class="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full {alertCounts.high > 0 ? 'bg-red-500' : 'bg-amber-500'} text-[9px] font-black text-white flex items-center justify-center px-1">{alertCounts.total}</span>
				{/if}
			</a>

			<form method="POST" action="/api/auth/logout">
				<button type="submit" class="p-1.5 text-text-muted hover:text-red-400 rounded-full transition-colors" title="Sign out">
					<span class="material-symbols-outlined text-[20px]">logout</span>
				</button>
			</form>

			<div class="h-8 w-8 rounded-full bg-border-card flex items-center justify-center text-text-secondary font-bold text-[10px] border border-border-subtle">SG</div>
		</div>
	</div>
</header>
