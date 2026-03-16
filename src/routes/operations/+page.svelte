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

	const maxCompletedThrough = Math.max(...data.stagePipeline.map(s => s.completedThroughCount), 1);

	// Alkaloid donut data
	const hplc = data.latestHplcResult;
	const alkaloidSegments = hplc ? [
		{ label: 'Mitragynine', pct: hplc.mitragynine_pct ?? 0, color: '#1152d4' },
		{ label: '7-OHM', pct: hplc.hydroxy_mitragynine_pct ?? 0, color: '#3b82f6' },
		{ label: 'Paynantheine', pct: hplc.paynantheine_pct ?? 0, color: '#475569' },
		{ label: 'Speciogynine', pct: hplc.speciogynine_pct ?? 0, color: '#94a3b8' },
		{ label: 'Speciociliatine', pct: hplc.speciociliatine_pct ?? 0, color: '#cbd5e1' },
		{ label: 'Non-alkaloids', pct: hplc.non_alkaloids_pct ?? 0, color: '#64748b' }
	].filter(s => s.pct > 0) : [];

	function donutPath(startPct: number, sizePct: number): string {
		const r = 15.5;
		const cx = 18, cy = 18;
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
		if (!stage) return 'bg-bg-input text-text-muted';
		if (stage.status === 'Finalized') return 'bg-primary/15 text-primary';
		if (stage.status === 'In Progress') return 'bg-blue-900/30 text-blue-400';
		return 'bg-bg-input text-text-muted';
	}

	const STAGE_SHORT_NAMES = ['Powder', 'Extraction', 'Partitioning', 'Final Product'] as const;

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
		<div class="bg-bg-card border border-border-card p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Batch Throughput</p>
				<p class="text-2xl font-black text-text-primary">{data.throughput.total} <span class="text-xs font-normal text-text-muted">kg</span></p>
				<p class="text-[10px] text-text-muted">{data.throughput.batchCount} batches · {avgKgPerBatch} kg/batch avg</p>
			</div>
			<span class="material-symbols-outlined text-primary opacity-50">eco</span>
		</div>

		<!-- Yield Progress -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Yield Progress</p>
			<p class="text-2xl font-black text-text-primary">{data.totalFinalProduct.toFixed(2)} <span class="text-xs font-normal text-text-muted">kg</span></p>
			<div class="mt-1.5 h-1.5 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {yieldPct.toFixed(1)}%"></div>
			</div>
			<p class="text-[10px] text-text-muted mt-1">{yieldPct.toFixed(1)}% of {YIELD_TARGET_KG} kg · {(YIELD_TARGET_KG - data.totalFinalProduct).toFixed(2)} kg remaining</p>
		</div>

		<!-- Active Batches -->
		<div class="bg-bg-card border border-border-card p-3 rounded flex items-center justify-between">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Active Batches</p>
				<p class="text-2xl font-black text-text-primary">{data.activeBatchProgress.length}</p>
				<p class="text-[10px] text-text-muted">in progress</p>
			</div>
			<span class="material-symbols-outlined text-blue-400 opacity-50">pending_actions</span>
		</div>

		<!-- Pending Actions -->
		<div class="bg-bg-card border border-border-card p-3 rounded flex items-center justify-between {data.pendingActionsCount > 0 ? 'border-l-4 border-l-amber-500' : ''}">
			<div>
				<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Pending Actions</p>
				<p class="text-2xl font-black text-text-primary">{data.pendingActionsCount}</p>
				<p class="text-[10px] text-text-muted">deviations · approvals · stalled · stock</p>
			</div>
			<span class="material-symbols-outlined {data.pendingActionsCount > 0 ? 'text-amber-500' : 'text-text-muted'} opacity-50">notification_important</span>
		</div>
	</div>

	<!-- Row 2: Active Process Pipeline -->
	<div class="col-span-12 bg-bg-card border border-border-card p-6 rounded-xl shadow-sm">
		<h2 class="text-lg font-bold mb-6 flex items-center gap-2">
			<span class="material-symbols-outlined">hub</span>
			Active Process Pipeline
		</h2>
		<div class="relative flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4 px-4">
			<!-- Connecting Line -->
			<div class="absolute top-1/2 left-0 w-full h-0.5 bg-border-card -translate-y-1/2 hidden lg:block"></div>
			{#each data.stagePipeline as stage, i}
				{@const isActive = stage.activeCount > 0}
				{@const icons = ['grain', 'science', 'filter_alt', 'inventory_2']}
				<a href="/stages/{stage.stageNumber}" class="relative z-10 flex flex-col items-center text-center">
					<div class="h-14 w-14 rounded-full {isActive ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-bg-input text-text-muted border-2 border-border-card'} flex items-center justify-center mb-3">
						<span class="material-symbols-outlined">{icons[i]}</span>
					</div>
					<p class="font-semibold text-sm">{getStageName(stage.stageNumber)}</p>
					<p class="text-xs text-text-muted">{stage.activeCount} Active</p>
					<span class="mt-2 px-2 py-0.5 rounded {isActive ? 'bg-primary/10 text-primary' : 'bg-bg-input text-text-muted'} text-[10px] font-bold uppercase tracking-wider">
						{isActive ? 'In Progress' : 'Idle'}
					</span>
				</a>
				{#if i < data.stagePipeline.length - 1}
					<div class="lg:hidden text-text-muted">
						<span class="material-symbols-outlined">expand_more</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Row 3: Active Batch Progress -->
	<div class="col-span-12 bg-bg-card border border-border-card p-4 rounded">
		<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Active Batch Progress</h3>
		{#if data.activeBatchProgress.length === 0}
			<p class="text-xs text-text-muted">No active batches</p>
		{:else}
			<!-- Header -->
			<div class="grid grid-cols-12 gap-2 text-[9px] font-bold text-text-muted uppercase tracking-wider pb-2 border-b border-border-subtle">
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
				<a href="/batches/{batch.id}" class="grid grid-cols-12 gap-2 items-center py-2 border-b border-border-subtle hover:bg-bg-card-hover transition-colors rounded">
					<div class="col-span-2">
						<p class="text-xs font-bold text-text-primary">{batch.batch_number}</p>
						<p class="text-[10px] text-text-muted">{batch.operator_name ?? '—'}</p>
					</div>
					<div class="col-span-5 grid grid-cols-4 gap-1">
						{#each [1, 2, 3, 4] as stageNum, si}
							<div class="text-center rounded py-1 px-0.5 text-[10px] font-mono font-bold {stageStatusColor(batch.stages, stageNum)}">
								{stageOutputs[si] != null ? stageOutputs[si]?.toFixed(2) + ' kg' : '—'}
							</div>
						{/each}
					</div>
					<div class="col-span-2 px-2">
						<div class="h-1.5 w-full bg-border-card rounded-full overflow-hidden">
							<div class="h-full bg-primary rounded-full" style="width: {(completedStages / 4 * 100)}%"></div>
						</div>
						<p class="text-[9px] text-text-muted text-center mt-0.5">{completedStages}/4</p>
					</div>
					<div class="col-span-2">
						<p class="text-[10px] font-bold text-text-secondary">{getStageName(batch.current_stage)}</p>
					</div>
					<div class="col-span-1 text-center">
						<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {nextAction(batch) === 'Review' ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}">{nextAction(batch)}</span>
					</div>
				</a>
			{/each}
		{/if}
	</div>

	<!-- Row 4: Support Cards (2 columns - deviations removed) -->
	<div class="col-span-12 grid grid-cols-2 gap-4">
		<!-- Machine Operations -->
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Machine Operations</h3>
			<p class="text-[10px] text-text-muted mb-2">{machineRunning} running · {machineIdle} idle · {machineMaint} maintenance · {machineOffline} offline</p>
			<div class="space-y-1.5 max-h-40 overflow-y-auto">
				{#each data.machines as machine}
					{@const dotColor = machine.status === 'Running' ? 'bg-primary' : machine.status === 'Idle' ? 'bg-text-muted' : machine.status === 'Maintenance' ? 'bg-amber-500' : 'bg-red-500'}
					<div class="flex items-center gap-2">
						<span class="w-1.5 h-1.5 rounded-full {dotColor} flex-shrink-0"></span>
						<span class="text-[10px] text-text-secondary font-medium truncate">{machine.name}</span>
						<span class="text-[9px] text-text-muted ml-auto flex-shrink-0">{resolveStageRelevance(machine.stage_relevance ?? '')}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Pending Lab Samples -->
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<div class="flex items-center gap-2 mb-2">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Pending Lab Samples</h3>
				{#if data.pendingLabResults.length > 0}
					<span class="text-[9px] font-bold bg-amber-900/30 text-amber-400 px-1.5 py-0.5 rounded">{data.pendingLabResults.length}</span>
				{/if}
			</div>
			{#if data.pendingLabResults.length === 0}
				<p class="text-[10px] text-text-muted">No pending samples</p>
			{:else}
				<div class="space-y-2 max-h-40 overflow-y-auto">
					{#each data.pendingLabResults as lr}
						<div class="flex items-center justify-between">
							<div>
								<p class="text-[10px] font-bold text-text-secondary">{lr.batch_number}</p>
								<p class="text-[9px] text-text-muted">{lr.test_type} · {lr.status}</p>
							</div>
							<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {lr.status === 'Pending' ? 'bg-bg-input text-text-muted' : 'bg-blue-900/30 text-blue-400'}">{lr.status}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Row 5: Analytics Support -->
	<div class="col-span-12 grid grid-cols-3 gap-4">
		<!-- Alkaloid Composition -->
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Alkaloid Composition {data.latestCompletedBatch ? `(${data.latestCompletedBatch})` : ''}</h3>
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
							<span class="text-xs font-black text-text-primary">{hplc.hplc_purity_pct ?? '—'}%</span>
							<span class="text-[7px] uppercase font-bold text-text-muted">Purity</span>
						</div>
					</div>
					<div class="grid grid-cols-1 gap-0.5">
						{#each alkaloidSegments as seg}
							<div class="flex items-center gap-1.5 text-[9px] text-text-secondary">
								<span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: {seg.color}"></span>
								<span class="font-medium">{seg.label}</span>
								<span class="font-bold ml-auto">{seg.pct}%</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<p class="text-[10px] text-text-muted">No HPLC data available</p>
			{/if}
		</div>

		<!-- Solvent Summary -->
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Solvent Summary</h3>
			<!-- Ethanol -->
			<div class="mb-3">
				<p class="text-[10px] font-bold text-text-secondary mb-1">Ethanol</p>
				<div class="grid grid-cols-3 gap-2 text-center">
					<div>
						<p class="text-sm font-black text-text-primary">{data.solventTotals.ethanol_issued.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Issued (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-primary">{data.solventTotals.ethanol_recovered.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Recovered (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-red-500">{data.solventTotals.ethanol_lost.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Lost (L)</p>
					</div>
				</div>
				<div class="mt-1.5 h-1 w-full bg-border-card rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full" style="width: {ethRecoveryRate.toFixed(0)}%"></div>
				</div>
				<p class="text-[9px] text-text-muted mt-0.5">{ethRecoveryRate.toFixed(1)}% recovery</p>
			</div>
			<!-- Limonene -->
			<div>
				<p class="text-[10px] font-bold text-text-secondary mb-1">Limonene</p>
				<div class="grid grid-cols-3 gap-2 text-center">
					<div>
						<p class="text-sm font-black text-text-primary">{data.solventTotals.limonene_issued.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Issued (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-primary">{data.solventTotals.limonene_recovered.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Recovered (L)</p>
					</div>
					<div>
						<p class="text-sm font-black text-red-500">{data.solventTotals.limonene_lost.toFixed(1)}</p>
						<p class="text-[9px] text-text-muted">Lost (L)</p>
					</div>
				</div>
				<div class="mt-1.5 h-1 w-full bg-border-card rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full" style="width: {limRecoveryRate.toFixed(0)}%"></div>
				</div>
				<p class="text-[9px] text-text-muted mt-0.5">{limRecoveryRate.toFixed(1)}% recovery</p>
			</div>
		</div>

		<!-- Cost Snapshot -->
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-3">Cost Snapshot</h3>
			{#if data.costSnapshot}
				<div class="space-y-3">
					<div>
						<p class="text-[10px] text-text-muted">Latest Completed Batch</p>
						<p class="text-xs font-bold text-text-primary">{data.costSnapshot.batch_number}</p>
					</div>
					<div class="grid grid-cols-3 gap-2 text-center">
						<div>
							<p class="text-lg font-black text-text-primary">${data.costSnapshot.costPerKg.toFixed(0)}</p>
							<p class="text-[9px] text-text-muted">Cost/kg</p>
						</div>
						<div>
							<p class="text-lg font-black text-text-primary">${(data.costSnapshot.totalCost / 1000).toFixed(1)}k</p>
							<p class="text-[9px] text-text-muted">Total Cost</p>
						</div>
						<div>
							<p class="text-lg font-black text-primary">{data.costSnapshot.finalProductKg.toFixed(2)}</p>
							<p class="text-[9px] text-text-muted">Product (kg)</p>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-[10px] text-text-muted">No completed batch data</p>
			{/if}
		</div>
	</div>
</div>
