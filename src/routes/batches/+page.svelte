<script lang="ts">
	import { getProcessStageName } from '$lib/constants/stageNames';
	import type { BatchState } from '$lib/constants/batchStates';

	let { data } = $props();

	let statusFilter = $state('All');
	let showNewForm = $state(false);
	const statuses = ['All', 'Draft', 'In Progress', 'Pending Review', 'Completed', 'Rejected'];
	const supplierOptions = ['Supplier A - Kalimantan', 'Supplier B - Kalimantan'];

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
		'In Progress': 'text-blue-400',
		'Pending Review': 'text-amber-400',
		Rejected: 'text-red-400',
		Draft: 'text-text-muted'
	};

	function daysSince(dateStr: string): number {
		return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
	}
</script>

<div class="p-6">
{#if data.batches && data.batches.length > 0}
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-text-primary">Batch Queue</h1>
			<p class="text-sm text-text-muted">Manage and track all extraction batches</p>
		</div>
		<button onclick={() => showNewForm = !showNewForm} class="bg-primary text-text-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 hover:brightness-105 transition-all">
			<span class="material-symbols-outlined text-sm">{showNewForm ? 'close' : 'add_box'}</span>
			{showNewForm ? 'Cancel' : 'New Batch'}
		</button>
	</div>

	<!-- New Batch Form -->
	{#if showNewForm}
		<form method="POST" action="?/create" class="bg-bg-card border border-primary/20 rounded p-6 mb-6">
			<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-lg">add_box</span>
				Create New Batch
			</h3>
			<div class="grid grid-cols-4 gap-4">
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-text-muted">Supplier</label>
					<select name="supplier" required class="w-full bg-bg-card-hover border-border-card rounded-lg text-sm focus:ring-primary">
						<option value="">Select supplier...</option>
						{#each supplierOptions as supplier}
							<option value={supplier}>{supplier}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-text-muted">Supplier Lot</label>
					<input name="supplier_lot" type="text" placeholder="e.g. LOT-01" class="w-full bg-bg-card-hover border-border-card rounded-lg text-sm focus:ring-primary" />
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-text-muted">Leaf Input (kg)</label>
					<input name="leaf_input_kg" type="number" step="0.1" min="0.1" required class="w-full bg-bg-card-hover border-border-card rounded-lg text-sm focus:ring-primary" />
				</div>
				<div class="space-y-1">
					<label class="text-[10px] font-bold uppercase text-text-muted">Operator</label>
					<input name="operator_name" type="text" required placeholder="e.g. Ahmad R." class="w-full bg-bg-card-hover border-border-card rounded-lg text-sm focus:ring-primary" />
				</div>
			</div>
			<div class="mt-4 flex justify-end">
				<button type="submit" class="bg-primary text-text-primary px-6 py-2 rounded font-bold text-xs uppercase tracking-widest hover:brightness-105 transition-all flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">check</span>
					Create Batch
				</button>
			</div>
		</form>
	{/if}

	<!-- Status Filters -->
	<div class="flex gap-2 mb-4">
		{#each statuses as st}
			<button
				class="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors
					{statusFilter === st ? 'bg-primary/20 text-text-primary' : 'bg-bg-card text-text-muted hover:bg-bg-card-hover border border-border-card'}"
				onclick={() => statusFilter = st}
			>
				{st} {st === 'All' ? `(${data.batches.length})` : `(${data.batches.filter((b: any) => b.status === st).length})`}
			</button>
		{/each}
	</div>

	<!-- Batches Table -->
	<div class="bg-bg-card border border-border-card rounded overflow-hidden">
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-border-card bg-bg-card-hover">
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Batch #</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Current Stage</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Supplier</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Leaf (kg)</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Operator</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Days</th>
					<th class="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Created</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredBatches as batch}
					<tr class="border-b border-border-subtle hover:bg-bg-card-hover transition-colors cursor-pointer" onclick={() => { window.location.href = `/batches/${batch.id}` }}>
						<td class="px-4 py-3">
							<a href="/batches/{batch.id}" class="text-sm font-bold text-text-primary hover:text-primary">{batch.batch_number}</a>
						</td>
						<td class="px-4 py-3">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full {statusDot[batch.status as BatchState]}"></span>
								<span class="text-xs font-bold {statusText[batch.status as BatchState]}">{batch.status}</span>
							</div>
						</td>
						<td class="px-4 py-3 text-xs text-text-secondary max-w-48">{getProcessStageName(batch.current_stage)}</td>
						<td class="px-4 py-3 text-xs text-text-secondary">{batch.supplier ?? '—'}</td>
						<td class="px-4 py-3 text-xs font-mono text-text-secondary">{batch.leaf_input_kg}</td>
						<td class="px-4 py-3 text-xs text-text-secondary">{batch.operator_name ?? '—'}</td>
						<td class="px-4 py-3 text-xs font-mono text-text-secondary">{daysSince(batch.created_at)}d</td>
						<td class="px-4 py-3 text-xs text-text-muted font-mono">{new Date(batch.created_at).toLocaleDateString()}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
{/if}
</div>
