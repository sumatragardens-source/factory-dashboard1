<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import BatchDrawer from '$lib/components/ui/BatchDrawer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pm = data.pipeline;
	const TOTAL_INTAKE_KG = 1000;

	// Fill percentage: lots finalized × 100kg / 1000kg
	function stageFill(stageNumber: number): number {
		return Math.min(100, ((pm.stageCounts[stageNumber] ?? 0) * 100) / TOTAL_INTAKE_KG * 100);
	}

	// KPI: Active lots (currently in progress)
	const activeLots = data.activeBatchProgress.filter(b => b.status === 'In Progress').length;
	const totalLotsNeeded = Math.ceil(TOTAL_INTAKE_KG / 100);
	const lotsRemaining = totalLotsNeeded - (pm.stageCounts[1] ?? 0);
	const kgRemaining = TOTAL_INTAKE_KG - ((pm.stageCounts[1] ?? 0) * 100);

	// KPI: Completed lots
	const completedLots = pm.completedCount;
	const completedKg = data.totalFinalYield.producedKg;
	const totalKgRemaining = data.totalFinalYield.targetKg - completedKg;

	// KPI: Throughput
	const lotsProcessed = pm.stageCounts[1] ?? 0;
	const processedKg = lotsProcessed * 100;
	const intakePct = (processedKg / TOTAL_INTAKE_KG) * 100;
	const remainingKg = TOTAL_INTAKE_KG - processedKg;

	// Filtration & distillation rates
	const filtrationLossL = Number((pm.ethanol70TotalL - pm.filtrationOutputL).toFixed(1));
	const filtrationPct = pm.ethanol70TotalL > 0 ? (pm.filtrationOutputL / pm.ethanol70TotalL * 100).toFixed(1) : '0';
	const distillationPct = pm.filtrationOutputL > 0 ? (pm.ethanolRecoveredL / pm.filtrationOutputL * 100).toFixed(1) : '0';

	// Solvent recovery rates
	const ethRecoveryRate = data.solventTotals.ethanol_issued > 0 ? (data.solventTotals.ethanol_recovered / data.solventTotals.ethanol_issued * 100) : 0;
	const limRecoveryRate = data.solventTotals.limonene_issued > 0 ? (data.solventTotals.limonene_recovered / data.solventTotals.limonene_issued * 100) : 0;

	// Pipeline: 5 main icons connected by lines with 4 notch circles between them
	const RING_SIZE = 76;
	const RING_R = 34;
	const RING_CIRC = 2 * Math.PI * RING_R;
	const mainSteps = [
		{ icon: 'fa-leaf', label: 'Raw Material', href: '/stages/1', fillPct: stageFill(1) },
		{ icon: 'fa-flask-vial', label: 'EtOH', href: '/stages/2', fillPct: stageFill(2) },
		{ icon: 'fa-fire', label: 'Distillation', href: '/stages/4', fillPct: stageFill(4) },
		{ icon: 'fa-snowflake', label: 'Precipitation', href: '/stages/7', fillPct: stageFill(7), cluster: true },
		{ icon: 'fa-gem', label: 'Final Yield', href: '/stages/8', fillPct: stageFill(8) }
	].map(s => ({ ...s, ringFilled: (s.fillPct / 100) * RING_CIRC }));
	const notchSteps = [
		{ label: 'Powder', stage: 1 },
		{ label: 'Filtration', stage: 3 },
		{ label: 'A/B', stage: 5 },
		{ label: 'Drying', stage: 8 }
	];

	// Lot progress table columns (7 visual columns mapping to 8 DB stages)
	const TABLE_COLUMNS = [
		{ label: 'Powder', dbStages: [1] },
		{ label: 'EtOH', dbStages: [2] },
		{ label: 'Filt.', dbStages: [3] },
		{ label: 'Dist.', dbStages: [4] },
		{ label: 'A/B', dbStages: [5] },
		{ label: 'Prec.', dbStages: [6, 7] },
		{ label: 'Final Yield', dbStages: [8] }
	] as const;

	function columnStatusColor(stages: { stage_number: number; status: string }[], dbStages: readonly number[]): string {
		const matched = dbStages.map(n => stages.find(s => s.stage_number === n));
		if (matched.every(s => s?.status === 'Finalized')) return 'bg-primary/15 text-primary';
		if (matched.some(s => s?.status === 'In Progress' || s?.status === 'Finalized')) return 'bg-blue-900/30 text-blue-400';
		return 'bg-bg-input text-text-muted';
	}

	function nextAction(batch: { status: string; current_stage: number; stages: { stage_number: number; status: string }[] }): string {
		if (batch.status === 'Pending Review') return 'Review';
		const currentStage = batch.stages.find(s => s.stage_number === batch.current_stage);
		if (currentStage?.status === 'Pending') return 'Start';
		return 'Record';
	}

	// Daily yield: final product kg / days of operation
	const totalFinalKg = data.totalFinalYield.producedKg;
	const operationDays = Math.max(1, Math.ceil((Date.now() - new Date('2026-01-10').getTime()) / (1000 * 60 * 60 * 24)));
	const dailyYieldKg = totalFinalKg / operationDays;

	// Extract efficiency: kg final product per kg raw input
	const extractEfficiency = processedKg > 0 ? (totalFinalKg / processedKg * 100) : 0;
	const extractTarget = 1.5; // target extract rate %

	// Quality data
	const hplc = data.hplcResult;
	const hplcCompleted = hplc?.status === 'Completed';
	const totalAlkaloids = hplcCompleted && hplc
		? [hplc.mitragynine_pct, hplc.hydroxy_mitragynine_pct, hplc.paynantheine_pct,
		   hplc.speciogynine_pct, hplc.speciociliatine_pct]
			.filter((v): v is number => v !== null)
			.reduce((a, b) => a + b, 0)
		: null;

	// Daily yield target: total target kg / expected operation days
	const dailyYieldTarget = data.totalFinalYield.targetKg / 90; // 90-day operation window
	const costPerKgTarget = 500; // target cost per kg of final product

	// Next actions queue: group active batches by their next needed step
	const activeBatches = data.activeBatchProgress.filter(b => b.status === 'In Progress' || b.status === 'Pending Review');
	const nextActionQueue = activeBatches.map(b => {
		if (b.status === 'Pending Review') return { label: 'Review', href: `/batches/${b.id}` };
		return { label: getStageName(b.current_stage), href: `/stages/${b.current_stage}` };
	});
	const actionGroups: Record<string, { count: number; href: string }> = {};
	for (const a of nextActionQueue) {
		if (!actionGroups[a.label]) actionGroups[a.label] = { count: 0, href: a.href };
		actionGroups[a.label].count++;
	}
	const sortedActions = Object.entries(actionGroups).sort((a, b) => b[1].count - a[1].count);

	// Cost breakdown
	const cb = data.costBreakdown;
	const costCategories = [
		{ label: 'Raw Material', value: cb.rawMaterial },
		{ label: 'Solvents', value: cb.solvents },
		{ label: 'Reagents', value: cb.reagents },
		{ label: 'Labor', value: cb.labor },
		{ label: 'Utilities', value: cb.utilities }
	];
	const costTotal = cb.total;

	// Smooth area chart generation (Catmull-Rom interpolation)
	function smoothPath(values: number[], w: number, h: number, pad = 10) {
		if (values.length < 2) return { line: '', area: '', points: [] as { x: number; y: number }[] };
		const min = Math.min(...values);
		const max = Math.max(...values, min + 0.01);
		const range = max - min;
		const pts = values.map((v, i) => ({
			x: pad + (i / (values.length - 1)) * (w - 2 * pad),
			y: pad + (1 - (v - min) / range) * (h - 2 * pad)
		}));
		let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			const t = 0.3;
			const c1x = (p1.x + (p2.x - p0.x) * t).toFixed(1);
			const c1y = (p1.y + (p2.y - p0.y) * t).toFixed(1);
			const c2x = (p2.x - (p3.x - p1.x) * t).toFixed(1);
			const c2y = (p2.y - (p3.y - p1.y) * t).toFixed(1);
			d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
		}
		const area = `${d} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;
		return { line: d, area, points: pts };
	}

	function computeTargetY(target: number, values: number[], h: number, pad = 10): number {
		const min = Math.min(...values, target);
		const max = Math.max(...values, target, min + 0.01);
		return pad + (1 - (target - min) / (max - min)) * (h - 2 * pad);
	}

	// Target constants
	const ETH_RECOVERY_TARGET = 95;
	const DAILY_BUDGET = 200;
	const YIELD_TARGET = extractTarget; // 1.5

	// Stage yields (% of each stage's input retained)
	const grindingYield = processedKg > 0 ? (pm.totalPowderKg / processedKg * 100) : 0;
	const extractionYield = pm.totalPowderKg > 0 ? (pm.extractTotalKg / pm.totalPowderKg * 100) : 0;

	// Cost KPI helpers
	const costPerBatch = pm.completedCount > 0 ? costTotal / pm.completedCount : 0;
	const budgetVariance = data.dailyOpCost - DAILY_BUDGET;

	// Sorted cost categories for bars (monochromatic steel-blue, opacity ranked)
	const sortedCostCategories = [...costCategories].sort((a, b) => b.value - a.value);
	const maxCost = Math.max(...costCategories.map(c => c.value), 1);
	const costBarOpacities = [0.85, 0.65, 0.50, 0.38, 0.25];

	// Chart dimensions (wide panoramic, shallow signal-monitor)
	const CW = 240, CH = 44;

	// Filtration return & concentration metrics
	const filtrationReturnL = pm.filtrationOutputL;
	const filtrateConcentration = pm.extractTotalKg > 0 && filtrationReturnL > 0
		? (pm.extractTotalKg / filtrationReturnL * 1000) : 0; // g/L
	const estimatedDissolvedKg = pm.extractTotalKg;
	const distillationRecoveryPct = ethRecoveryRate; // overall solvent recovery %
	const distillationDelta = distillationRecoveryPct - ETH_RECOVERY_TARGET;

	// Per-batch concentration trend
	const concValues = data.ethRecoveryTrend.map(d =>
		d.filtrationReturnL > 0 ? (d.extractWeightKg / d.filtrationReturnL * 1000) : 0
	);
	const filtReturnValues = data.ethRecoveryTrend.map(d => d.filtrationReturnL);

	// Trend chart selector state
	let selectedEthTrend: 'concentration' | 'recovery' | 'filtration' = $state('concentration');

	// Analytics carousel: 0=Op Cost, 1=Ethanol, 2=Yield & Quality
	let carouselIndex: 0 | 1 | 2 = $state(0);
	const carouselLabels = ['Cost', 'Ethanol', 'Yield'];

	// 3-mode intelligence panel state
	type CardMode = 'lot' | 'batch' | 'history';
	let costMode: CardMode = $state('lot');
	let ethanolMode: CardMode = $state('lot');
	let yieldMode: CardMode = $state('lot');
	let drawerBatchId: number | null = $state(null);

	// Selection state: null = whole production run, number = specific batch id
	let selectedBatchId: number | null = $state(null);
	type CompareMode = 'current' | 'previous' | 'avg5' | 'avg10';
	let compareMode: CompareMode = $state('current');
	let compareDropdownOpen = $state(false);
	const compareModeLabels: Record<CompareMode, string> = {
		current: 'Current Ton',
		previous: 'Previous Ton',
		avg5: '5-Ton Average',
		avg10: '10-Ton Average'
	};

	function selectBatch(id: number) {
		if (selectedBatchId === id) {
			// Double-click opens drawer
			drawerBatchId = id;
		} else {
			selectedBatchId = id;
		}
	}
	function selectRun() {
		selectedBatchId = null;
	}
	function setCompareMode(mode: string) {
		compareMode = mode as CompareMode;
		compareDropdownOpen = false;
	}

	// Derived: selected batch detail from run breakdowns
	const selectedCostRow = $derived(selectedBatchId ? data.runBatchCosts.find(c => c.batch_id === selectedBatchId) : null);
	const selectedEthRow = $derived(selectedBatchId ? data.runEthanolBreakdown.find(e => e.batch_id === selectedBatchId) : null);
	const selectedYieldRow = $derived(selectedBatchId ? data.runYieldBreakdown.find(y => y.batch_id === selectedBatchId) : null);
	const selectedBatchInfo = $derived(selectedBatchId ? data.activeBatchProgress.find(b => b.id === selectedBatchId) : null);

	// Production run data
	const rs = data.runSummary;
	const runLabel = rs?.run.run_number ?? 'PR-001';
	const runBatchCount = rs?.totalBatches ?? 0;
	const runCompletedBatches = rs?.completedBatches ?? 0;
	const runCostAgg = data.runCostAggregates;
	const runEthAgg = data.runEthanolAggregates;
	const runYieldAgg = data.runYieldAggregates;
	const avgBatchCostForBar = runCostAgg ? runCostAgg.avgCostPerBatch : 0;
	const batchCostValues = data.runBatchCosts.filter(c => c.totalCost > 0).map(c => c.totalCost);
	const sortedBatchCostValues = [...batchCostValues].sort((a, b) => a - b);
	const cumCostBatches = data.runBatchCosts.filter(c => c.totalCost > 0);
	const cumCostValues = cumCostBatches.reduce((acc, c) => { acc.push((acc[acc.length - 1] ?? 0) + c.totalCost); return acc; }, [] as number[]);
	const cumCostChart = cumCostValues.length >= 2 ? smoothPath(cumCostValues, CW, CH + 20) : null;
	const yieldFinishedBatches = data.runYieldBreakdown.filter(y => y.final_product_weight_kg !== null);
	const cumYieldValues = yieldFinishedBatches.reduce((acc, y) => { acc.push((acc[acc.length - 1] ?? 0) + (y.final_product_weight_kg ?? 0)); return acc; }, [] as number[]);
	const cumYieldChart = cumYieldValues.length >= 2 ? smoothPath(cumYieldValues, CW, CH + 20) : null;
	const runEthDelta = (runEthAgg?.avgRecovery ?? 0) - ETH_RECOVERY_TARGET;
	const cumYieldTargetY = cumYieldValues.length > 0
		? 10 + (1 - ((runYieldAgg?.projectedFinal ?? 50) - Math.min(...cumYieldValues)) / (Math.max(...cumYieldValues, (runYieldAgg?.projectedFinal ?? 50)) - Math.min(...cumYieldValues) + 0.01)) * (CH + 20 - 20)
		: 32;

	// Parent-lot summary KPIs
	const runPendingBatches = data.activeBatchProgress.filter(b => b.status === 'Draft' || b.status === 'Pending Review').length;
	const runInProgressBatches = rs?.inProgressBatches ?? 0;
	const projectedFinalOutput = runYieldAgg?.projectedFinal ?? 0;
	const projectedTotalCost = runCostAgg?.projectedTotal ?? 0;
	const projectedSolventRecovery = runEthAgg?.avgRecovery ?? 0;

	// Lot sort: 'active' = in-progress first, 'completed' = completed first (bottom)
	let lotSort: 'active' | 'completed' = $state('active');
	const sortedBatches = $derived(() => {
		const batches = [...data.activeBatchProgress];
		if (lotSort === 'completed') {
			batches.sort((a, b) => {
				const aComplete = a.final_product_weight_kg != null ? 1 : 0;
				const bComplete = b.final_product_weight_kg != null ? 1 : 0;
				if (aComplete !== bComplete) return aComplete - bComplete; // completed goes to bottom
				if (aComplete && bComplete) return a.id - b.id; // completed: order by id (completion order)
				// both incomplete: most progress first
				const aStages = a.stages.filter(s => s.status === 'Finalized').length;
				const bStages = b.stages.filter(s => s.status === 'Finalized').length;
				return bStages - aStages;
			});
		}
		return batches;
	});

	// Pre-computed smooth chart paths (all three trend views)
	const ethValues = data.ethRecoveryTrend.map(d => d.recoveryPct);
	const ethChart = smoothPath(ethValues, CW, CH);
	const ethTargetY = ethValues.length >= 2 ? computeTargetY(ETH_RECOVERY_TARGET, ethValues, CH) : 0;

	const concChart = smoothPath(concValues, CW, CH);
	const filtReturnChart = smoothPath(filtReturnValues, CW, CH);

	const costValues = data.costTrend.map(d => d.total);
	const costChart = smoothPath(costValues, CW, CH);
	const costTargetY = costValues.length >= 2 ? computeTargetY(DAILY_BUDGET, costValues, CH) : 0;

	const yieldValues = data.yieldTrend.map(d => d.yieldPct);
	const yieldChart = smoothPath(yieldValues, CW, CH);
	const yieldTargetY = yieldValues.length >= 2 ? computeTargetY(YIELD_TARGET, yieldValues, CH) : 0;

	const avgYield = yieldValues.length > 0
		? yieldValues.reduce((a, b) => a + b, 0) / yieldValues.length
		: extractEfficiency;
	const yieldDelta = extractEfficiency - avgYield;

	const totalEthLoss = data.solventTotals.ethanol_lost;
</script>

<div class="flex-1 p-3 grid grid-cols-12 gap-3 overflow-auto content-start">
	<!-- Row 1: 7 Alert KPI Cards -->
	<div class="col-span-12 grid grid-cols-7 gap-3">
		<!-- Active Batches -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Batches</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{activeLots}</p>
				<span class="text-[10px] font-bold text-text-muted">+{totalLotsNeeded - lotsProcessed} remaining</span>
			</div>
			<div class="mt-2 h-1 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full" style="width: {intakePct}%"></div>
			</div>
			<p class="text-[9px] text-text-muted mt-1">{kgRemaining.toLocaleString()} kg remaining</p>
		</div>

		<!-- EtOH Recovery -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">EtOH Recovery</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{ethRecoveryRate.toFixed(1)}%</p>
				{#if ethRecoveryRate >= 95}
					<span class="text-[10px] font-bold text-primary">&#9650; {(ethRecoveryRate - 95).toFixed(1)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; {(95 - ethRecoveryRate).toFixed(1)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-2">LIMIT: >95.0%</p>
		</div>

		<!-- Daily OP Cost -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Daily OP Cost</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">${Math.round(data.dailyOpCost).toLocaleString()}</p>
				<span class="text-[10px] text-text-muted">Budget</span>
			</div>
			<div class="mt-2 h-1 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-blue-500 rounded-full" style="width: {Math.min(100, (data.dailyOpCost / 15000) * 100)}%"></div>
			</div>
		</div>

		<!-- Cost per KG -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cost / KG</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">${Math.round(data.avgCostPerKg).toLocaleString()}</p>
				{#if data.avgCostPerKg <= costPerKgTarget}
					<span class="text-[10px] font-bold text-primary">&#9650; -{((costPerKgTarget - data.avgCostPerKg) / costPerKgTarget * 100).toFixed(0)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; +{((data.avgCostPerKg - costPerKgTarget) / costPerKgTarget * 100).toFixed(0)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-2">TARGET: ${costPerKgTarget}/kg</p>
		</div>

		<!-- Daily Yield -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Daily Yield</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{Math.round(dailyYieldKg * 1000).toLocaleString()}</p>
				<span class="text-[10px] text-text-muted">g/day</span>
			</div>
			<div class="flex items-baseline gap-2 mt-1">
				{#if dailyYieldKg >= dailyYieldTarget}
					<span class="text-[10px] font-bold text-primary">&#9650; +{((dailyYieldKg - dailyYieldTarget) / dailyYieldTarget * 100).toFixed(0)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; -{((dailyYieldTarget - dailyYieldKg) / dailyYieldTarget * 100).toFixed(0)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-1">TARGET: {Math.round(dailyYieldTarget * 1000).toLocaleString()} g/day</p>
		</div>

		<!-- Extract Rate -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Extract Rate</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{extractEfficiency.toFixed(1)}%</p>
				{#if extractEfficiency >= extractTarget}
					<span class="text-[10px] font-bold text-primary">&#9650; +{(extractEfficiency - extractTarget).toFixed(1)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; -{(extractTarget - extractEfficiency).toFixed(1)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-2">TARGET: {extractTarget}% yield</p>
		</div>

		<!-- Pending Actions -->
		<div class="bg-bg-card border border-border-card border-l-[3px] border-l-red-500 p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Pending Actions</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-red-400">{activeBatches.length}</p>
				<span class="text-[10px] text-text-muted">awaiting</span>
			</div>
			<div class="mt-1.5 space-y-0.5 max-h-[42px] overflow-y-auto no-scrollbar">
				{#each sortedActions as [action, { count, href }]}
					<a {href} class="block text-[9px] text-text-muted hover:text-red-400 transition-colors">{count}x {action}</a>
				{/each}
			</div>
		</div>
	</div>

	<!-- Row 3: Pipeline + Lot Progress stacked -->
	<div class="col-span-6 flex flex-col gap-3">
	<div class="relative overflow-visible rounded-2xl border border-border-card z-20" style="background: linear-gradient(135deg, #111827 0%, #1F2937 40%, #162032 100%);">
		<!-- Subtle grid pattern overlay -->
		<div class="absolute inset-0 opacity-[0.03] rounded-2xl overflow-hidden" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"></div>
		<div class="relative p-5">

			<div class="relative flex items-start px-3">
				{#each mainSteps as step, i}
					<!-- Main stage node -->
					<div class="flex-none group relative flex flex-col items-center text-center z-10">
						<a href={step.href} class="flex flex-col items-center transition-transform duration-200 hover:scale-105">
							<div class="relative h-[72px] w-[72px]">
								<!-- Icon circle -->
								<div class="absolute inset-0 rounded-full bg-bg-card flex items-center justify-center shadow-lg shadow-black/20">
									{#if step.cluster}
										<div class="relative w-[30px] h-[28px]">
											<i class="fa-solid fa-snowflake text-primary text-[12px] absolute top-0 left-[9px]"></i>
											<i class="fa-solid fa-snowflake text-primary text-[9px] absolute top-[10px] left-0"></i>
											<i class="fa-solid fa-snowflake text-primary text-[14px] absolute top-[10px] left-[16px]"></i>
											<i class="fa-solid fa-snowflake text-primary text-[8px] absolute bottom-0 left-[8px]"></i>
										</div>
									{:else}
										<i class="fa-solid {step.icon} text-primary text-[22px]"></i>
									{/if}
								</div>
								<!-- Progress ring SVG (on top) -->
								<svg width="72" height="72" class="absolute inset-0 z-10 pointer-events-none" style="transform: rotate(90deg);">
									<circle cx="36" cy="36" r={RING_R} fill="none" stroke="rgba(55,65,81,0.8)" stroke-width="3" />
									<circle cx="36" cy="36" r={RING_R} fill="none" stroke="#A3E635" stroke-width="3" stroke-dasharray="{step.ringFilled} {RING_CIRC - step.ringFilled}" stroke-linecap="round" />
								</svg>
							</div>
							<p class="text-[11px] font-bold text-text-primary mt-3 tracking-wide">{step.label}</p>
							<p class="text-[9px] text-text-muted font-mono">{step.fillPct.toFixed(0)}%</p>
						</a>
						<!-- Main tooltip -->
						<div class="absolute top-full mt-1 z-50 rounded-xl border border-primary/20 shadow-xl shadow-black/30 p-4 w-56 text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 {i === 0 ? 'left-0' : i === mainSteps.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}" style="background: linear-gradient(160deg, #374151 0%, #1F2937 100%);">
							<div class="flex items-center justify-between mb-2">
								<p class="text-[11px] font-bold text-text-primary">{step.label}</p>
								<span class="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">{step.fillPct.toFixed(0)}%</span>
							</div>
							<div class="h-1 w-full bg-bg-page rounded-full overflow-hidden mb-3">
								<div class="h-full bg-primary rounded-full transition-all" style="width: {step.fillPct}%"></div>
							</div>
							<div class="space-y-1.5">
								{#if i === 0}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Processed</span><span class="text-[10px] font-bold text-text-primary">{processedKg.toLocaleString()} kg</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Remaining</span><span class="text-[10px] font-bold text-text-primary">{remainingKg.toLocaleString()} kg</span></div>
								{:else if i === 1}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Extractions</span><span class="text-[10px] font-bold text-text-primary">{pm.lotsExtracted} / {pm.ethanolStockUsedL.toLocaleString()}L</span></div>
									<div class="border-t border-border-subtle pt-1.5 mt-1 space-y-1.5">
										<p class="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Filtration</p>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovered</span><span class="text-[10px] font-bold text-text-primary">{pm.filtrationOutputL.toLocaleString()} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Lost</span><span class="text-[10px] font-bold text-red-400">{filtrationLossL} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovery</span><span class="text-[10px] font-bold text-text-primary">{filtrationPct}%</span></div>
									</div>
								{:else if i === 2}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovered</span><span class="text-[10px] font-bold text-text-primary">{pm.ethanolRecoveredL.toLocaleString()} L</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Lost</span><span class="text-[10px] font-bold text-red-400">{pm.ethanolLostL} L</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovery</span><span class="text-[10px] font-bold text-text-primary">{distillationPct}%</span></div>
								{:else if i === 3}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Wet weight</span><span class="text-[10px] font-bold text-text-primary">{pm.precipitateKg} kg</span></div>
									<div class="border-t border-border-subtle pt-1.5 mt-1 space-y-1.5">
										<p class="text-[9px] font-bold text-primary/70 uppercase tracking-wider">A/B Extraction</p>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">D-Limo Recovered</span><span class="text-[10px] font-bold text-text-primary">{pm.limoneneRecoveredL} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">D-Limo Lost</span><span class="text-[10px] font-bold text-red-400">{pm.limoneneLostL} L</span></div>
									</div>
								{:else if i === 4}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Dried extract</span><span class="text-[10px] font-bold text-text-primary">{pm.finalProductKg} kg</span></div>
								{/if}
							</div>
						</div>
					</div>
					<!-- Connector with notch circle -->
					{#if i < mainSteps.length - 1}
						<div class="flex-1 flex items-center relative" style="margin-top: 35px;">
							<div class="flex-1 h-px bg-gradient-to-r from-primary/60 to-primary/30"></div>
							<div class="flex-none group/notch relative flex flex-col items-center mx-2">
								<div class="h-3.5 w-3.5 rounded-full bg-bg-page border-[1.5px] border-primary/50 z-10 transition-all duration-200 group-hover/notch:border-primary group-hover/notch:bg-primary/20 group-hover/notch:scale-150 cursor-default"></div>
								<p class="text-[7px] font-medium text-text-muted/70 mt-1.5 whitespace-nowrap uppercase tracking-widest">{notchSteps[i].label}</p>
								<div class="absolute top-full mt-5 z-50 rounded-xl border border-primary/20 shadow-xl shadow-black/30 p-3 w-44 text-left opacity-0 pointer-events-none group-hover/notch:opacity-100 transition-all duration-200 left-1/2 -translate-x-1/2" style="background: linear-gradient(160deg, #374151 0%, #1F2937 100%);">
									<div class="flex items-center gap-1.5 mb-2">
										<div class="h-1.5 w-1.5 rounded-full bg-primary/60"></div>
										<p class="text-[10px] font-bold text-text-primary">{notchSteps[i].label}</p>
									</div>
									<div class="space-y-1">
										{#if i === 0}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Total Powder</span><span class="text-[9px] font-bold text-text-primary">{pm.totalPowderKg} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Ground</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[1] ?? 0}</span></div>
										{:else if i === 1}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovered</span><span class="text-[9px] font-bold text-text-primary">{pm.filtrationOutputL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lost</span><span class="text-[9px] font-bold text-red-400">{filtrationLossL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovery</span><span class="text-[9px] font-bold text-text-primary">{filtrationPct}%</span></div>
										{:else if i === 2}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Recovered</span><span class="text-[9px] font-bold text-text-primary">{pm.limoneneRecoveredL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Lost</span><span class="text-[9px] font-bold text-red-400">{pm.limoneneLostL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Processed</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[5] ?? 0}</span></div>
										{:else if i === 3}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Precipitate In</span><span class="text-[9px] font-bold text-text-primary">{pm.precipitateKg} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Final Product</span><span class="text-[9px] font-bold text-text-primary">{pm.finalProductKg} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Dried</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[8] ?? 0}</span></div>
										{/if}
									</div>
								</div>
							</div>
							<!-- Right line segment -->
							<div class="flex-1 h-px bg-gradient-to-r from-primary/30 to-primary/60"></div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	<!-- Lot Progress -->
	<div class="bg-bg-card border border-border-card pt-3 pl-3 pb-3 pr-1 rounded w-full flex-1 flex flex-col min-h-0">
		<!-- Intake summary bar -->
		<div class="flex items-center gap-3 mb-3 pb-2 border-b border-border-subtle pr-3">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted whitespace-nowrap">Total Intake: {TOTAL_INTAKE_KG.toLocaleString()} kg</h3>
			<div class="flex-1 h-2 bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {intakePct}%"></div>
			</div>
			<p class="text-[10px] text-text-muted whitespace-nowrap">{processedKg.toLocaleString()} kg processed / {remainingKg.toLocaleString()} kg remaining</p>
			<div class="flex gap-px rounded overflow-hidden flex-none" style="border: 1px solid rgba(55, 65, 81, 0.35);">
				<button class="px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-wider transition-colors {lotSort === 'active' ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => lotSort = 'active'}>Active</button>
				<button class="px-1.5 py-0.5 text-[7px] font-medium uppercase tracking-wider transition-colors {lotSort === 'completed' ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => lotSort = 'completed'}>Completed</button>
			</div>
		</div>

		<!-- Parent-lot summary bar -->
		<div class="flex items-center gap-2 mb-2 pr-3">
			<div class="flex items-center gap-1.5 flex-none">
				<button onclick={selectRun} class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors {selectedBatchId === null ? 'text-primary bg-primary/15' : 'text-text-muted/50 hover:text-text-muted/70'}">
					{runLabel}
				</button>
				<div class="relative">
					<button onclick={() => compareDropdownOpen = !compareDropdownOpen} class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium text-text-muted/40 hover:text-text-muted/60 transition-colors" style="border: 1px solid rgba(55, 65, 81, 0.25);">
						{compareModeLabels[compareMode]}
						<span class="material-symbols-outlined text-[8px]">expand_more</span>
					</button>
					{#if compareDropdownOpen}
						<div class="absolute top-full left-0 mt-1 z-40 bg-bg-card border border-border-card rounded shadow-lg py-1 min-w-[110px]">
							{#each Object.entries(compareModeLabels) as [key, label]}
								{#if key === 'current'}
									<button class="w-full px-2 py-1 text-[8px] text-left transition-colors {compareMode === key ? 'text-primary bg-primary/10' : 'text-text-muted hover:bg-bg-card-hover'}" onclick={() => setCompareMode(key)}>{label}</button>
								{:else}
									<button class="w-full px-2 py-1 text-[8px] text-left text-text-muted/25 cursor-not-allowed" disabled>{label} <span class="text-[6px]">(soon)</span></button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>
			<div class="flex-1 flex items-center gap-3 justify-end">
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Batches</span>
					<span class="text-[8px] font-medium text-text-secondary">{runCompletedBatches}<span class="text-text-muted/30">/{runBatchCount}</span></span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Active</span>
					<span class="text-[8px] font-medium text-blue-400">{runInProgressBatches}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Proj. Out</span>
					<span class="text-[8px] font-medium text-text-secondary">{projectedFinalOutput.toFixed(1)} kg</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Proj. Cost</span>
					<span class="text-[8px] font-medium text-text-secondary">${Math.round(projectedTotalCost).toLocaleString()}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Recovery</span>
					<span class="text-[8px] font-medium" style="color: {projectedSolventRecovery >= 95 ? '#8BAA7C' : '#C4896A'};">{projectedSolventRecovery.toFixed(1)}%</span>
				</div>
			</div>
		</div>

		<!-- Lot progress table -->
		{#if data.activeBatchProgress.length === 0}
			<p class="text-xs text-text-muted">No active lots</p>
		{:else}
			<div class="pr-3">
				<!-- Header -->
				<div style="display: grid; grid-template-columns: 90px repeat(7, 1fr) 50px 72px 46px;" class="text-[7px] font-bold text-text-muted uppercase tracking-wider pb-1.5 border-b border-border-subtle gap-0.5">
					<button onclick={selectRun} class="text-left transition-colors {selectedBatchId === null ? 'text-primary' : 'text-text-muted hover:text-primary/70'}">{runLabel}</button>
					{#each TABLE_COLUMNS as col}
						<div class="text-center">{col.label}</div>
					{/each}
					<div class="text-center">Prog</div>
					<div>Stage</div>
					<div class="text-center">Act</div>
				</div>
				{#each sortedBatches() as batch}
					{@const completedStages = batch.stages.filter(s => s.status === 'Finalized').length}
					<button onclick={() => selectBatch(batch.id)} style="display: grid; grid-template-columns: 90px repeat(7, 1fr) 50px 72px 46px;" class="items-center py-1.5 border-b rounded gap-0.5 transition-all w-full text-left {selectedBatchId === batch.id ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border-subtle hover:bg-bg-card-hover/30'}">
						<!-- Lot ID + Operator -->
						<div class="hover:bg-bg-card-hover transition-colors rounded px-0.5 py-0.5 overflow-hidden">
							<p class="text-[8px] font-bold text-text-primary truncate">{batch.batch_number}</p>
							<p class="text-[7px] text-text-muted truncate">{batch.operator_name ?? '—'}</p>
						</div>
						<!-- 7 Stage cells -->
						{#each TABLE_COLUMNS as col, ci}
							{@const colStatus = columnStatusColor(batch.stages, col.dbStages)}
							{@const isFinalized = colStatus.includes('primary')}
							{@const isInProgress = colStatus.includes('blue')}
							<div class="group/cell relative text-center rounded py-0.5 px-0.5 text-[8px] font-bold hover:bg-bg-card-hover transition-colors {colStatus}">
								{#if ci === 0}
									{batch.powder_weight_kg != null ? batch.powder_weight_kg.toFixed(1) : '—'}
								{:else if ci === 6}
									{batch.final_product_weight_kg != null ? batch.final_product_weight_kg.toFixed(1) : '—'}
								{:else if isFinalized}
									✓
								{:else if isInProgress}
									...
								{:else}
									—
								{/if}
								<!-- Hover tooltip for middle columns -->
								{#if ci >= 1 && ci <= 5 && (isFinalized || isInProgress)}
									<div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 bg-bg-card border border-border-card rounded-lg shadow-lg p-2.5 w-44 text-left opacity-0 pointer-events-none group-hover/cell:opacity-100 transition-opacity duration-150">
										{#if ci === 1}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Ethanol Extraction</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Extractions</span><span class="text-[9px] font-bold text-text-primary">{batch.reactor_count}</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Used</span><span class="text-[9px] font-bold text-text-primary">{batch.ethanol_stock_used_l?.toFixed(0) ?? '—'} L</span></div>
											</div>
										{:else if ci === 2}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Filtration</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Bag Filter</span><span class="text-[9px] font-bold text-text-primary">{batch.bag_filter_output_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Centrifuge</span><span class="text-[9px] font-bold text-text-primary">{batch.centrifuge_output_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Screw Press</span><span class="text-[9px] font-bold text-text-primary">{batch.screw_press_output_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between border-t border-border-subtle pt-1"><span class="text-[9px] text-text-muted">Total Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.total_ethanol_70_to_rotovap_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Total Lost</span><span class="text-[9px] font-bold text-red-500">{((batch.ethanol_70_volume_l ?? 0) - (batch.total_ethanol_70_to_rotovap_l ?? 0)).toFixed(0)} L</span></div>
											</div>
										{:else if ci === 3}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Distillation</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Processed</span><span class="text-[9px] font-bold text-text-primary">{batch.total_ethanol_70_to_rotovap_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.total_ethanol_recovered_l?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Lost</span><span class="text-[9px] font-bold text-red-500">{batch.total_ethanol_loss_l?.toFixed(0) ?? '0'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Water Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.water_mother_liquid_l?.toFixed(0) ?? '—'} L</span></div>
											</div>
										{:else if ci === 4}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Acid/Base Extraction</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Avg pH</span><span class="text-[9px] font-bold text-text-primary">{batch.actual_ph_acid?.toFixed(1) ?? '—'} / {batch.actual_ph_base?.toFixed(1) ?? '—'}</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Used</span><span class="text-[9px] font-bold text-text-primary">{batch.limonene_volume_l?.toFixed(1) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.limonene_recovered_l?.toFixed(1) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Lost</span><span class="text-[9px] font-bold text-red-500">{batch.limonene_loss_l?.toFixed(1) ?? '0'} L</span></div>
											</div>
										{:else if ci === 5}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Precipitation</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Wet Weight</span><span class="text-[9px] font-bold text-text-primary">{batch.precipitate_weight_kg?.toFixed(1) ?? '—'} kg</span></div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
						<!-- Progress bar -->
						<div class="px-0.5 hover:bg-bg-card-hover transition-colors rounded py-0.5">
							<div class="h-1 w-full bg-border-card rounded-full overflow-hidden">
								<div class="h-full bg-primary rounded-full" style="width: {(completedStages / 8 * 100)}%"></div>
							</div>
							<p class="text-[7px] text-text-muted text-center mt-0.5">{completedStages}/8</p>
						</div>
						<!-- Current stage -->
						<div class="hover:bg-bg-card-hover transition-colors rounded py-0.5 px-0.5 overflow-hidden">
							<p class="text-[8px] font-bold text-text-secondary truncate">
								{#if batch.final_product_weight_kg != null}
									Done
								{:else if batch.precipitate_weight_kg != null}
									Drying
								{:else}
									{getStageName(batch.current_stage)}
								{/if}
							</p>
						</div>
						<!-- Next action -->
						<div class="text-center hover:bg-bg-card-hover transition-colors rounded py-0.5">
							<span class="text-[7px] font-bold uppercase px-1 py-0.5 rounded {nextAction(batch) === 'Review' ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}">{nextAction(batch)}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
	</div>

	<!-- Analytics Carousel - Intelligence Panels -->
	<div class="col-span-6 bg-bg-card border border-border-card rounded-xl px-4 pt-3 pb-2.5 flex flex-col">
		{#if carouselIndex === 0}
			<!-- ═══ COST INTELLIGENCE ═══ -->
			<!-- Header -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #6B8CA8;">payments</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Cost Intelligence</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.status}</span>
					{:else}
						<span class="text-[8px] text-text-muted/35">{runLabel}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{runCompletedBatches}/{runBatchCount} batches</span>
					{/if}
				</div>
			</div>
			<div class="flex items-baseline gap-1.5 mb-2">
				{#if selectedBatchId && selectedCostRow}
					<span class="text-base font-semibold text-text-primary">${Math.round(selectedCostRow.totalCost).toLocaleString()}</span>
					{#if selectedCostRow.costPerKg}
						<span class="text-[9px] text-text-muted/50">${Math.round(selectedCostRow.costPerKg)}/kg</span>
					{/if}
					<span class="text-[8px] text-text-muted/35">batch cost</span>
				{:else}
					<span class="text-base font-semibold text-text-primary">${runCostAgg ? Math.round(runCostAgg.totalCost).toLocaleString() : '—'}</span>
					{#if runCostAgg && rs}
						{@const costVar = runCostAgg.totalCost - (runCostAgg.projectedTotal * (runCompletedBatches / runBatchCount))}
						{#if costVar <= 0}
							<span class="text-[9px] font-medium" style="color: #8BAA7C;">-${Math.abs(Math.round(costVar)).toLocaleString()}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #C4896A;">+${Math.round(costVar).toLocaleString()}</span>
						{/if}
					{/if}
					<span class="text-[8px] text-text-muted/35">run total</span>
				{/if}
			</div>

			<!-- Mode toggle -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(55, 65, 81, 0.35);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'lot' ? 'background: rgba(107, 140, 168, 0.15);' : ''} onclick={() => costMode = 'lot'}>Current Lot</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'batch' ? 'background: rgba(107, 140, 168, 0.15);' : ''} onclick={() => costMode = 'batch'}>Batches</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'history' ? 'background: rgba(107, 140, 168, 0.15);' : ''} onclick={() => costMode = 'history'}>History</button>
			</div>

			{#if costMode === 'lot'}
				<!-- Area Chart -->
				<div class="mb-2">
					<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1">7-Day Trend</p>
					{#if costValues.length < 2}
						<svg viewBox="0 0 {CW} {CH}" class="w-full"><text x={CW / 2} y={CH / 2} text-anchor="middle" dominant-baseline="middle" fill="#4A5568" font-size="8">No data</text></svg>
					{:else}
						<svg viewBox="0 0 {CW} {CH}" class="w-full">
							<defs><linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6B8CA8" stop-opacity="0.22" /><stop offset="100%" stop-color="#6B8CA8" stop-opacity="0.02" /></linearGradient></defs>
							<line x1="10" y1={costTargetY} x2="230" y2={costTargetY} stroke="#4A5568" stroke-dasharray="3 4" stroke-width="0.5" opacity="0.5" />
							<text x="233" y={costTargetY + 3} text-anchor="end" fill="#4A5568" font-size="6" opacity="0.4">${DAILY_BUDGET}</text>
							<path d={costChart.area} fill="url(#costGrad)" /><path d={costChart.line} fill="none" stroke="#6B8CA8" stroke-width="1.5" opacity="0.7" />
							{#each costChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#6B8CA8" opacity="0.45" />{/each}
						</svg>
					{/if}
				</div>
				<!-- Cost Distribution (scoped to run) -->
				<div class="mb-2">
					<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1.5">Cost Distribution</p>
					{#if runCostAgg}
						{@const maxCatVal = Math.max(...runCostAgg.costByCategory.map(c => c.total), 1)}
						<div class="space-y-1.5">
							{#each runCostAgg.costByCategory as cat, i}
								<div class="flex items-center gap-2">
									<span class="text-[8px] text-text-muted w-[64px] flex-none">{cat.category}</span>
									<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
										<div class="h-full rounded-full" style="width: {(cat.total / maxCatVal) * 100}%; background: rgba(107, 140, 168, {[0.85, 0.65, 0.50, 0.38, 0.25][i] ?? 0.25});"></div>
									</div>
									<span class="text-[8px] font-medium text-text-secondary w-12 text-right flex-none">${Math.round(cat.total).toLocaleString()}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<!-- Bottom metrics -->
				<div class="grid grid-cols-4 gap-1.5 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Cost/Batch</p>
						<p class="text-[9px] font-semibold text-text-secondary">${runCostAgg ? Math.round(runCostAgg.avgCostPerBatch).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p>
						<p class="text-[9px] font-semibold text-text-secondary">${rs ? Math.round(rs.costPerKg).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Budget Var</p>
						<p class="text-[9px] font-semibold" style="color: {budgetVariance <= 0 ? '#8BAA7C' : '#C4896A'};">{((data.dailyOpCost - DAILY_BUDGET) / Math.max(DAILY_BUDGET, 1) * 100).toFixed(0)}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Projected</p>
						<p class="text-[9px] font-semibold text-text-secondary">${runCostAgg ? Math.round(runCostAgg.projectedTotal).toLocaleString() : '—'}</p>
					</div>
				</div>
			{:else if costMode === 'batch'}
				<!-- Batch breakdown table -->
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each data.runBatchCosts as bc}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === bc.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(bc.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">{bc.batch_number.replace('SG-', '')}</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {bc.status === 'Completed' ? 'bg-primary' : bc.status === 'In Progress' ? 'bg-blue-500' : bc.status === 'Pending Review' ? 'bg-amber-500' : bc.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
									<div class="h-full rounded-full" style="width: {avgBatchCostForBar > 0 ? Math.min(100, (bc.totalCost / avgBatchCostForBar) * 50) : 0}%; background: rgba(107, 140, 168, 0.6);"></div>
								</div>
								<span class="text-[8px] font-medium text-text-secondary w-14 text-right flex-none">${Math.round(bc.totalCost).toLocaleString()}</span>
								<span class="text-[7px] text-text-muted/35 w-12 text-right flex-none">{bc.costPerKg ? `$${Math.round(bc.costPerKg)}/kg` : '—'}</span>
							</button>
						{/each}
					</div>
				</div>
				<!-- Best/Worst badges -->
				{#if data.runBatchCosts.filter(c => c.totalCost > 0).length >= 2}
					{@const sorted = [...data.runBatchCosts].filter(c => c.totalCost > 0).sort((a, b) => a.totalCost - b.totalCost)}
					<div class="flex gap-2 mb-2">
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(139, 170, 124, 0.15); color: #8BAA7C;">Best: {sorted[0].batch_number.replace('SG-', '')} ${Math.round(sorted[0].totalCost).toLocaleString()}</span>
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(196, 137, 106, 0.15); color: #C4896A;">Worst: {sorted[sorted.length - 1].batch_number.replace('SG-', '')} ${Math.round(sorted[sorted.length - 1].totalCost).toLocaleString()}</span>
					</div>
				{/if}
				<!-- Bottom metrics -->
				<div class="grid grid-cols-4 gap-1.5 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Lowest</p>
						<p class="text-[9px] font-semibold text-text-secondary">${batchCostValues.length ? Math.round(Math.min(...batchCostValues)).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Highest</p>
						<p class="text-[9px] font-semibold text-text-secondary">${batchCostValues.length ? Math.round(Math.max(...batchCostValues)).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Median</p>
						<p class="text-[9px] font-semibold text-text-secondary">${sortedBatchCostValues.length ? Math.round(sortedBatchCostValues[Math.floor(sortedBatchCostValues.length / 2)]).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Batches</p>
						<p class="text-[9px] font-semibold text-text-secondary">{batchCostValues.length} of {runBatchCount}</p>
					</div>
				</div>
			{:else}
				<!-- History: cumulative cost curve -->
				<div class="flex-1 flex flex-col items-center justify-center py-4">
					{#if cumCostChart}
						<svg viewBox="0 0 {CW} {CH + 20}" class="w-full">
							<defs><linearGradient id="cumCostGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6B8CA8" stop-opacity="0.22" /><stop offset="100%" stop-color="#6B8CA8" stop-opacity="0.02" /></linearGradient></defs>
							<path d={cumCostChart.area} fill="url(#cumCostGrad)" /><path d={cumCostChart.line} fill="none" stroke="#6B8CA8" stroke-width="1.5" opacity="0.7" />
							{#each cumCostChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#6B8CA8" opacity="0.45" />{/each}
						</svg>
					{:else}
						<span class="text-[9px] text-text-muted/40">Not enough data for curve</span>
					{/if}
					<p class="text-[8px] text-text-muted/30 mt-2">1 production run — historical comparison available after 2+ runs</p>
				</div>
				<!-- Bottom metrics (same as lot) -->
				<div class="grid grid-cols-4 gap-1.5 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Cost/Batch</p>
						<p class="text-[9px] font-semibold text-text-secondary">${runCostAgg ? Math.round(runCostAgg.avgCostPerBatch).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p>
						<p class="text-[9px] font-semibold text-text-secondary">${rs ? Math.round(rs.costPerKg).toLocaleString() : '—'}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Budget Var</p>
						<p class="text-[9px] font-semibold" style="color: {budgetVariance <= 0 ? '#8BAA7C' : '#C4896A'};">{((data.dailyOpCost - DAILY_BUDGET) / Math.max(DAILY_BUDGET, 1) * 100).toFixed(0)}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Projected</p>
						<p class="text-[9px] font-semibold text-text-secondary">${runCostAgg ? Math.round(runCostAgg.projectedTotal).toLocaleString() : '—'}</p>
					</div>
				</div>
			{/if}
		{:else if carouselIndex === 1}
			<!-- ═══ SOLVENT INTELLIGENCE ═══ -->
			<!-- Header -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #8BAA7C;">water_drop</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Solvent Intelligence</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.status}</span>
					{:else}
						<span class="text-[8px] text-text-muted/35">{runLabel}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{runCompletedBatches}/{runBatchCount}</span>
					{/if}
				</div>
			</div>
			<div class="flex items-baseline gap-1.5 mb-2">
				{#if selectedBatchId && selectedEthRow}
					<span class="text-base font-semibold text-text-primary">{selectedEthRow.recovery_pct?.toFixed(1) ?? '—'}%</span>
					{#if selectedEthRow.recovery_pct !== null}
						{@const ethDelta = selectedEthRow.recovery_pct - ETH_RECOVERY_TARGET}
						{#if ethDelta >= 0}
							<span class="text-[9px] font-medium" style="color: #8BAA7C;">+{ethDelta.toFixed(1)}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #C4896A;">{ethDelta.toFixed(1)}</span>
						{/if}
					{/if}
					<span class="text-[8px] text-text-muted/35">batch recovery</span>
				{:else}
					<span class="text-base font-semibold text-text-primary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</span>
					{#if runEthDelta >= 0}
						<span class="text-[9px] font-medium" style="color: #8BAA7C;">+{runEthDelta.toFixed(1)}</span>
					{:else}
						<span class="text-[9px] font-medium" style="color: #C4896A;">{runEthDelta.toFixed(1)}</span>
					{/if}
					<span class="text-[8px] text-text-muted/35">run avg recovery</span>
				{/if}
			</div>

			<!-- Mode toggle -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(55, 65, 81, 0.35);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'lot' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => ethanolMode = 'lot'}>Current Lot</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'batch' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => ethanolMode = 'batch'}>Batches</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'history' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => ethanolMode = 'history'}>History</button>
			</div>

			{#if ethanolMode === 'lot'}
				<!-- Inline KPI row -->
				<div class="flex items-baseline gap-3 mb-2">
					<div class="flex items-baseline gap-1">
						<span class="text-[10px] font-semibold text-text-primary">{filtrationReturnL.toFixed(0)}</span>
						<span class="text-[8px] text-text-muted/50">L return</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="text-[10px] font-semibold" style="color: #8BAA7C;">{filtrateConcentration.toFixed(1)}</span>
						<span class="text-[8px] text-text-muted/50">g/L</span>
					</div>
				</div>

				<!-- Trend Chart with Toggle -->
				<div class="mb-2">
					<div class="flex items-center justify-between mb-1">
						<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60">Batch Trend</p>
						<div class="flex gap-px rounded overflow-hidden" style="border: 1px solid rgba(55, 65, 81, 0.35);">
							<button class="px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {selectedEthTrend === 'concentration' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={selectedEthTrend === 'concentration' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => selectedEthTrend = 'concentration'}>g/L</button>
							<button class="px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {selectedEthTrend === 'recovery' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={selectedEthTrend === 'recovery' ? 'background: rgba(107, 140, 168, 0.15);' : ''} onclick={() => selectedEthTrend = 'recovery'}>Recovery</button>
							<button class="px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {selectedEthTrend === 'filtration' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={selectedEthTrend === 'filtration' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => selectedEthTrend = 'filtration'}>Return</button>
						</div>
					</div>
					{#if selectedEthTrend === 'concentration'}
						{#if concValues.length < 2}
							<svg viewBox="0 0 {CW} {CH}" class="w-full"><text x={CW / 2} y={CH / 2} text-anchor="middle" dominant-baseline="middle" fill="#4A5568" font-size="8">No data</text></svg>
						{:else}
							<svg viewBox="0 0 {CW} {CH}" class="w-full">
								<defs><linearGradient id="concGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8BAA7C" stop-opacity="0.22" /><stop offset="100%" stop-color="#8BAA7C" stop-opacity="0.02" /></linearGradient></defs>
								<path d={concChart.area} fill="url(#concGrad)" /><path d={concChart.line} fill="none" stroke="#8BAA7C" stroke-width="1.5" opacity="0.7" />
								{#each concChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#8BAA7C" opacity="0.45" />{/each}
							</svg>
						{/if}
					{:else if selectedEthTrend === 'recovery'}
						{#if ethValues.length < 2}
							<svg viewBox="0 0 {CW} {CH}" class="w-full"><text x={CW / 2} y={CH / 2} text-anchor="middle" dominant-baseline="middle" fill="#4A5568" font-size="8">No data</text></svg>
						{:else}
							<svg viewBox="0 0 {CW} {CH}" class="w-full">
								<defs><linearGradient id="ethGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6B8CA8" stop-opacity="0.22" /><stop offset="100%" stop-color="#6B8CA8" stop-opacity="0.02" /></linearGradient></defs>
								<line x1="10" y1={ethTargetY} x2="230" y2={ethTargetY} stroke="#4A5568" stroke-dasharray="3 4" stroke-width="0.5" opacity="0.5" />
								<text x="233" y={ethTargetY + 3} text-anchor="end" fill="#4A5568" font-size="6" opacity="0.4">{ETH_RECOVERY_TARGET}%</text>
								<path d={ethChart.area} fill="url(#ethGrad)" /><path d={ethChart.line} fill="none" stroke="#6B8CA8" stroke-width="1.5" opacity="0.7" />
								{#each ethChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#6B8CA8" opacity="0.45" />{/each}
							</svg>
						{/if}
					{:else}
						{#if filtReturnValues.length < 2}
							<svg viewBox="0 0 {CW} {CH}" class="w-full"><text x={CW / 2} y={CH / 2} text-anchor="middle" dominant-baseline="middle" fill="#4A5568" font-size="8">No data</text></svg>
						{:else}
							<svg viewBox="0 0 {CW} {CH}" class="w-full">
								<defs><linearGradient id="filtGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8BAA7C" stop-opacity="0.22" /><stop offset="100%" stop-color="#8BAA7C" stop-opacity="0.02" /></linearGradient></defs>
								<path d={filtReturnChart.area} fill="url(#filtGrad)" /><path d={filtReturnChart.line} fill="none" stroke="#8BAA7C" stroke-width="1.5" opacity="0.7" />
								{#each filtReturnChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#8BAA7C" opacity="0.45" />{/each}
							</svg>
						{/if}
					{/if}
				</div>

				<!-- Solvent Path -->
				<div class="flex items-center gap-1.5 mb-2 py-1.5 px-2 rounded" style="background: rgba(55, 65, 81, 0.15);">
					<div class="flex items-center gap-1">
						<span class="h-1 w-1 rounded-full" style="background: rgba(107, 140, 168, 0.8);"></span>
						<span class="text-[8px] text-text-muted/50">Issued</span>
						<span class="text-[8px] font-medium text-text-secondary">{data.solventTotals.ethanol_issued.toFixed(0)}L</span>
					</div>
					<span class="text-[8px] text-text-muted/20">&rarr;</span>
					<div class="flex items-center gap-1">
						<span class="h-1 w-1 rounded-full" style="background: rgba(139, 170, 124, 0.8);"></span>
						<span class="text-[8px] text-text-muted/50">Filt.</span>
						<span class="text-[8px] font-medium text-text-secondary">{filtrationReturnL.toFixed(0)}L</span>
					</div>
					<span class="text-[8px] text-text-muted/20">&rarr;</span>
					<div class="flex items-center gap-1">
						<span class="h-1 w-1 rounded-full" style="background: rgba(107, 140, 168, 0.6);"></span>
						<span class="text-[8px] text-text-muted/50">Recov.</span>
						<span class="text-[8px] font-medium text-text-secondary">{data.solventTotals.ethanol_recovered.toFixed(0)}L</span>
					</div>
					<span class="text-[8px] text-text-muted/20">&rarr;</span>
					<div class="flex items-center gap-1">
						<span class="h-1 w-1 rounded-full" style="background: rgba(196, 137, 106, 0.5);"></span>
						<span class="text-[8px] text-text-muted/50">Loss</span>
						<span class="text-[8px] font-medium" style="color: #C4896A;">{totalEthLoss.toFixed(0)}L</span>
					</div>
				</div>
				<!-- D-Limo sub-row -->
				<div class="flex items-center gap-3 mb-2" style="border-top: 1px solid rgba(55, 65, 81, 0.15); padding-top: 4px;">
					<span class="text-[7px] font-medium uppercase text-text-muted/25">D-Limo</span>
					<span class="text-[7px] text-text-muted/35">Rec. <span class="text-text-muted/55 font-medium">{data.solventTotals.limonene_recovered.toFixed(1)}L</span></span>
					<span class="text-[7px] text-text-muted/35">Lost <span class="font-medium" style="color: rgba(196, 137, 106, 0.45);">{data.solventTotals.limonene_lost.toFixed(1)}L</span></span>
				</div>
				<!-- Bottom metrics -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Issued</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.totalIssued.toFixed(0) ?? '—'} L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Filt. Ret.</p>
						<p class="text-[9px] font-semibold text-text-secondary">{filtrationReturnL.toFixed(0)} L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Strength</p>
						<p class="text-[9px] font-semibold" style="color: #8BAA7C;">{filtrateConcentration.toFixed(1)} g/L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Recovery</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Loss</p>
						<p class="text-[9px] font-semibold" style="color: #C4896A;">{runEthAgg?.totalLoss.toFixed(0) ?? '—'} L</p>
					</div>
				</div>
			{:else if ethanolMode === 'batch'}
				<!-- Batch ethanol breakdown table -->
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each data.runEthanolBreakdown as eb}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === eb.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(eb.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">{eb.batch_number.replace('SG-', '')}</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {eb.status === 'Completed' ? 'bg-primary' : eb.status === 'In Progress' ? 'bg-blue-500' : eb.status === 'Pending Review' ? 'bg-amber-500' : eb.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								{#if eb.recovery_pct !== null}
									<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
										<div class="h-full rounded-full" style="width: {Math.min(100, eb.recovery_pct)}%; background: {eb.recovery_pct < 93 ? 'rgba(196, 137, 106, 0.7)' : eb.recovery_pct < 95 ? 'rgba(196, 180, 106, 0.7)' : 'rgba(139, 170, 124, 0.7)'};"></div>
									</div>
									<span class="text-[8px] font-medium w-10 text-right flex-none" style="color: {eb.recovery_pct < 93 ? '#C4896A' : '#8BAA7C'};">{eb.recovery_pct.toFixed(1)}%</span>
								{:else}
									<div class="flex-1 h-1 rounded-full" style="background: rgba(55, 65, 81, 0.15);"></div>
									<span class="text-[7px] text-text-muted/30 w-10 text-right flex-none">—</span>
								{/if}
								<span class="text-[7px] text-text-muted/35 w-10 text-right flex-none">{eb.ethanol_lost_l?.toFixed(0) ?? '—'}L</span>
							</button>
						{/each}
					</div>
				</div>
				<!-- Best/Worst badges -->
				{#if runEthAgg?.bestBatch && runEthAgg?.worstBatch}
					<div class="flex gap-2 mb-2">
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(139, 170, 124, 0.15); color: #8BAA7C;">Best: {runEthAgg.bestBatch.batch_number.replace('SG-', '')} {runEthAgg.bestBatch.recovery_pct.toFixed(1)}%</span>
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(196, 137, 106, 0.15); color: #C4896A;">Worst: {runEthAgg.worstBatch.batch_number.replace('SG-', '')} {runEthAgg.worstBatch.recovery_pct.toFixed(1)}%</span>
					</div>
				{/if}
				<!-- Bottom metrics -->
				<div class="grid grid-cols-4 gap-1.5 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Best Rec.</p>
						<p class="text-[9px] font-semibold" style="color: #8BAA7C;">{runEthAgg?.bestBatch?.recovery_pct.toFixed(1) ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Worst Rec.</p>
						<p class="text-[9px] font-semibold" style="color: #C4896A;">{runEthAgg?.worstBatch?.recovery_pct.toFixed(1) ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Avg</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Total Loss</p>
						<p class="text-[9px] font-semibold" style="color: #C4896A;">{runEthAgg?.totalLoss.toFixed(0) ?? '—'} L</p>
					</div>
				</div>
			{:else}
				<!-- History: run aggregate solvent balance -->
				<div class="flex-1 flex flex-col items-center justify-center py-4">
					{#if runEthAgg}
						{@const issued = runEthAgg.totalIssued}
						{@const recovered = runEthAgg.totalRecovered}
						{@const lost = runEthAgg.totalLoss}
						{@const maxVal = Math.max(issued, 1)}
						<div class="w-full space-y-2 px-4">
							<div class="flex items-center gap-2">
								<span class="text-[8px] text-text-muted w-16">Issued</span>
								<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
									<div class="h-full rounded-full" style="width: 100%; background: rgba(107, 140, 168, 0.6);"></div>
								</div>
								<span class="text-[8px] font-medium text-text-secondary w-14 text-right">{issued.toFixed(0)} L</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-[8px] text-text-muted w-16">Recovered</span>
								<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
									<div class="h-full rounded-full" style="width: {(recovered / maxVal) * 100}%; background: rgba(139, 170, 124, 0.6);"></div>
								</div>
								<span class="text-[8px] font-medium text-text-secondary w-14 text-right">{recovered.toFixed(0)} L</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-[8px] text-text-muted w-16">Lost</span>
								<div class="flex-1 h-2 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
									<div class="h-full rounded-full" style="width: {(lost / maxVal) * 100}%; background: rgba(196, 137, 106, 0.6);"></div>
								</div>
								<span class="text-[8px] font-medium w-14 text-right" style="color: #C4896A;">{lost.toFixed(0)} L</span>
							</div>
						</div>
					{/if}
					<p class="text-[8px] text-text-muted/30 mt-3">1 production run — historical comparison available after 2+ runs</p>
				</div>
				<!-- Bottom metrics (same as lot) -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Issued</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.totalIssued.toFixed(0) ?? '—'} L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Filt. Ret.</p>
						<p class="text-[9px] font-semibold text-text-secondary">{filtrationReturnL.toFixed(0)} L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Strength</p>
						<p class="text-[9px] font-semibold" style="color: #8BAA7C;">{filtrateConcentration.toFixed(1)} g/L</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Recovery</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Loss</p>
						<p class="text-[9px] font-semibold" style="color: #C4896A;">{runEthAgg?.totalLoss.toFixed(0) ?? '—'} L</p>
					</div>
				</div>
			{/if}
		{:else}
			<!-- ═══ YIELD & QUALITY ═══ -->
			<!-- Header -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #8BAA7C;">science</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Yield & Quality</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.status}</span>
					{:else}
						<span class="text-[8px] text-text-muted/35">{runLabel}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{runCompletedBatches}/{runBatchCount}</span>
					{/if}
				</div>
			</div>
			<div class="flex items-baseline gap-1.5 mb-2">
				{#if selectedBatchId && selectedYieldRow}
					<span class="text-base font-semibold text-text-primary">{selectedYieldRow.final_product_weight_kg?.toFixed(2) ?? '—'} kg</span>
					<span class="text-[9px] text-text-muted/50">{selectedYieldRow.cumulative_yield_pct?.toFixed(2) ?? '—'}%</span>
					{#if selectedYieldRow.cumulative_yield_pct !== null}
						{@const yieldDiff = selectedYieldRow.cumulative_yield_pct - (runYieldAgg?.overallYield ?? 0)}
						{#if yieldDiff >= 0}
							<span class="text-[9px] font-medium" style="color: #8BAA7C;">+{yieldDiff.toFixed(2)}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #C4896A;">{yieldDiff.toFixed(2)}</span>
						{/if}
						<span class="text-[8px] text-text-muted/35">vs run avg</span>
					{/if}
				{:else}
					<span class="text-base font-semibold text-text-primary">{runYieldAgg?.totalProduced.toFixed(2) ?? '—'} kg</span>
					<span class="text-[9px] text-text-muted/50">{runYieldAgg?.overallYield.toFixed(2) ?? '—'}%</span>
					{#if runYieldAgg}
						{@const yd = runYieldAgg.overallYield - avgYield}
						{#if yd >= 0}
							<span class="text-[9px] font-medium" style="color: #8BAA7C;">+{yd.toFixed(2)}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #C4896A;">{yd.toFixed(2)}</span>
						{/if}
					{/if}
				{/if}
			</div>

			<!-- Mode toggle -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(55, 65, 81, 0.35);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'lot' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => yieldMode = 'lot'}>Current Lot</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'batch' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => yieldMode = 'batch'}>Batches</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'history' ? 'background: rgba(139, 170, 124, 0.15);' : ''} onclick={() => yieldMode = 'history'}>History</button>
			</div>

			{#if yieldMode === 'lot'}
				<!-- Inline KPIs -->
				<div class="flex items-baseline gap-3 mb-2">
					<div class="flex items-baseline gap-1">
						<span class="text-[10px] font-semibold text-text-primary">{runYieldAgg?.totalProduced.toFixed(2) ?? '—'}</span>
						<span class="text-[8px] text-text-muted/50">kg produced</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="text-[10px] font-semibold text-text-muted/50">{rs?.run.target_kg ?? 1000}</span>
						<span class="text-[8px] text-text-muted/30">kg target input</span>
					</div>
				</div>
				<!-- Yield trend chart -->
				<div class="mb-2">
					<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1">Batch Yield Trend</p>
					{#if yieldValues.length < 2}
						<svg viewBox="0 0 {CW} {CH}" class="w-full"><text x={CW / 2} y={CH / 2} text-anchor="middle" dominant-baseline="middle" fill="#4A5568" font-size="8">No data</text></svg>
					{:else}
						<svg viewBox="0 0 {CW} {CH}" class="w-full">
							<defs><linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8BAA7C" stop-opacity="0.22" /><stop offset="100%" stop-color="#8BAA7C" stop-opacity="0.02" /></linearGradient></defs>
							<line x1="10" y1={yieldTargetY} x2="230" y2={yieldTargetY} stroke="#4A5568" stroke-dasharray="3 4" stroke-width="0.5" opacity="0.5" />
							<text x="233" y={yieldTargetY + 3} text-anchor="end" fill="#4A5568" font-size="6" opacity="0.4">{YIELD_TARGET}%</text>
							<path d={yieldChart.area} fill="url(#yieldGrad)" /><path d={yieldChart.line} fill="none" stroke="#8BAA7C" stroke-width="1.5" opacity="0.7" />
							{#each yieldChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#8BAA7C" opacity="0.45" />{/each}
						</svg>
					{/if}
				</div>
				<!-- Material Conversion + Quality — compact side-by-side -->
				<div class="grid grid-cols-2 gap-3 mb-2">
					<div>
						<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1.5">Conversion</p>
						<div class="space-y-0">
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.9);"></span>
								<span class="text-[8px] text-text-muted flex-1">Leaf</span>
								<span class="text-[8px] font-medium text-text-secondary">{processedKg.toFixed(0)} kg</span>
							</div>
							<div class="flex items-center gap-1.5 py-px">
								<div class="w-1 flex justify-center"><div class="w-px h-2" style="background: rgba(139, 170, 124, 0.25);"></div></div>
								<span class="text-[7px] text-text-muted/35">{grindingYield.toFixed(0)}%</span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.6);"></span>
								<span class="text-[8px] text-text-muted flex-1">Powder</span>
								<span class="text-[8px] font-medium text-text-secondary">{pm.totalPowderKg.toFixed(1)} kg</span>
							</div>
							<div class="flex items-center gap-1.5 py-px">
								<div class="w-1 flex justify-center"><div class="w-px h-2" style="background: rgba(139, 170, 124, 0.25);"></div></div>
								<span class="text-[7px] text-text-muted/35">{extractionYield.toFixed(1)}%</span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.35);"></span>
								<span class="text-[8px] text-text-muted flex-1">Extract</span>
								<span class="text-[8px] font-medium text-text-secondary">{data.totalFinalYield.producedKg.toFixed(2)} kg</span>
							</div>
						</div>
					</div>
					<div>
						<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1.5">Quality</p>
						{#if hplcCompleted && hplc}
							<div class="space-y-1">
								<div class="flex justify-between">
									<span class="text-[8px] text-text-muted">Mitragynine</span>
									<span class="text-[8px] font-medium text-text-secondary">{hplc.mitragynine_pct?.toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-[8px] text-text-muted">7-OH-M</span>
									<span class="text-[8px] font-medium text-text-secondary">{hplc.hydroxy_mitragynine_pct?.toFixed(1)}%</span>
								</div>
								<div class="flex justify-between">
									<span class="text-[8px] text-text-muted">Purity</span>
									<span class="text-[8px] font-medium text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? hplc.hplc_purity_pct?.toFixed(1)}%</span>
								</div>
								{#if totalAlkaloids !== null}
									<div class="flex justify-between">
										<span class="text-[8px] text-text-muted">Total Alk.</span>
										<span class="text-[8px] font-medium text-text-secondary">{totalAlkaloids.toFixed(1)}%</span>
									</div>
								{/if}
								<div class="flex items-center gap-1">
									<span class="h-1 w-1 rounded-full" style="background: #8BAA7C;"></span>
									<span class="text-[7px] font-medium" style="color: #8BAA7C;">HPLC Verified</span>
								</div>
							</div>
						{:else if hplc}
							<div class="flex flex-col items-center justify-center gap-1 py-2">
								<span class="material-symbols-outlined text-[14px]" style="color: #C4896A;">hourglass_top</span>
								<span class="text-[8px] font-medium" style="color: #C4896A;">{hplc.status}</span>
							</div>
						{:else}
							<div class="flex flex-col items-center justify-center gap-1 py-2">
								<span class="material-symbols-outlined text-[14px] text-text-muted/25">science</span>
								<span class="text-[8px] text-text-muted/40">No HPLC data</span>
							</div>
						{/if}
					</div>
				</div>
				<!-- Bottom metrics -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Produced</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.totalProduced.toFixed(2) ?? '—'} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Target</p>
						<p class="text-[9px] font-semibold text-text-secondary">{data.totalFinalYield.targetKg.toFixed(0)} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Avg Yield</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.overallYield.toFixed(2) ?? avgYield.toFixed(2)}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Projected</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.projectedFinal.toFixed(1) ?? '—'} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Purity</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p>
					</div>
				</div>
			{:else if yieldMode === 'batch'}
				<!-- Batch yield breakdown table -->
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each data.runYieldBreakdown as yb}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === yb.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(yb.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">{yb.batch_number.replace('SG-', '')}</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {yb.status === 'Completed' ? 'bg-primary' : yb.status === 'In Progress' ? 'bg-blue-500' : yb.status === 'Pending Review' ? 'bg-amber-500' : yb.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								{#if yb.final_product_weight_kg !== null}
									<span class="text-[7px] text-text-muted w-10 text-right flex-none">{yb.leaf_input_kg}kg</span>
									<span class="text-[7px] text-text-muted/30">&rarr;</span>
									<span class="text-[7px] text-text-secondary w-10 flex-none">{yb.final_product_weight_kg}kg</span>
									<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(55, 65, 81, 0.3);">
										<div class="h-full rounded-full" style="width: {Math.min(100, (yb.cumulative_yield_pct ?? 0) * 10)}%; background: rgba(139, 170, 124, 0.6);"></div>
									</div>
									<span class="text-[8px] font-medium text-text-secondary w-10 text-right flex-none">{yb.cumulative_yield_pct?.toFixed(1)}%</span>
								{:else}
									<div class="flex-1 h-1 rounded-full" style="background: rgba(55, 65, 81, 0.15);"></div>
									<span class="text-[7px] text-text-muted/30 w-10 text-right flex-none">—</span>
								{/if}
								{#if yb.deviation_count > 0}
									<span class="h-1.5 w-1.5 rounded-full bg-red-500 flex-none" title="{yb.deviation_count} deviations"></span>
								{/if}
							</button>
						{/each}
					</div>
				</div>
				<!-- Best/Worst badges -->
				{#if runYieldAgg?.bestBatch && runYieldAgg?.worstBatch}
					<div class="flex gap-2 mb-2">
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(139, 170, 124, 0.15); color: #8BAA7C;">Best: {runYieldAgg.bestBatch.batch_number.replace('SG-', '')} {runYieldAgg.bestBatch.yield_pct}%</span>
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(196, 137, 106, 0.15); color: #C4896A;">Worst: {runYieldAgg.worstBatch.batch_number.replace('SG-', '')} {runYieldAgg.worstBatch.yield_pct}%</span>
					</div>
				{/if}
				<!-- Bottom metrics -->
				<div class="grid grid-cols-4 gap-1.5 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Best Yield</p>
						<p class="text-[9px] font-semibold" style="color: #8BAA7C;">{runYieldAgg?.bestBatch?.yield_pct ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Worst Yield</p>
						<p class="text-[9px] font-semibold" style="color: #C4896A;">{runYieldAgg?.worstBatch?.yield_pct ?? '—'}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Deviations</p>
						<p class="text-[9px] font-semibold" style="color: {(runYieldAgg?.totalDeviations ?? 0) > 0 ? '#C4896A' : 'inherit'};">{runYieldAgg?.totalDeviations ?? 0}</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Avg Purity</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p>
					</div>
				</div>
			{:else}
				<!-- History: cumulative production curve -->
				<div class="flex-1 flex flex-col items-center justify-center py-4">
					{#if cumYieldChart}
						<svg viewBox="0 0 {CW} {CH + 20}" class="w-full">
							<defs><linearGradient id="cumYieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8BAA7C" stop-opacity="0.22" /><stop offset="100%" stop-color="#8BAA7C" stop-opacity="0.02" /></linearGradient></defs>
							<!-- Target line -->
							<line x1="10" y1={cumYieldTargetY} x2="230" y2={cumYieldTargetY} stroke="#4A5568" stroke-dasharray="3 4" stroke-width="0.5" opacity="0.3" />
							<text x="233" y={cumYieldTargetY + 3} text-anchor="end" fill="#4A5568" font-size="5" opacity="0.3">{runYieldAgg?.projectedFinal.toFixed(0)}kg</text>
							<path d={cumYieldChart.area} fill="url(#cumYieldGrad)" /><path d={cumYieldChart.line} fill="none" stroke="#8BAA7C" stroke-width="1.5" opacity="0.7" />
							{#each cumYieldChart.points as pt}<circle cx={pt.x} cy={pt.y} r="1.5" fill="#8BAA7C" opacity="0.45" />{/each}
						</svg>
					{:else}
						<span class="text-[9px] text-text-muted/40">Not enough data for curve</span>
					{/if}
					<p class="text-[8px] text-text-muted/30 mt-2">1 production run — historical comparison available after 2+ runs</p>
				</div>
				<!-- Bottom metrics (same as lot) -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(55, 65, 81, 0.3);">
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Produced</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.totalProduced.toFixed(2) ?? '—'} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Target</p>
						<p class="text-[9px] font-semibold text-text-secondary">{data.totalFinalYield.targetKg.toFixed(0)} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Avg Yield</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.overallYield.toFixed(2) ?? avgYield.toFixed(2)}%</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Projected</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.projectedFinal.toFixed(1) ?? '—'} kg</p>
					</div>
					<div>
						<p class="text-[7px] text-text-muted/40 uppercase">Purity</p>
						<p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Carousel navigation -->
		<div class="flex items-center justify-center gap-1.5 pt-2 mt-auto" style="border-top: 1px solid rgba(55, 65, 81, 0.3);">
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 0 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 0}>Cost</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 1 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 1}>Ethanol</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 2 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 2}>Yield</button>
		</div>
	</div>

</div>

<!-- Batch Detail Drawer -->
<BatchDrawer batchId={drawerBatchId} runId={data.activeRunId} onclose={() => drawerBatchId = null} />
