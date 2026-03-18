<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';

	let { data } = $props();

	function resolveStageRelevance(text: string): string {
		return text.replace(/Stage (\d)/g, (_, n) => getStageName(Number(n)));
	}
</script>

<div class="p-6">
	{#if data.materials.length === 0 && data.recentMovements.length === 0}
		<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
	{:else}
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-text-primary">Material Inventory & Traceability</h1>
			<p class="text-sm text-text-muted">Material stock levels across active extraction stages.</p>
		</div>
		<div class="flex gap-3">
			<button disabled title="Coming soon" class="bg-slate-900 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
				<span class="material-symbols-outlined text-sm">add</span>
				Record Material Receipt
			</button>
			<button disabled title="Coming soon" class="bg-primary/10 text-text-primary border border-primary/30 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
				<span class="material-symbols-outlined text-sm">download</span>
				Export Log
			</button>
		</div>
	</div>

	<!-- Stock Table -->
	<div class="bg-bg-card border border-border-card rounded overflow-hidden mb-8">
		<div class="px-6 py-3 border-b border-border-card flex justify-between items-center">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Current Stock Levels</h3>
			<span class="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">{data.materials.length} Tracked Materials</span>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-border-card">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Material Name</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">On Hand</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Reorder Threshold</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Stage Relevance</th>
				</tr>
			</thead>
			<tbody>
				{#each data.materials as mat}
					{@const isBelowThreshold = mat.on_hand_qty <= mat.reorder_threshold}
					<tr class="border-b border-border-subtle hover:bg-bg-card-hover">
						<td class="px-6 py-4 text-sm font-bold text-text-primary">{mat.name}</td>
						<td class="px-6 py-4">
							{#if isBelowThreshold}
								<span class="text-sm font-bold italic text-red-400">{mat.on_hand_qty} {mat.unit} <span class="text-red-500">▲</span></span>
							{:else}
								<span class="text-sm text-text-primary">{mat.on_hand_qty} {mat.unit}</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<span class="text-sm {isBelowThreshold ? 'bg-red-900/30 text-red-400 px-2 py-0.5 rounded font-bold' : 'bg-bg-input text-text-secondary px-2 py-0.5 rounded'}">{mat.reorder_threshold} {mat.unit}</span>
						</td>
						<td class="px-6 py-4">
							<span class="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded font-medium">{resolveStageRelevance(mat.stage_relevance ?? '')}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Recent Movements -->
	<div class="bg-bg-card border border-border-card rounded overflow-hidden">
		<div class="px-6 py-3 border-b border-border-card flex justify-between items-center">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-primary">Material Movement Log</h3>
			<button disabled title="Coming soon" class="text-[10px] text-primary font-bold uppercase opacity-50 cursor-not-allowed">View Full Log</button>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-border-card">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Timestamp</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Activity</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Material / Batch</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Quantity</th>
				</tr>
			</thead>
			<tbody>
				{#each data.recentMovements as mv}
					{@const isPositive = ['Received', 'Recovered', 'Returned'].includes(mv.movement_type)}
					<tr class="border-b border-border-subtle">
						<td class="px-6 py-3 text-xs text-text-muted font-mono">{new Date(mv.created_at).toLocaleString()}</td>
						<td class="px-6 py-3">
							<span class="text-xs font-bold {mv.movement_type === 'Recovered' ? 'bg-primary/20 text-primary' : mv.movement_type === 'Issued' ? 'bg-slate-900 text-white' : 'bg-bg-input text-text-secondary'} px-2 py-0.5 rounded">{mv.movement_type}</span>
						</td>
						<td class="px-6 py-3 text-xs text-text-secondary">{mv.material_name} {mv.batch_number ? `(Batch ${mv.batch_number})` : ''}</td>
						<td class="px-6 py-3 text-xs font-bold {isPositive ? 'text-primary' : 'text-text-primary'}">{isPositive ? '+' : '-'}{mv.quantity} {mv.unit}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{/if}
</div>
