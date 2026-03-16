<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function resolveStageRelevance(text: string): string {
		return text.replace(/Stage (\d)/g, (_, n) => getStageName(Number(n)));
	}

	const YIELD_TARGET_KG = 50;
	const yieldPct = Math.min(100, (data.totalFinalProduct / YIELD_TARGET_KG) * 100);
	const avgKgPerBatch = data.throughput.batchCount > 0
		? (data.throughput.total / data.throughput.batchCount).toFixed(1)
		: '0.0';

	const STAGE_SHORT_NAMES = ['Powder', 'Extraction', 'Partitioning', 'Final Product'] as const;
	const maxCompletedThrough = Math.max(...data.stagePipeline.map(s => s.completedThroughCount), 1);

	// Alkaloid donut data
	const hplc = data.latestHplcResult;
	const alkaloidSegments = hplc ? [
		{ label: 'Mitragynine', pct: hplc.mitragynine_pct ?? 0, color: '#93bf8d' },
		{ label: '7-OHM', pct: hplc.hydroxy_mitragynine_pct ?? 0, color: '#6b9f64' },
		{ label: 'Paynantheine', pct: hplc.paynantheine_pct ?? 0, color: '#475569' },
		{ label: 'Speciogynine', pct: hplc.speciogynine_pct ?? 0, color: '#94a3b8' },
		{ label: 'Speciociliatine', pct: hplc.speciociliatine_pct ?? 0, color: '#cbd5e1' },
		{ label: 'Non-alkaloids', pct: hplc.non_alkaloids_pct ?? 0, color: '#e2e8f0' }
	].filter(s => s.pct > 0) : [];

	function donutPath(startPct: number, sizePct: number): string {
		const r = 15.5;
		const cx = 18, cy = 18;
		const circumference = 2 * Math.PI * r;
		const startAngle = (startPct / 100) * 360 - 90;
		const endAngle = ((startPct + sizePct) / 100) * 360 - 90;
		const startRad = (startAngle * Math.PI) / 180;
		const endRad = (endAngle * Math.PI) / 180;
		const x1 = cx + r * Math.cos(startRad);
		const y1 = cy + r * Math.sin(startRad);
		const x2 = cx + r * Math.cos(endRad);
		const y2 = cy + r * Math.sin(endRad);
		const largeArc = sizePct > 50 ? 1 : 0;
		return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
	}

	function stageStatusColor(stages: { stage_number: number; status: string }[], stageNum: number): string {
		const stage = stages.find(s => s.stage_number === stageNum);
		if (!stage) return 'bg-slate-100 text-slate-300';
		if (stage.status === 'Finalized') return 'bg-primary/15 text-primary';
		if (stage.status === 'In Progress') return 'bg-blue-100 text-blue-700';
		return 'bg-slate-100 text-slate-400'; // Pending
	}

	function nextAction(batch: { status: string; current_stage: number; stages: { stage_number: number; status: string }[] }): string {
		if (batch.status === 'Pending Review') return 'Review';
		const currentStage = batch.stages.find(s => s.stage_number === batch.current_stage);
		if (currentStage?.status === 'Pending') return 'Start';
		return 'Record';
	}

	// Machine status counts
	const machineRunning = data.machines.filter(m => m.status === 'Running').length;
	const machineIdle = data.machines.filter(m => m.status === 'Idle').length;
	const machineMaint = data.machines.filter(m => m.status === 'Maintenance').length;
	const machineOffline = data.machines.filter(m => m.status === 'Offline').length;

	// Solvent recovery rates
	const ethRecoveryRate = data.solventTotals.ethanol_issued > 0 ? (data.solventTotals.ethanol_recovered / data.solventTotals.ethanol_issued * 100) : 0;
	const limRecoveryRate = data.solventTotals.limonene_issued > 0 ? (data.solventTotals.limonene_recovered / data.solventTotals.limonene_issued * 100) : 0;
</script>

