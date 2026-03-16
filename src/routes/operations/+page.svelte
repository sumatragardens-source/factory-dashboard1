<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function resolveStageRelevance(text: string): string {
		return text.replace(/Stage (\d)/g, (_, n) => getStageName(Number(n)));
	}

	const totalBatches = Object.values(data.statusCounts).reduce((a, b) => a + b, 0);
	const activeBatchCount = (data.statusCounts['In Progress'] || 0) + (data.statusCounts['Pending Review'] || 0);
</script>

<div class="flex-1 p-4 grid grid-cols-12 grid-rows-[auto_auto_1fr_1fr] gap-4 overflow-auto">
	<!-- KPI Row -->
	<div class="col-span-12 grid grid-cols-4 gap-4">
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Batches</p>
				<p class="text-2xl font-black text-slate-900">{activeBatchCount} <span class="text-xs font-normal text-slate-400">in progress</span></p>
			</div>
			<span class="material-symbols-outlined text-primary opacity-50">eco</span>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Completed</p>
				<p class="text-2xl font-black text-slate-900">{data.completedCount} <span class="text-xs font-normal text-slate-400">batches</span></p>
			</div>
			<span class="material-symbols-outlined text-primary opacity-50">check_circle</span>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ethanol Recovery</p>
				<p class="text-2xl font-black text-slate-900">{data.avgEthanolRecovery} <span class="text-xs font-normal text-slate-400">%</span></p>
			</div>
			<span class="material-symbols-outlined text-primary opacity-50">restart_alt</span>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between border-l-4 border-l-amber-500">
			<div>
				<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Open Deviations</p>
				<p class="text-2xl font-black text-slate-900">{data.openDeviationCount} <span class="text-xs font-normal text-slate-400">issues</span></p>
			</div>
			<span class="material-symbols-outlined text-amber-500 opacity-50">warning</span>
		</div>
	</div>

	<!-- Solvent Balance Summary -->
	<div class="col-span-12 grid grid-cols-6 gap-4">
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ethanol Issued</p>
			<p class="text-lg font-black text-slate-900">{data.solventTotals.ethanol_issued.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Ethanol Recovered</p>
			<p class="text-lg font-black text-primary">{data.solventTotals.ethanol_recovered.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-red-500 font-bold">Ethanol Lost</p>
			<p class="text-lg font-black text-red-600">{data.solventTotals.ethanol_lost.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Limonene Issued</p>
			<p class="text-lg font-black text-slate-900">{data.solventTotals.limonene_issued.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Limonene Recovered</p>
			<p class="text-lg font-black text-primary">{data.solventTotals.limonene_recovered.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] uppercase tracking-wider text-red-500 font-bold">Limonene Lost</p>
			<p class="text-lg font-black text-red-600">{data.solventTotals.limonene_lost.toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
		</div>
	</div>

	<!-- Active Batch Pipeline + Alerts -->
	<div class="col-span-9 bg-white border border-slate-200 p-4 rounded">
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Batch Pipeline Status</h3>
			<span class="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-bold">{activeBatchCount} Batches Active</span>
		</div>
		<div class="flex items-center justify-between gap-2">
			{#each [1, 2, 3, 4] as stageNum, i}
				{@const stageData = data.batchesByStage.find(s => s.stage === stageNum)}
				{@const count = stageData?.count ?? 0}
				{@const fillPct = count > 0 ? Math.min(100, (count / Math.max(activeBatchCount, 1)) * 100) : 0}
				<div class="flex-1">
					<div class="h-1.5 w-full bg-slate-200 rounded-full mb-2 overflow-hidden">
						<div class="h-full bg-primary rounded-full" style="width: {fillPct}%"></div>
					</div>
					<p class="text-[8px] font-bold text-slate-900 uppercase leading-tight">{getStageName(stageNum)}</p>
					<div class="flex items-center justify-between mt-1">
						<span class="text-[10px] text-slate-400">{count} Active</span>
					</div>
				</div>
				{#if i < 3}
					<span class="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Operator Queue Panel -->
	<div class="col-span-3 row-span-3 bg-white border border-slate-200 rounded flex flex-col overflow-hidden">
		<div class="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Operator Queue</h3>
		</div>
		<div class="flex-1 overflow-y-auto divide-y divide-slate-100">
			{#each data.recentDeviations as dev}
				{@const isHighSeverity = dev.severity === 'Critical' || dev.severity === 'High'}
				<div class="p-3 {isHighSeverity ? 'bg-red-50 border-l-4 border-l-red-500' : dev.severity === 'Medium' ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}">
					<p class="text-[10px] font-bold {isHighSeverity ? 'text-red-700' : dev.severity === 'Medium' ? 'text-amber-700' : 'text-slate-700'} uppercase">{dev.deviation_type}: {dev.parameter}</p>
					<p class="text-[10px] text-slate-600 mt-1">{dev.description}</p>
					<p class="text-[9px] text-slate-400 mt-2 font-mono">{new Date(dev.created_at).toLocaleDateString()} · {getStageName(dev.stage_number)}</p>
				</div>
			{/each}

			{#each data.stalledBatches as batch}
				<div class="p-3 bg-amber-50 border-l-4 border-l-amber-500">
					<p class="text-[10px] font-bold text-amber-700 uppercase">Stalled Batch</p>
					<p class="text-[10px] text-slate-600 mt-1">{batch.batch_number} stalled at {getStageName(batch.current_stage)}</p>
					<p class="text-[9px] text-slate-400 mt-2 font-mono">{batch.operator_name}</p>
				</div>
			{/each}

			{#each data.lowStockMaterials as mat}
				<div class="p-3">
					<p class="text-[10px] font-bold text-slate-700 uppercase">Low Inventory</p>
					<p class="text-[10px] text-slate-600 mt-1">{mat.name} stock at {mat.on_hand_qty} {mat.unit} (threshold: {mat.reorder_threshold} {mat.unit})</p>
				</div>
			{/each}

			{#each data.pendingApprovals as appr}
				<div class="p-3">
					<p class="text-[10px] font-bold text-slate-700 uppercase">Pending Approval</p>
					<p class="text-[10px] text-slate-600 mt-1">Batch #{appr.batch_id} — {appr.approval_type.replace(/_/g, ' ')}</p>
					<p class="text-[9px] text-slate-400 mt-2 font-mono">Requested by {appr.requested_by}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Recent Batches Table -->
	<div class="col-span-5 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Recent Batches</h3>
		<div class="space-y-2">
			{#each data.recentBatches as batch}
				{@const statusColor = batch.status === 'Completed' ? 'text-primary' : batch.status === 'In Progress' ? 'text-blue-600' : batch.status === 'Pending Review' ? 'text-amber-600' : batch.status === 'Rejected' ? 'text-red-600' : 'text-slate-400'}
				<a href="/batches/{batch.id}" class="flex items-center justify-between py-2 border-b border-slate-100 hover:bg-slate-50 px-2 rounded transition-colors">
					<div class="flex items-center gap-3">
						<span class="w-2 h-2 rounded-full {statusColor === 'text-primary' ? 'bg-primary' : statusColor === 'text-blue-600' ? 'bg-blue-500' : statusColor === 'text-amber-600' ? 'bg-amber-500' : statusColor === 'text-red-600' ? 'bg-red-500' : 'bg-slate-300'}"></span>
						<div>
							<p class="text-xs font-bold text-slate-900">{batch.batch_number}</p>
							<p class="text-[10px] text-slate-400">{batch.strain}</p>
						</div>
					</div>
					<div class="text-right">
						<p class="text-[10px] font-bold {statusColor}">{batch.status}</p>
						<p class="text-[9px] text-slate-400">{getStageName(batch.current_stage)}</p>
					</div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Machine Status -->
	<div class="col-span-4 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Machine Status</h3>
		<div class="space-y-2">
			{#each data.machines as machine}
				{@const statusColor = machine.status === 'Running' ? 'bg-primary' : machine.status === 'Idle' ? 'bg-slate-300' : machine.status === 'Maintenance' ? 'bg-amber-500' : 'bg-red-500'}
				{@const statusTextColor = machine.status === 'Running' ? 'text-primary' : machine.status === 'Idle' ? 'text-slate-400' : machine.status === 'Maintenance' ? 'text-amber-600' : 'text-red-600'}
				<div class="flex items-center justify-between py-2 border-b border-slate-100">
					<div class="flex items-center gap-3">
						<span class="material-symbols-outlined text-sm text-slate-400">precision_manufacturing</span>
						<div>
							<p class="text-xs font-bold text-slate-900">{machine.name}</p>
							<p class="text-[10px] text-slate-400">{machine.code} · {resolveStageRelevance(machine.stage_relevance ?? '')}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full {statusColor}"></span>
						<span class="text-[10px] font-bold {statusTextColor} uppercase">{machine.status}</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Cost Summary -->
	<div class="col-span-5 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Alkaloid Composition ({data.latestCompletedBatch ?? 'N/A'})</h3>
		{#if data.hplcResult}
			<div class="grid grid-cols-2 gap-4">
				<div class="flex flex-col items-center">
					<div class="relative flex items-center justify-center w-16 h-16">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
							<circle cx="36" cy="36" r="32" stroke="#ecefeb" stroke-width="4" fill="transparent" />
							<circle cx="36" cy="36" r="32" stroke="#93bf8d" stroke-width="4" fill="transparent"
								stroke-dasharray="201" stroke-dashoffset={201 - (201 * (data.hplcResult.mitragynine_pct ?? 0) / 100)} />
						</svg>
						<span class="absolute text-[10px] font-mono font-bold">{data.hplcResult.mitragynine_pct}%</span>
					</div>
					<span class="text-[8px] uppercase tracking-tighter mt-2 text-slate-500 text-center">Mitragynine</span>
				</div>
				<div class="flex flex-col items-center">
					<div class="relative flex items-center justify-center w-16 h-16">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
							<circle cx="36" cy="36" r="32" stroke="#ecefeb" stroke-width="4" fill="transparent" />
							<circle cx="36" cy="36" r="32" stroke="#93bf8d" stroke-width="4" fill="transparent"
								stroke-dasharray="201" stroke-dashoffset={201 - (201 * (data.hplcResult.hydroxy_mitragynine_pct ?? 0) / 100)} />
						</svg>
						<span class="absolute text-[10px] font-mono font-bold">{data.hplcResult.hydroxy_mitragynine_pct}%</span>
					</div>
					<span class="text-[8px] uppercase tracking-tighter mt-2 text-slate-500 text-center">7-OHM</span>
				</div>
				<div class="flex flex-col items-center">
					<div class="relative flex items-center justify-center w-16 h-16">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
							<circle cx="36" cy="36" r="32" stroke="#ecefeb" stroke-width="4" fill="transparent" />
							<circle cx="36" cy="36" r="32" stroke="#93bf8d" stroke-width="4" fill="transparent"
								stroke-dasharray="201" stroke-dashoffset={201 - (201 * (data.hplcResult.paynantheine_pct ?? 0) / 100)} />
						</svg>
						<span class="absolute text-[10px] font-mono font-bold">{data.hplcResult.paynantheine_pct}%</span>
					</div>
					<span class="text-[8px] uppercase tracking-tighter mt-2 text-slate-500 text-center">Paynantheine</span>
				</div>
				<div class="flex flex-col items-center">
					<div class="relative flex items-center justify-center w-16 h-16">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
							<circle cx="36" cy="36" r="32" stroke="#ecefeb" stroke-width="4" fill="transparent" />
							<circle cx="36" cy="36" r="32" stroke="#93bf8d" stroke-width="4" fill="transparent"
								stroke-dasharray="201" stroke-dashoffset={201 - (201 * (data.hplcResult.hplc_purity_pct ?? 0) / 100)} />
						</svg>
						<span class="absolute text-[10px] font-mono font-bold">{data.hplcResult.hplc_purity_pct}%</span>
					</div>
					<span class="text-[8px] uppercase tracking-tighter mt-2 text-slate-500 text-center">Total Purity</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Cost Distribution -->
	<div class="col-span-4 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Cost Distribution ({data.latestCompletedBatch ?? 'N/A'})</h3>
		<div class="flex gap-4">
			<div class="relative w-28 h-28 mx-auto flex-shrink-0">
				<svg class="w-full h-full" viewBox="0 0 36 36">
					<path d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" fill="none" stroke="#93bf8d" stroke-dasharray="40, 100" stroke-width="4" />
					<path d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" fill="none" stroke="#475569" stroke-dasharray="20, 100" stroke-dashoffset="-40" stroke-width="4" />
					<path d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" fill="none" stroke="#94a3b8" stroke-dasharray="15, 100" stroke-dashoffset="-60" stroke-width="4" />
					<path d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" fill="none" stroke="#cbd5e1" stroke-dasharray="25, 100" stroke-dashoffset="-75" stroke-width="4" />
				</svg>
				<div class="absolute inset-0 flex items-center justify-center flex-col">
					<span class="text-xs font-black">${data.totalCost ? (data.totalCost / 1000).toFixed(1) + 'k' : '—'}</span>
					<span class="text-[7px] uppercase font-bold text-slate-400">Total</span>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-1 self-center">
				<div class="flex items-center gap-2 text-[9px] font-bold text-slate-600">
					<span class="w-1.5 h-1.5 bg-primary rounded-full"></span> Material ({data.costBreakdown?.Material ? Math.round((data.costBreakdown.Material / (data.totalCost || 1)) * 100) : 0}%)
				</div>
				<div class="flex items-center gap-2 text-[9px] font-bold text-slate-600">
					<span class="w-1.5 h-1.5 bg-slate-600 rounded-full"></span> Labor ({data.costBreakdown?.Labor ? Math.round((data.costBreakdown.Labor / (data.totalCost || 1)) * 100) : 0}%)
				</div>
				<div class="flex items-center gap-2 text-[9px] font-bold text-slate-600">
					<span class="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Utility ({data.costBreakdown?.Utility ? Math.round((data.costBreakdown.Utility / (data.totalCost || 1)) * 100) : 0}%)
				</div>
			</div>
		</div>
	</div>
</div>
