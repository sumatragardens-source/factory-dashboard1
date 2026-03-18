<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';

	let { data } = $props();

	const severityColors: Record<string, string> = {
		Critical: 'text-red-400 bg-red-900/20',
		High: 'text-orange-600 bg-orange-50',
		Medium: 'text-amber-400 bg-amber-900/20',
		Low: 'text-text-secondary bg-bg-input'
	};

	const statusColors: Record<string, string> = {
		Open: 'text-red-400 bg-red-900/20',
		'Under Review': 'text-amber-400 bg-amber-900/20',
		Resolved: 'text-primary bg-primary/10',
		Closed: 'text-text-muted bg-bg-input'
	};

	const severityDots: Record<string, string> = {
		Critical: 'bg-red-500',
		High: 'bg-orange-500',
		Medium: 'bg-amber-500',
		Low: 'bg-bg-input'
	};
</script>

<div class="p-6">
	{#if data.deviations.length === 0}
		<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
	{:else}
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-text-primary">Deviations</h1>
			<p class="text-sm text-text-muted">Non-conformance tracking and corrective actions</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary text-text-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">add</span>
			Report Deviation
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Total Deviations</p>
			<p class="text-2xl font-black text-text-primary">{data.totalCount}</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-red-500 font-bold">Open / Active</p>
			<p class="text-2xl font-black text-red-400">{data.openCount}</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">By Severity</p>
			<div class="flex gap-3 mt-2">
				{#each Object.entries(data.bySeverity) as [sev, count]}
					<div class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full {severityDots[sev]}"></span>
						<span class="text-xs font-bold text-text-secondary">{count}</span>
					</div>
				{/each}
			</div>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Resolution Rate</p>
			<p class="text-2xl font-black text-text-primary">
				{data.totalCount > 0 ? Math.round(((data.byStatus.Resolved + data.byStatus.Closed) / data.totalCount) * 100) : 0}%
			</p>
		</div>
	</div>

	<!-- Deviation Table -->
	<div class="bg-bg-card border border-border-card rounded overflow-hidden">
		<div class="px-6 py-4 border-b border-border-card flex items-center justify-between">
			<h3 class="text-sm font-black text-text-primary flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">warning</span>
				All Deviations
			</h3>
			<div class="flex gap-2">
				{#each ['All', 'Open', 'Resolved', 'Closed'] as filter}
					<button disabled title="Coming soon" class="text-[10px] font-bold uppercase px-3 py-1 rounded {filter === 'All' ? 'bg-primary/10 text-primary' : 'text-text-muted'} opacity-50 cursor-not-allowed">
						{filter}
					</button>
				{/each}
			</div>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-border-card">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Batch / Stage</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Deviation</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Parameter</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Expected</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Actual</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Severity</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center">Status</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Raised</th>
				</tr>
			</thead>
			<tbody>
				{#each data.deviations as dev}
					<tr class="border-b border-border-subtle hover:bg-bg-card-hover/50">
						<td class="px-6 py-3">
							<p class="text-sm font-bold text-text-primary">{dev.batch_number}</p>
							<p class="text-[10px] text-text-muted">{getStageName(dev.stage_number)}</p>
						</td>
						<td class="px-6 py-3">
							<p class="text-sm text-text-primary">{dev.deviation_type}</p>
							{#if dev.description}
								<p class="text-[10px] text-text-muted mt-0.5 max-w-xs truncate">{dev.description}</p>
							{/if}
						</td>
						<td class="px-6 py-3 text-sm text-text-secondary font-mono">{dev.parameter ?? '—'}</td>
						<td class="px-6 py-3 text-sm text-text-secondary text-center font-mono">{dev.expected_value ?? '—'}</td>
						<td class="px-6 py-3 text-sm font-bold text-center font-mono {dev.severity === 'Critical' ? 'text-red-400' : 'text-text-primary'}">{dev.actual_value ?? '—'}</td>
						<td class="px-6 py-3 text-center">
							<span class="text-[10px] font-bold uppercase px-2 py-1 rounded {severityColors[dev.severity]}">{dev.severity}</span>
						</td>
						<td class="px-6 py-3 text-center">
							<span class="text-[10px] font-bold uppercase px-2 py-1 rounded {statusColors[dev.status]}">{dev.status}</span>
						</td>
						<td class="px-6 py-3">
							<p class="text-xs text-text-secondary">{dev.raised_by ?? '—'}</p>
							<p class="text-[10px] text-text-muted font-mono">{new Date(dev.created_at).toLocaleDateString()}</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Bottom row: Root Cause + Corrective Actions for resolved -->
	{#if data.deviations.some((d: any) => d.root_cause || d.corrective_action)}
		<div class="mt-6 grid grid-cols-2 gap-6">
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">search</span>
					Root Cause Analysis
				</h3>
				<div class="space-y-4">
					{#each data.deviations.filter((d: any) => d.root_cause) as dev}
						<div class="border-l-2 border-primary pl-3">
							<p class="text-xs font-bold text-text-primary">{dev.batch_number} · {getStageName(dev.stage_number)}</p>
							<p class="text-xs text-text-secondary mt-1">{dev.root_cause}</p>
						</div>
					{/each}
				</div>
			</div>
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">build</span>
					Corrective Actions
				</h3>
				<div class="space-y-4">
					{#each data.deviations.filter((d: any) => d.corrective_action) as dev}
						<div class="border-l-2 border-primary pl-3">
							<p class="text-xs font-bold text-text-primary">{dev.batch_number} · {dev.deviation_type}</p>
							<p class="text-xs text-text-secondary mt-1">{dev.corrective_action}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
	{/if}
</div>