<div class="flex-1 p-4 grid grid-cols-12 gap-4 overflow-auto content-start">
	<!-- Row 1: Hero KPI Cards -->
	<div class="col-span-12 grid grid-cols-4 gap-4">
		<!-- Batch Throughput -->
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch Throughput</p>
				<p class="text-2xl font-black text-slate-900">{data.throughput.total} <span class="text-xs font-normal text-slate-400">kg</span></p>
				<p class="text-[10px] text-slate-400">{data.throughput.batchCount} batches · {avgKgPerBatch} kg/batch avg</p>
			</div>
			<span class="material-symbols-outlined text-primary opacity-50">eco</span>
		</div>

		<!-- Yield Progress -->
		<div class="bg-white border border-slate-200 p-3 rounded">
			<p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Yield Progress</p>
			<p class="text-2xl font-black text-slate-900">{data.totalFinalProduct.toFixed(2)} <span class="text-xs font-normal text-slate-400">kg</span></p>
			<div class="mt-1.5 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {yieldPct.toFixed(1)}%"></div>
			</div>
			<p class="text-[10px] text-slate-400 mt-1">{yieldPct.toFixed(1)}% of {YIELD_TARGET_KG} kg · {(YIELD_TARGET_KG - data.totalFinalProduct).toFixed(2)} kg remaining</p>
		</div>

		<!-- Active Batches -->
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Batches</p>
				<p class="text-2xl font-black text-slate-900">{data.activeBatchProgress.length}</p>
				<p class="text-[10px] text-slate-400">in progress</p>
			</div>
			<span class="material-symbols-outlined text-blue-500 opacity-50">pending_actions</span>
		</div>

		<!-- Pending Actions -->
		<div class="bg-white border border-slate-200 p-3 rounded flex items-center justify-between {data.pendingActionsCount > 0 ? 'border-l-4 border-l-amber-500' : ''}">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Actions</p>
				<p class="text-2xl font-black text-slate-900">{data.pendingActionsCount}</p>
				<p class="text-[10px] text-slate-400">deviations · approvals · stalled · stock</p>
			</div>
			<span class="material-symbols-outlined {data.pendingActionsCount > 0 ? 'text-amber-500' : 'text-slate-300'} opacity-50">notification_important</span>
		</div>
	</div>

	<!-- Row 2: 4-Stage Pipeline -->
	<div class="col-span-12 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Processing Pipeline</h3>
		<div class="flex items-stretch gap-2">
			{#each data.stagePipeline as stage, i}
				<a href="/batches" title={getStageName(stage.stageNumber)} class="flex-1 border border-slate-200 rounded p-3 hover:bg-slate-50 transition-colors">
					<p class="text-[9px] font-bold text-slate-900 uppercase tracking-wide">{STAGE_SHORT_NAMES[i]}</p>
					<div class="mt-2 flex items-baseline gap-1">
						<span class="text-lg font-black text-slate-900">{stage.activeCount}</span>
						<span class="text-[10px] text-slate-400">active</span>
					</div>
					<p class="text-[10px] text-slate-400">{stage.activeQtyKg} kg in stage</p>
					<div class="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
						<div class="h-full bg-primary rounded-full" style="width: {(stage.completedThroughCount / maxCompletedThrough * 100).toFixed(0)}%"></div>
					</div>
					<p class="text-[9px] text-slate-400 mt-1">{stage.completedThroughCount} completed · {stage.completedThroughOutputKg} kg output</p>
				</a>
				{#if i < 3}
					<div class="flex items-center">
						<span class="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Row 3: Active Batch Progress -->
	<div class="col-span-12 bg-white border border-slate-200 p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Active Batch Progress</h3>
		{#if data.activeBatchProgress.length === 0}
			<p class="text-xs text-slate-400">No active batches</p>
		{:else}
			<!-- Header -->
			<div class="grid grid-cols-12 gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
				<div class="col-span-2">Batch</div>
				<div class="col-span-5 grid grid-cols-4 gap-1 text-center">
					{#each STAGE_SHORT_NAMES as name}
						<div>{name}</div>
					{/each}
				</div>
				<div class="col-span-2 text-center">Progress</div>
				<div class="col-span-2">Current Stage</div>
				<div class="col-span-1 text-center">Action</div>
			</div>
			{#each data.activeBatchProgress as batch}
				{@const completedStages = batch.stages.filter(s => s.status === 'Finalized').length}
				{@const stageOutputs = [batch.powder_weight_kg, batch.extract_weight_kg, batch.alkaloid_precipitate_kg, batch.final_product_weight_kg]}
				<a href="/batches/{batch.id}" class="grid grid-cols-12 gap-2 items-center py-2 border-b border-slate-50 hover:bg-slate-50 transition-colors rounded">
					<!-- Batch ID + Operator -->
					<div class="col-span-2">
						<p class="text-xs font-bold text-slate-900">{batch.batch_number}</p>
						<p class="text-[10px] text-slate-400">{batch.operator_name ?? '—'}</p>
					</div>
					<!-- Stage waterfall -->
					<div class="col-span-5 grid grid-cols-4 gap-1">
						{#each [1, 2, 3, 4] as stageNum, si}
							<div class="text-center rounded py-1 px-0.5 text-[10px] font-mono font-bold {stageStatusColor(batch.stages, stageNum)}">
								{stageOutputs[si] != null ? stageOutputs[si]?.toFixed(2) + ' kg' : '—'}
							</div>
						{/each}
					</div>
					<!-- Progress bar -->
					<div class="col-span-2 px-2">
						<div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
							<div class="h-full bg-primary rounded-full" style="width: {(completedStages / 4 * 100)}%"></div>
						</div>
						<p class="text-[9px] text-slate-400 text-center mt-0.5">{completedStages}/4</p>
					</div>
					<!-- Current stage -->
					<div class="col-span-2">
						<p class="text-[10px] font-bold text-slate-700">{getStageName(batch.current_stage)}</p>
					</div>
					<!-- Next action -->
					<div class="col-span-1 text-center">
						<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {nextAction(batch) === 'Review' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">{nextAction(batch)}</span>
					</div>
				</a>
			{/each}
		{/if}
	</div>

	<!-- Row 4: Support Cards -->
	<div class="col-span-12 grid grid-cols-3 gap-4">
		<!-- Machine Operations -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Machine Operations</h3>
			<p class="text-[10px] text-slate-500 mb-2">{machineRunning} running · {machineIdle} idle · {machineMaint} maintenance · {machineOffline} offline</p>
			<div class="space-y-1.5 max-h-40 overflow-y-auto">
				{#each data.machines as machine}
					{@const dotColor = machine.status === 'Running' ? 'bg-primary' : machine.status === 'Idle' ? 'bg-slate-300' : machine.status === 'Maintenance' ? 'bg-amber-500' : 'bg-red-500'}
					<div class="flex items-center gap-2">
						<span class="w-1.5 h-1.5 rounded-full {dotColor} flex-shrink-0"></span>
						<span class="text-[10px] text-slate-700 font-medium truncate">{machine.name}</span>
						<span class="text-[9px] text-slate-400 ml-auto flex-shrink-0">{resolveStageRelevance(machine.stage_relevance ?? '')}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pending Lab Samples -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<div class="flex items-center gap-2 mb-2">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending Lab Samples</h3>
				{#if data.pendingLabResults.length > 0}
					<span class="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{data.pendingLabResults.length}</span>
				{/if}
			</div>
			{#if data.pendingLabResults.length === 0}
				<p class="text-[10px] text-slate-400">No pending samples</p>
			{:else}
				<div class="space-y-2 max-h-40 overflow-y-auto">
					{#each data.pendingLabResults as lr}
						<div class="flex items-center justify-between">
							<div>
								<p class="text-[10px] font-bold text-slate-700">{lr.batch_number}</p>
								<p class="text-[9px] text-slate-400">{lr.test_type} · {lr.status}</p>
							</div>
							<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {lr.status === 'Pending' ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}">{lr.status}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Open Deviations & Reviews -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Deviations & Reviews</h3>
			<div class="space-y-2 max-h-40 overflow-y-auto">
				{#each data.recentDeviations as dev}
					{@const sevColor = dev.severity === 'Critical' ? 'text-red-700 bg-red-50' : dev.severity === 'High' ? 'text-red-600 bg-red-50' : dev.severity === 'Medium' ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-50'}
					<div class="flex items-center justify-between {sevColor} rounded px-2 py-1">
						<div>
							<p class="text-[10px] font-bold">{dev.deviation_type}: {dev.parameter}</p>
							<p class="text-[9px] text-slate-500">{getStageName(dev.stage_number)}</p>
						</div>
						<span class="text-[9px] font-bold uppercase">{dev.severity}</span>
					</div>
				{/each}
				{#each data.pendingApprovals as appr}
					<div class="flex items-center justify-between bg-slate-50 rounded px-2 py-1">
						<div>
							<p class="text-[10px] font-bold text-slate-700">Batch #{appr.batch_id}</p>
							<p class="text-[9px] text-slate-400">{appr.approval_type.replace(/_/g, ' ')}</p>
						</div>
						<span class="text-[9px] font-bold uppercase text-amber-600">Pending</span>
					</div>
				{/each}
				{#each data.stalledBatches as batch}
					<div class="flex items-center justify-between bg-amber-50 rounded px-2 py-1">
						<div>
							<p class="text-[10px] font-bold text-amber-700">{batch.batch_number}</p>
							<p class="text-[9px] text-slate-500">Stalled at {getStageName(batch.current_stage)}</p>
						</div>
						<span class="text-[9px] font-bold uppercase text-amber-600">Stalled</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Row 5: Analytics Support -->
	<div class="col-span-12 grid grid-cols-3 gap-4">
		<!-- Alkaloid Composition -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Alkaloid Composition {data.latestCompletedBatch ? `(${data.latestCompletedBatch})` : ''}</h3>
			{#if hplc && alkaloidSegments.length > 0}
				<div class="flex items-center gap-3">
					<div class="relative w-24 h-24 flex-shrink-0">
						<svg class="w-full h-full" viewBox="0 0 36 36">
							{#each alkaloidSegments as seg, i}
								{@const offset = alkaloidSegments.slice(0, i).reduce((sum, s) => sum + s.pct, 0)}
								<path d={donutPath(offset, seg.pct)} fill="none" stroke={seg.color} stroke-width="4" stroke-linecap="round" />
							{/each}
						</svg>
						<div class="absolute inset-0 flex items-center justify-center flex-col">
							<span class="text-xs font-black">{hplc.hplc_purity_pct ?? '—'}%</span>
							<span class="text-[7px] uppercase font-bold text-slate-400">Purity</span>
						</div>
					</div>
					<div class="grid grid-cols-1 gap-0.5">
						{#each alkaloidSegments as seg}
							<div class="flex items-center gap-1.5 text-[9px] text-slate-600">
								<span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: {seg.color}"></span>
								<span class="font-medium">{seg.label}</span>
								<span class="font-bold ml-auto">{seg.pct}%</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-[10px] text-slate-400">No HPLC data available</p>
			{/if}
		</div>

		<!-- Solvent Summary -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Solvent Summary</h3>
			<!-- Ethanol -->
			<div class="mb-3">
				<p class="text-[10px] font-bold text-slate-700 mb-1">Ethanol</p>
				<div class="grid grid-cols-3 gap-2 text-center">
					<div>
						<p class="text-sm font-black text-slate-900">{data.solventTotals.ethanol_issued.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Issued (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-primary">{data.solventTotals.ethanol_recovered.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Recovered (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-red-600">{data.solventTotals.ethanol_lost.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Lost (L)</p>
					</div>
				</div>
				<div class="mt-1.5 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full" style="width: {ethRecoveryRate.toFixed(0)}%"></div>
				</div>
				<p class="text-[9px] text-slate-400 mt-0.5">{ethRecoveryRate.toFixed(1)}% recovery</p>
			</div>
			<!-- Limonene -->
			<div>
				<p class="text-[10px] font-bold text-slate-700 mb-1">Limonene</p>
				<div class="grid grid-cols-3 gap-2 text-center">
					<div>
						<p class="text-sm font-black text-slate-900">{data.solventTotals.limonene_issued.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Issued (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-primary">{data.solventTotals.limonene_recovered.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Recovered (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-red-600">{data.solventTotals.limonene_lost.toFixed(1)}</p>
						<p class="text-[9px] text-slate-400">Lost (L)</p>
					</div>
				</div>
				<div class="mt-1.5 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full" style="width: {limRecoveryRate.toFixed(0)}%"></div>
				</div>
				<p class="text-[9px] text-slate-400 mt-0.5">{limRecoveryRate.toFixed(1)}% recovery</p>
			</div>
		</div>

		<!-- Cost Snapshot -->
		<div class="bg-white border border-slate-200 p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Cost Snapshot</h3>
			{#if data.costSnapshot}
				<div class="space-y-3">
					<div>
						<p class="text-[10px] text-slate-500">Latest Completed Batch</p>
						<p class="text-xs font-bold text-slate-900">{data.costSnapshot.batch_number}</p>
					</div>
					<div class="grid grid-cols-3 gap-2 text-center">
						<div>
							<p class="text-lg font-black text-slate-900">${data.costSnapshot.costPerKg.toFixed(0)}</p>
							<p class="text-[9px] text-slate-400">Cost/kg</p>
						</div>
						<div>
							<p class="text-lg font-black text-slate-900">${(data.costSnapshot.totalCost / 1000).toFixed(1)}k</p>
							<p class="text-[9px] text-slate-400">Total Cost</p>
						</div>
						<div>
							<p class="text-lg font-black text-primary">{data.costSnapshot.finalProductKg.toFixed(2)}</p>
							<p class="text-[9px] text-slate-400">Product (kg)</p>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-[10px] text-slate-400">No completed batch data</p>
			{/if}
		</div>
	</div>
</div>
