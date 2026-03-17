<script lang="ts">
	interface Props {
		title?: string;
	}

	let { title = 'Operations' }: Props = $props();
</script>

<header class="h-14 border-b border-border-card bg-bg-card flex items-center justify-between px-6 shrink-0">
	<a href="/operations" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
		<div class="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
			<i class="fa-solid fa-leaf text-bg-dark text-xs"></i>
		</div>
		<div class="flex items-center gap-2">
			<h1 class="text-sm font-black tracking-tight text-text-primary uppercase">Sumatra Gardens</h1>
			<span class="text-text-muted">|</span>
			<span class="text-sm font-bold text-text-secondary uppercase tracking-wide">Ops-Command</span>
		</div>
	</a>

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

			<button class="p-1.5 text-text-muted rounded-full relative opacity-50 cursor-not-allowed" disabled title="Coming soon">
				<span class="material-symbols-outlined text-[20px]">notifications</span>
			</button>

			<div class="h-8 w-8 rounded-full bg-border-card flex items-center justify-center text-text-secondary font-bold text-[10px] border border-border-subtle">SG</div>
		</div>
	</div>
</header>
