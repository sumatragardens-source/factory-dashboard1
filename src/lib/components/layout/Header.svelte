<script lang="ts">
	interface Props {
		title?: string;
	}

	let { title = 'Operations' }: Props = $props();
</script>

<header class="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
	<h2 class="text-lg font-bold text-slate-900">{title}</h2>

	<div class="flex items-center gap-4">
		<div class="relative flex items-center bg-slate-100 rounded-lg px-3 py-1.5">
			<span class="material-symbols-outlined text-slate-400 text-xl mr-2">search</span>
			<input
				type="text"
				placeholder="Search batches, lots, or lab results..."
				class="bg-transparent border-none focus:ring-0 text-xs w-48 placeholder:text-slate-400"
			/>
		</div>

		<button class="bg-primary text-slate-900 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-tighter flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">add_box</span>
			Create New Batch
		</button>

		<div class="h-8 w-px bg-slate-200 mx-1"></div>

		<button class="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
			<span class="material-symbols-outlined">notifications</span>
			<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
		</button>

		<div class="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center text-slate-700 font-bold text-[10px]">SG</div>
	</div>
</header>
