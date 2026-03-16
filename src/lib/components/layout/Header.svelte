<script lang="ts">
	interface Props {
		title?: string;
	}

	let { title = 'Operations' }: Props = $props();
</script>

<header class="h-16 border-b border-border-card bg-bg-card flex items-center justify-between px-6 shrink-0">
	<h2 class="text-lg font-bold text-text-primary">{title}</h2>

	<div class="flex items-center gap-4">
		<div class="relative flex items-center bg-bg-input rounded-lg px-3 py-1.5 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-text-muted text-xl mr-2">search</span>
			<input
				type="text"
				disabled
				placeholder="Search coming soon..."
				class="bg-transparent border-none focus:ring-0 text-xs w-48 placeholder:text-text-muted cursor-not-allowed"
			/>
		</div>

		<a href="/batches" class="bg-primary text-slate-900 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tighter flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">add_box</span>
			Create New Batch
		</a>

		<div class="h-8 w-px bg-border-card mx-1"></div>

		<button class="p-2 text-text-muted rounded-full relative opacity-50 cursor-not-allowed" disabled title="Coming soon">
			<span class="material-symbols-outlined">notifications</span>
		</button>

		<div class="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center text-text-secondary font-bold text-[10px]">SG</div>
	</div>
</header>
