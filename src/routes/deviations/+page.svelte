<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';

	let { data } = $props();

	const severityColors: Record<string, string> = {
		Critical: 'text-red-600 bg-red-50',
		High: 'text-orange-600 bg-orange-50',
		Medium: 'text-amber-600 bg-amber-50',
		Low: 'text-slate-600 bg-slate-100'
	};

	const statusColors: Record<string, string> = {
		Open: 'text-red-600 bg-red-50',
		'Under Review': 'text-amber-600 bg-amber-50',
		Resolved: 'text-primary bg-primary/10',
		Closed: 'text-slate-500 bg-slate-100'
	};

	const severityDots: Record<string, string> = {
		Critical: 'bg-red-500',
		High: 'bg-orange-500',
		Medium: 'bg-amber-500',
		Low: 'bg-slate-400'
	};
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-slate-900">Deviations</h1>
			<p class="text-sm text-slate-500">Non-conformance tracking and corrective actions</p>
		</div>
		<button class="bg-primary text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">add</span>
			Report Deviation
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Total Deviations</p>
			<p class="text-2xl font-black text-slate-900">{data.totalCount}</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-red-500 font-bold">Open / Active</p>
			<p class="text-2xl font-black text-red-600">{data.openCount}</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">By Severity</p>
			<div class="flex gap-3 mt-2">
				{#each Object.entries(data.bySeverity) as [sev, count]}
					<div class="flex items-center gap-1">
						<span class="w-2 h-2 rounded-full {severityDots[sev]}"></span>
						<span class="text-xs font-bold text-slate-700">{count}</span>
					</div>
				{/each}
			</div>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Resolution Rate</p>
			<p class="text-2xl font-black text-slate-900">
				{data.totalCount > 0 ? Math.round(((data.byStatus.Resolved + data.byStatus.Closed) / data.totalCount) * 100) : 0}%
			</p>
		</div>
	</div>

	<!-- Deviation Table -->
	<div class="bg-white border border-slate-200 rounded overflow-hidden">
		<div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
			<h3 class="text-sm font-black text-slate-900 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">warning</span>
				All Deviations
			</h3>
			<div class="flex gap-2">
				{#each ['All', 'Open', 'Resolved', 'Closed'] as filter}
					<button class="text-[10px] font-bold uppercase px-3 py-1 rounded {filter === 'All' ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-50'}">
						{filter}
					</button>
				{/each}
			</div>
		</div>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-slate-200">
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Batch / Stage</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Deviation</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Parameter</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Expected</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Actual</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Severity</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
					<th class="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Raised</th>
				</tr>
			</thead>
			<tbody>
				{#each data.deviations as dev}
					<tr class="border-b border-slate-100 hover:bg-slate-50/50">
						<td class="px-6 py-3">
							<p class="text-sm font-bold text-slate-900">{dev.batch_number}</p>
							<p class="text-[10px] text-slate-500">Stage {dev.stage_number}: {getStageName(dev.stage_number)}</p>
						</td>
						<td class="px-6 py-3">
							<p class="text-sm text-slate-900">{dev.deviation_type}</p>
							{#if dev.description}
								<p class="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{dev.description}</p>
							{/if}
						</td>
						<td class="px-6 py-3 text-sm text-slate-600 font-mono">{dev.parameter ?? '—'}</td>
						<td class="px-6 py-3 text-sm text-slate-600 text-center font-mono">{dev.expected_value ?? '—'}</td>
						<td class="px-6 py-3 text-sm font-bold text-center font-mono {dev.severity === 'Critical' ? 'text-red-600' : 'text-slate-900'}">{dev.actual_value ?? '—'}</td>
						<td class="px-6 py-3 text-center">
							<span class="text-[10px] font-bold uppercase px-2 py-1 rounded {severityColors[dev.severity]}">{dev.severity}</span>
						</td>
						<td class="px-6 py-3 text-center">
							<span class="text-[10px] font-bold uppercase px-2 py-1 rounded {statusColors[dev.status]}">{dev.status}</span>
						</td>
						<td class="px-6 py-3">
							<p class="text-xs text-slate-600">{dev.raised_by ?? '—'}</p>
							<p class="text-[10px] text-slate-400 font-mono">{new Date(dev.created_at).toLocaleDateString()}</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Bottom row: Root Cause + Corrective Actions for resolved -->
	{#if data.deviations.some((d: any) => d.root_cause || d.corrective_action)}
		<div class="mt-6 grid grid-cols-2 gap-6">
			<div class="bg-white border border-slate-200 rounded p-6">
				<h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">search</span>
					Root Cause Analysis
				</h3>
				<div class="space-y-4">
					{#each data.deviations.filter((d: any) => d.root_cause) as dev}
						<div class="border-l-2 border-primary pl-3">
							<p class="text-xs font-bold text-slate-900">{dev.batch_number} · Stage {dev.stage_number}</p>
							<p class="text-xs text-slate-600 mt-1">{dev.root_cause}</p>
						</div>
					{/each}
				</div>
			</div>
			<div class="bg-white border border-slate-200 rounded p-6">
				<h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">build</span>
					Corrective Actions
				</h3>
				<div class="space-y-4">
					{#each data.deviations.filter((d: any) => d.corrective_action) as dev}
						<div class="border-l-2 border-primary pl-3">
							<p class="text-xs font-bold text-slate-900">{dev.batch_number} · {dev.deviation_type}</p>
							<p class="text-xs text-slate-600 mt-1">{dev.corrective_action}</p>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
