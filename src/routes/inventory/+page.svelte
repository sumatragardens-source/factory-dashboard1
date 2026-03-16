<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';

	let { data } = $props();

	function resolveStageRelevance(text: string): string {
		return text.replace(/Stage (\d)/g, (_, n) => getStageName(Number(n)));
	}
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-slate-900">Material Inventory & Traceability</h1>
			<p class="text-sm text-slate-500">Material stock levels across active extraction stages.</p>
		</div>
		<div class="flex gap-3">
			<button disabled title="Coming soon" class="bg-slate-900 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
				<span class="material-symbols-outlined text-sm">add</span>
				Record Material Receipt
			</button>
			<button disabled title="Coming soon" class="bg-primary/10 text-slate-900 border border-primary/30 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
				<span class="material-symbols-outlined text-sm">download</span>
				Export Log
			</button>
		</div>
	</div>

	<!-- Stock Table -->
	<div class="bg-white border border-slate-200 rounded overflow-hidden mb-8">
		<div class="px-6 py-3 border-b border-slate-200 flex justify-between items-center">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Stock Levels</h3>
			<span class="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">{data.materials.length} Tracked Materials</span>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-slate-200">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Material Name</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">On Hand</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Reorder Threshold</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Stage Relevance</th>
				</tr>
			</thead>
			<tbody>
				{#each data.materials as mat}
					{@const isBelowThreshold = mat.on_hand_qty <= mat.reorder_threshold}
					<tr class="border-b border-slate-100 hover:bg-slate-50">
						<td class="px-6 py-4 text-sm font-bold text-slate-900">{mat.name}</td>
						<td class="px-6 py-4">
							{#if isBelowThreshold}
								<span class="text-sm font-bold italic text-red-600">{mat.on_hand_qty} {mat.unit} <span class="text-red-500">▲</span></span>
							{:else}
								<span class="text-sm text-slate-900">{mat.on_hand_qty} {mat.unit}</span>
							{/if}
						</td>
						<td class="px-6 py-4">
							<span class="text-sm {isBelowThreshold ? 'bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold' : 'bg-slate-100 text-slate-600 px-2 py-0.5 rounded'}">{mat.reorder_threshold} {mat.unit}</span>
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
	<div class="bg-white border border-slate-200 rounded overflow-hidden">
		<div class="px-6 py-3 border-b border-slate-200 flex justify-between items-center">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-primary">Material Movement Log</h3>
			<button disabled title="Coming soon" class="text-[10px] text-primary font-bold uppercase opacity-50 cursor-not-allowed">View Full Log</button>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-slate-200">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Timestamp</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Activity</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Material / Batch</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary">Quantity</th>
				</tr>
			</thead>
			<tbody>
				{#each data.recentMovements as mv}
					{@const isPositive = ['Received', 'Recovered', 'Returned'].includes(mv.movement_type)}
					<tr class="border-b border-slate-100">
						<td class="px-6 py-3 text-xs text-slate-400 font-mono">{new Date(mv.created_at).toLocaleString()}</td>
						<td class="px-6 py-3">
							<span class="text-xs font-bold {mv.movement_type === 'Recovered' ? 'bg-primary/20 text-primary' : mv.movement_type === 'Issued' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded">{mv.movement_type}</span>
						</td>
						<td class="px-6 py-3 text-xs text-slate-600">{mv.material_name} {mv.batch_number ? `(Batch ${mv.batch_number})` : ''}</td>
						<td class="px-6 py-3 text-xs font-bold {isPositive ? 'text-primary' : 'text-slate-900'}">{isPositive ? '+' : '-'}{mv.quantity} {mv.unit}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
