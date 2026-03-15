<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import type { BatchState } from '$lib/constants/batchStates';

	let { data } = $props();

	let statusFilter = $state('All');
	const statuses = ['All', 'Draft', 'In Progress', 'Pending Review', 'Completed', 'Rejected'];

	const filteredBatches = $derived(
		statusFilter === 'All' ? data.batches : data.batches.filter((b: any) => b.status === statusFilter)
	);

	const statusDot: Record<string, string> = {
		Completed: 'bg-primary',
		'In Progress': 'bg-blue-500',
		'Pending Review': 'bg-amber-500',
		Rejected: 'bg-red-500',
		Draft: 'bg-slate-300'
	};
	const statusText: Record<string, string> = {
		Completed: 'text-primary',
		'In Progress': 'text-blue-600',
		'Pending Review': 'text-amber-600',
		Rejected: 'text-red-600',
		Draft: 'text-slate-400'
	};

	function daysSince(dateStr: string): number {
		return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
	}
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-slate-900">Batch Queue</h1>
			<p class="text-sm text-slate-500">Manage and track all extraction batches</p>
		</div>
		<a href="/batches?action=new" class="bg-primary text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 hover:brightness-105 transition-all">
			<span class="material-symbols-outlined text-sm">add_box</span>
			New Batch
		</a>
	</div>

	<!-- Status Filters -->
	<div class="flex gap-2 mb-4">
		{#each statuses as st}
			<button
				class="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors
					{statusFilter === st ? 'bg-primary/20 text-slate-900' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'}"
				onclick={() => statusFilter = st}
			>
				{st} {st === 'All' ? `(${data.batches.length})` : `(${data.batches.filter((b: any) => b.status === st).length})`}
			</button>
		{/each}
	</div>

	<!-- Batches Table -->
	<div class="bg-white border border-slate-200 rounded overflow-hidden">
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-slate-200 bg-slate-50">
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Batch #</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Current Stage</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Strain</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Leaf (kg)</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Operator</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Days</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Created</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredBatches as batch}
					<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer" onclick={() => { window.location.href = `/batches/${batch.id}` }}>
						<td class="px-4 py-3">
							<a href="/batches/{batch.id}" class="text-sm font-bold text-slate-900 hover:text-primary">{batch.batch_number}</a>
						</td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full {statusDot[batch.status as BatchState]}"></span>
								<span class="text-xs font-bold {statusText[batch.status as BatchState]}">{batch.status}</span>
							</div>
						</td>
						<td class="px-4 py-3 text-xs text-slate-600 max-w-48">{getStageName(batch.current_stage)}</td>
						<td class="px-4 py-3 text-xs text-slate-600">{batch.strain ?? '—'}</td>
						<td class="px-4 py-3 text-xs font-mono text-slate-600">{batch.leaf_input_kg}</td>
						<td class="px-4 py-3 text-xs text-slate-600">{batch.operator_name ?? '—'}</td>
						<td class="px-4 py-3 text-xs font-mono text-slate-600">{daysSince(batch.created_at)}d</td>
						<td class="px-4 py-3 text-xs text-slate-400 font-mono">{new Date(batch.created_at).toLocaleDateString()}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
