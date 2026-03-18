<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import { fmt, TARGETS } from '$lib/config/costs';
	import BatchDrawer from '$lib/components/ui/BatchDrawer.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pm = data.pipeline;
	const totalBatchCount = data.activeBatchProgress.length;
	const TOTAL_INTAKE_KG = data.activeBatchProgress.reduce((s, b) => s + (b.leaf_input_kg ?? 0), 0);

	// KPI: Active lots (currently in progress)
	const activeLots = data.activeBatchProgress.filter(b => b.status === 'In Progress').length;
	const lotsProcessed = pm.stageCounts[1] ?? 0;
	const lotsRemaining = Math.max(0, totalBatchCount - lotsProcessed);
	const kgRemaining = Math.max(0, TOTAL_INTAKE_KG - (lotsProcessed * 100));

	// KPI: Completed lots
	const completedLots = pm.completedCount;
	const completedKg = data.totalFinalYield.producedKg;
	const totalKgRemaining = Math.max(0, data.totalFinalYield.targetKg - completedKg);

	// KPI: Throughput
	const processedKg = lotsProcessed * 100;
	const intakePct = TOTAL_INTAKE_KG > 0 ? Math.min(100, (processedKg / TOTAL_INTAKE_KG) * 100) : 0;
	const remainingKg = Math.max(0, TOTAL_INTAKE_KG - processedKg);

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
	const notchSteps = [
		{ label: 'Powder', stage: 1 },
		{ label: 'Filtration', stage: 2 },
		{ label: 'A/B', stage: 3 },
		{ label: 'Drying', stage: 4 }
	];

	// Lot progress table columns (7 visual columns mapping to 4 DB stages)
	const TABLE_COLUMNS = [
		{ label: 'Powder', dbStages: [1] },
		{ label: 'EtOH', dbStages: [2] },
		{ label: 'Filt.', dbStages: [2] },
		{ label: 'Dist.', dbStages: [2] },
		{ label: 'A/B', dbStages: [3] },
		{ label: 'Prec.', dbStages: [4] },
		{ label: 'Final Yield', dbStages: [4] }
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

	// Daily yield: final product kg / days of operation (lot-scoped)
	const totalFinalKg = data.totalFinalYield.producedKg;

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
	const costPerKgTarget = TARGETS.costPerKg;

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
	const DAILY_BUDGET = TARGETS.dailyBudget;
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

	// 3-mode intelligence panel state (quality mode only for yield card)
	type CardMode = 'lot' | 'batch' | 'history' | 'quality';
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
	const yieldFinishedBatches = data.runYieldBreakdown.filter(y => y.final_product_g !== null);
	const cumYieldValues = yieldFinishedBatches.reduce((acc, y) => { acc.push((acc[acc.length - 1] ?? 0) + ((y.final_product_g ?? 0) / 1000)); return acc; }, [] as number[]);
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

	// Lot selector: group batches by supplier_lot (each lot = 1 ton)
	const allLots = $derived(() => {
		const lots = [...new Set(data.activeBatchProgress.map(b => b.supplier_lot).filter(Boolean))] as string[];
		lots.sort();
		return lots;
	});
	let selectedLot: string | null = $state(null);
	const activeLot = $derived(selectedLot ?? allLots()[0] ?? null);
	const lotBatches = $derived(() => {
		if (!activeLot) return data.activeBatchProgress;
		return data.activeBatchProgress.filter(b => b.supplier_lot === activeLot);
	});
	const lotIntakeKg = $derived(lotBatches().reduce((sum, b) => sum + (b.leaf_input_kg ?? 0), 0));
	const lotProcessedCount = $derived(lotBatches().filter(b => b.stages.some(s => s.status === 'Finalized')).length);
	const lotCompletePct = $derived(lotBatches().length > 0 ? (lotBatches().filter(b => b.final_product_g != null).length / lotBatches().length * 100) : 0);

	// Lot-scoped KPI values
	const lotActiveBatches = $derived(lotBatches().filter(b => b.status === 'In Progress').length);
	const lotCompletedBatches = $derived(lotBatches().filter(b => b.final_product_g != null).length);
	const lotRemainingBatches = $derived(Math.max(0, lotBatches().length - lotCompletedBatches));
	const lotEtohIssued = $derived(lotBatches().reduce((s, b) => s + (b.etoh_vol_L ?? 0), 0));
	const lotEtohRecovered = $derived(lotBatches().reduce((s, b) => s + (b.etoh_recovered_L ?? 0), 0));
	const lotEtohLost = $derived(lotBatches().reduce((s, b) => s + (b.etoh_lost_L ?? 0), 0));
	const lotEtohRecoveryPct = $derived(lotEtohIssued > 0 ? (lotEtohRecovered / lotEtohIssued * 100) : 0);
	const lotDlimoIssued = $derived(lotBatches().reduce((s, b) => s + (b.dlimo_vol_L ?? 0), 0));
	const lotDlimoRecovered = $derived(lotBatches().reduce((s, b) => s + (b.dlimo_recovered_L ?? 0), 0));
	const lotDlimoLost = $derived(lotBatches().reduce((s, b) => s + (b.dlimo_lost_L ?? 0), 0));
	const lotFinalProductG = $derived(lotBatches().reduce((s, b) => s + (b.final_product_g ?? 0), 0));
	const lotFinalProductKg = $derived(lotFinalProductG / 1000);
	const lotExtractRate = $derived(lotIntakeKg > 0 ? (lotFinalProductKg / lotIntakeKg * 100) : 0);

	// Lot-scoped operation days: from earliest batch start to last completion (or now if still active)
	const lotOperationDays = $derived(() => {
		const batches = lotBatches();
		const startDates = batches
			.map(b => b.started_at || b.created_at)
			.filter((d): d is string => d != null)
			.map(d => new Date(d).getTime());
		if (startDates.length === 0) return 1;
		const earliest = Math.min(...startDates);
		const lotComplete = batches.every(b => b.status === 'Completed' || b.status === 'Pending Review');
		let latest: number;
		if (lotComplete) {
			const endDates = batches
				.map(b => b.completed_at)
				.filter((d): d is string => d != null)
				.map(d => new Date(d).getTime());
			latest = endDates.length > 0 ? Math.max(...endDates) : Math.max(...startDates);
		} else {
			latest = Date.now();
		}
		return Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)));
	});
	const lotDailyYieldKg = $derived(lotOperationDays() > 0 ? lotFinalProductKg / lotOperationDays() : 0);

	// Lot-scoped pipeline metrics derived from lotBatches
	const lotPowderKg = $derived(Number(lotBatches().reduce((s, b) => s + (b.powder_output_kg ?? 0), 0).toFixed(1)));
	const lotEtohStockUsedL = $derived(Number(lotEtohIssued.toFixed(1)));
	const lotFiltrationOutputL = $derived(Number(lotBatches().reduce((s, b) => s + (b.filtrate_vol_L ?? 0), 0).toFixed(1)));
	const lotFiltrationLossL = $derived(Number((lotEtohIssued - lotFiltrationOutputL).toFixed(1)));
	const lotFiltrationPct = $derived(lotEtohIssued > 0 ? (lotFiltrationOutputL / lotEtohIssued * 100).toFixed(1) : '0');
	const lotDistillationPct = $derived(lotFiltrationOutputL > 0 ? (lotEtohRecovered / lotFiltrationOutputL * 100).toFixed(1) : '0');
	const lotExtractTotalKg = $derived(Number(lotBatches().reduce((s, b) => s + (b.crude_extract_wt_kg ?? 0), 0).toFixed(1)));
	const lotPrecipitateKg = $derived(Number((lotBatches().reduce((s, b) => s + (b.wet_precipitate_g ?? 0), 0) / 1000).toFixed(1)));
	const lotDlimoRecoveredL = $derived(Number(lotDlimoRecovered.toFixed(1)));
	const lotDlimoLostL = $derived(Number(lotDlimoLost.toFixed(1)));
	const lotLotsExtracted = $derived(lotBatches().filter(b => b.etoh_vol_L != null && b.etoh_vol_L > 0).length);

	// ── Donut segment helper (Cost card) ──
	const DONUT_R = 46;
	const DONUT_CIRC = 2 * Math.PI * DONUT_R;
	const costDonutSegments = $derived.by(() => {
		if (!runCostAgg || !runCostAgg.costByCategory.length) return [];
		const total = runCostAgg.totalCost || 1;
		const opacities = [0.85, 0.65, 0.50, 0.38];
		const gap = 4;
		let cumOffset = 0;
		return runCostAgg.costByCategory.map((cat, i) => {
			const pct = cat.total / total;
			const filled = Math.max(0, pct * DONUT_CIRC - gap);
			const seg = { category: cat.category, total: cat.total, pct, filled, gap, offset: cumOffset, opacity: opacities[i] ?? 0.25 };
			cumOffset += filled + gap;
			return seg;
		});
	});

	// ── Solvent loss decomposition ──
	const lotDistillationLossL = $derived(Math.max(0, lotFiltrationOutputL - lotEtohRecovered));
	const lotOtherLossL = $derived(Math.max(0, lotEtohLost - Math.abs(lotFiltrationLossL) - lotDistillationLossL));
	const bestHistoricalRecovery = $derived(data.runHistory.length > 0 ? Math.max(...data.runHistory.map(r => r.avgEthanolRecovery)) : 0);

	// ── Yield cascade conversions ──
	const lotPowderConvPct = $derived(lotIntakeKg > 0 ? (lotPowderKg / lotIntakeKg) * 100 : 0);
	const lotExtractConvPct = $derived(lotPowderKg > 0 ? (lotExtractTotalKg / lotPowderKg) * 100 : 0);
	const lotFinalConvPct = $derived(lotExtractTotalKg > 0 ? (lotFinalProductKg / lotExtractTotalKg) * 100 : 0);

	// ── Yield loss per stage ──
	const lotGrindLossKg = $derived(Math.max(0, lotIntakeKg - lotPowderKg));
	const lotExtractionLossKg = $derived(Math.max(0, lotPowderKg - lotExtractTotalKg));
	const lotPrecipLossKg = $derived(Math.max(0, lotExtractTotalKg - lotFinalProductKg));

	// Lot-scoped pipeline: stage fill based on finalized stages within the lot
	const lotStageCounts = $derived(() => {
		const counts: Record<number, number> = {};
		for (const b of lotBatches()) {
			for (const s of b.stages) {
				if (s.status === 'Finalized') {
					counts[s.stage_number] = (counts[s.stage_number] ?? 0) + 1;
				}
			}
		}
		return counts;
	});
	const lotBatchCount = $derived(lotBatches().length);
	const mainSteps = $derived(() => {
		function lotStageFill(stageNumber: number): number {
			if (lotBatchCount === 0) return 0;
			return Math.min(100, ((lotStageCounts()[stageNumber] ?? 0) / lotBatchCount) * 100);
		}
		return [
			{ icon: 'fa-leaf', label: 'Raw Material', href: '/stages/1', fillPct: lotStageFill(1) },
			{ icon: 'fa-flask-vial', label: 'EtOH', href: '/stages/2', fillPct: lotStageFill(2) },
			{ icon: 'fa-fire', label: 'Distillation', href: '/stages/2', fillPct: lotStageFill(2) },
			{ icon: 'fa-snowflake', label: 'Precipitation', href: '/stages/4', fillPct: lotStageFill(4), cluster: true },
			{ icon: 'fa-gem', label: 'Final Yield', href: '/stages/4', fillPct: lotStageFill(4) }
		].map(s => ({ ...s, ringFilled: (s.fillPct / 100) * RING_CIRC }));
	});

	// Lot sort: 'active' = in-progress first, 'completed' = completed first (bottom)
	let lotSort: 'active' | 'completed' = $state('active');
	const sortedBatches = $derived(() => {
		const batches = [...lotBatches()];
		if (lotSort === 'completed') {
			batches.sort((a, b) => {
				const aComplete = a.final_product_g != null ? 1 : 0;
				const bComplete = b.final_product_g != null ? 1 : 0;
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

	// Run history derived values
	const currentRunHistory = $derived(data.runHistory.find(r => r.runId === data.activeRunId));
	const previousRunHistory = $derived(data.runHistory.find(r => r.runId !== data.activeRunId && r.status === 'Completed'));
	const hasHistory = $derived(data.runHistory.length >= 2);

	const comparisonTarget = $derived.by(() => {
		if (compareMode === 'previous') return previousRunHistory;
		if (compareMode === 'avg5') {
			const completed = data.runHistory.filter(r => r.status === 'Completed');
			if (!completed.length) return null;
			const n = completed.length;
			return {
				runId: 0, runNumber: `Avg(${n})`, status: 'Completed', startedAt: null, completedAt: null,
				totalBatches: Math.round(completed.reduce((a, r) => a + r.totalBatches, 0) / n),
				completedBatches: Math.round(completed.reduce((a, r) => a + r.completedBatches, 0) / n),
				totalInputKg: completed.reduce((a, r) => a + r.totalInputKg, 0) / n,
				totalProducedKg: completed.reduce((a, r) => a + r.totalProducedKg, 0) / n,
				overallYieldPct: completed.reduce((a, r) => a + r.overallYieldPct, 0) / n,
				totalCost: completed.reduce((a, r) => a + r.totalCost, 0) / n,
				costPerKg: completed.reduce((a, r) => a + r.costPerKg, 0) / n,
				avgCostPerBatch: completed.reduce((a, r) => a + r.avgCostPerBatch, 0) / n,
				avgEthanolRecovery: completed.reduce((a, r) => a + r.avgEthanolRecovery, 0) / n,
				totalEthanolIssued: completed.reduce((a, r) => a + r.totalEthanolIssued, 0) / n,
				totalEthanolRecovered: completed.reduce((a, r) => a + r.totalEthanolRecovered, 0) / n,
				totalEthanolLost: completed.reduce((a, r) => a + r.totalEthanolLost, 0) / n,
				avgPurity: completed.filter(r => r.avgPurity !== null).length > 0 ? completed.filter(r => r.avgPurity !== null).reduce((a, r) => a + (r.avgPurity ?? 0), 0) / completed.filter(r => r.avgPurity !== null).length : null,
				deviationCount: Math.round(completed.reduce((a, r) => a + r.deviationCount, 0) / n)
			};
		}
		return null;
	});

	const currentRunRank = $derived.by(() => {
		const runs = data.runHistory;
		if (runs.length < 2) return { yield: 1, cost: 1, recovery: 1, total: runs.length };
		const byYield = [...runs].sort((a, b) => b.overallYieldPct - a.overallYieldPct);
		const byCost = [...runs].sort((a, b) => a.costPerKg - b.costPerKg);
		const byRecovery = [...runs].sort((a, b) => b.avgEthanolRecovery - a.avgEthanolRecovery);
		return {
			yield: byYield.findIndex(r => r.runId === data.activeRunId) + 1,
			cost: byCost.findIndex(r => r.runId === data.activeRunId) + 1,
			recovery: byRecovery.findIndex(r => r.runId === data.activeRunId) + 1,
			total: runs.length
		};
	});

	// History chart arrays (chronological order)
	const historyRuns = $derived([...data.runHistory].reverse());
	const historyRecoveryValues = $derived(historyRuns.map(r => r.avgEthanolRecovery));
	const historyCostPerKgValues = $derived(historyRuns.map(r => r.costPerKg));
	const historyYieldValues = $derived(historyRuns.map(r => r.overallYieldPct));
	const historyRunLabels = $derived(historyRuns.map(r => r.runNumber));
	const historyRecoveryChart = $derived(historyRecoveryValues.length >= 2 ? smoothPath(historyRecoveryValues, CW, CH + 20) : null);
	const historyCostChart = $derived(historyCostPerKgValues.length >= 2 ? smoothPath(historyCostPerKgValues, CW, CH + 20) : null);
	const historyYieldChart = $derived(historyYieldValues.length >= 2 ? smoothPath(historyYieldValues, CW, CH + 20) : null);

	// Anomaly helpers
	const batchAnomalyMap = $derived.by(() => {
		const map = new Map<number, typeof data.batchAnomalies>();
		for (const a of data.batchAnomalies) {
			if (!map.has(a.batchId)) map.set(a.batchId, []);
			map.get(a.batchId)!.push(a);
		}
		return map;
	});
	const anomalyCount = $derived(data.batchAnomalies.length);
	const criticalAnomalyCount = $derived(data.batchAnomalies.filter(a => a.severity === 'critical').length);

	// Comparison delta helper
	function compDelta(current: number, compare: { [key: string]: any } | null | undefined, key: string): number | null {
		if (!compare || compare[key] == null) return null;
		return current - compare[key];
	}
</script>

{#if data.pipeline && data.activeBatchProgress?.length > 0}
<div class="flex-1 p-3 grid grid-cols-12 gap-3 overflow-auto content-start">
	<!-- Row 1: 7 Alert KPI Cards -->
	<div class="col-span-12 grid grid-cols-7 gap-3">
		<!-- Active Batches -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi1 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active Batches</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{lotActiveBatches}</p>
				<span class="text-[10px] font-bold text-text-muted">/ {lotBatches().length}</span>
			</div>
			<div class="mt-2 h-1 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full" style="width: {lotCompletePct}%"></div>
			</div>
			<p class="text-[9px] text-text-muted mt-1">{lotCompletedBatches} completed · {lotRemainingBatches} remaining</p>
			<div class="absolute left-0 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi1:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">Total Batches</span><span class="font-bold text-text-primary">{lotBatches().length}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">In Progress</span><span class="font-bold text-blue-400">{lotActiveBatches}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Completed</span><span class="font-bold text-primary">{lotCompletedBatches}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Leaf Input</span><span class="font-bold text-text-primary">{Math.round(lotIntakeKg).toLocaleString()} kg</span></div>
				</div>
			</div>
		</div>

		<!-- EtOH Recovery -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi2 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">EtOH Recovery</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{lotEtohRecoveryPct.toFixed(1)}%</p>
				{#if lotEtohRecoveryPct >= 95}
					<span class="text-[10px] font-bold text-primary">&#9650; {(lotEtohRecoveryPct - 95).toFixed(1)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; {(95 - lotEtohRecoveryPct).toFixed(1)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-2">LIMIT: >95.0%</p>
			<div class="absolute left-0 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi2:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">EtOH Issued</span><span class="font-bold text-text-primary">{lotEtohIssued.toFixed(0)} L</span></div>
					<div class="flex justify-between"><span class="text-text-muted">EtOH Recovered</span><span class="font-bold text-text-primary">{lotEtohRecovered.toFixed(0)} L</span></div>
					<div class="flex justify-between"><span class="text-text-muted">EtOH Lost</span><span class="font-bold text-red-400">{lotEtohLost.toFixed(1)} L</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Recovery Rate</span><span class="font-bold text-text-primary">{lotEtohRecoveryPct.toFixed(1)}%</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Target</span><span class="font-bold text-text-primary">&gt;95.0%</span></div>
				</div>
			</div>
		</div>

		<!-- Daily OP Cost -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi3 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Daily OP Cost</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{fmt(data.dailyOpCost)}</p>
				<span class="text-[10px] text-text-muted">Budget</span>
			</div>
			<div class="mt-2 h-1 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-blue-500 rounded-full" style="width: {Math.min(100, (data.dailyOpCost / (DAILY_BUDGET * 1.5)) * 100)}%"></div>
			</div>
			<div class="absolute left-0 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi3:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">Daily Budget</span><span class="font-bold text-text-primary">{fmt(DAILY_BUDGET)}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Actual</span><span class="font-bold text-text-primary">{fmt(data.dailyOpCost)}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Variance</span><span class="font-bold" style="color: {budgetVariance <= 0 ? '#bef264' : '#ef4444'};">{budgetVariance <= 0 ? '' : '+'}{fmt(budgetVariance)}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Avg Cost/Batch</span><span class="font-bold text-text-primary">{fmt(costPerBatch)}</span></div>
				</div>
			</div>
		</div>

		<!-- Cost per KG -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi4 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Cost / KG</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{fmt(data.avgCostPerKg)}</p>
				{#if data.avgCostPerKg <= costPerKgTarget}
					<span class="text-[10px] font-bold text-primary">&#9650; -{((costPerKgTarget - data.avgCostPerKg) / costPerKgTarget * 100).toFixed(0)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; +{((data.avgCostPerKg - costPerKgTarget) / costPerKgTarget * 100).toFixed(0)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-2">TARGET: {fmt(costPerKgTarget)}/kg</p>
			<div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi4:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">Total Cost</span><span class="font-bold text-text-primary">{fmt(costTotal)}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Final Product</span><span class="font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} kg</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Target</span><span class="font-bold text-text-primary">{fmt(costPerKgTarget)}/kg</span></div>
				</div>
			</div>
		</div>

		<!-- Daily Yield -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi5 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Daily Yield</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{Math.round(lotDailyYieldKg * 1000).toLocaleString()}</p>
				<span class="text-[10px] text-text-muted">g/day</span>
			</div>
			<div class="flex items-baseline gap-2 mt-1">
				{#if lotDailyYieldKg >= dailyYieldTarget}
					<span class="text-[10px] font-bold text-primary">&#9650; +{((lotDailyYieldKg - dailyYieldTarget) / dailyYieldTarget * 100).toFixed(0)}%</span>
				{:else}
					<span class="text-[10px] font-bold text-red-400">&#9660; -{((dailyYieldTarget - lotDailyYieldKg) / dailyYieldTarget * 100).toFixed(0)}%</span>
				{/if}
			</div>
			<p class="text-[9px] text-text-muted mt-1">TARGET: {Math.round(dailyYieldTarget * 1000).toLocaleString()} g/day</p>
			<div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi5:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">Total Produced</span><span class="font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} kg</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Operation Days</span><span class="font-bold text-text-primary">{lotOperationDays()}</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Daily Avg</span><span class="font-bold text-text-primary">{Math.round(lotDailyYieldKg * 1000).toLocaleString()} g</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Daily Target</span><span class="font-bold text-text-primary">{Math.round(dailyYieldTarget * 1000).toLocaleString()} g</span></div>
				</div>
			</div>
		</div>

		<!-- Final Yield -->
		<div class="bg-bg-card border border-border-card p-3 rounded group/kpi6 relative">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Final Yield</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black text-text-primary">{lotFinalProductKg.toFixed(3)}</p>
				<span class="text-[10px] text-text-muted">kg</span>
			</div>
			<p class="text-[9px] text-text-muted mt-1">Extract rate: {lotExtractRate.toFixed(2)}%</p>
			<div class="absolute right-0 top-full mt-1 z-50 bg-bg-card border border-border-card rounded-lg shadow-xl p-3 w-52 opacity-0 pointer-events-none group-hover/kpi6:opacity-100 transition-opacity duration-150">
				<div class="space-y-1.5 text-[9px]">
					<div class="flex justify-between"><span class="text-text-muted">Leaf Input</span><span class="font-bold text-text-primary">{Math.round(lotIntakeKg).toLocaleString()} kg</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Final Product</span><span class="font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} kg</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Extract Rate</span><span class="font-bold text-text-primary">{lotExtractRate.toFixed(2)}%</span></div>
					<div class="flex justify-between"><span class="text-text-muted">Target</span><span class="font-bold text-text-primary">{extractTarget}%</span></div>
				</div>
			</div>
		</div>

		<!-- Alerts -->
		<div class="bg-bg-card border border-border-card border-l-[3px] {data.alertCounts.high > 0 ? 'border-l-red-500' : data.alertCounts.medium > 0 ? 'border-l-amber-500' : 'border-l-primary'} p-3 rounded">
			<p class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Alerts</p>
			<div class="flex items-baseline gap-2 mt-1">
				<p class="text-3xl font-black {data.alertCounts.high > 0 ? 'text-red-400' : data.alertCounts.total > 0 ? 'text-amber-400' : 'text-primary'}">{data.alertCounts.total}</p>
				<span class="text-[10px] text-text-muted">active</span>
			</div>
			<div class="flex gap-2 mt-2 text-[9px]">
				{#if data.alertCounts.high > 0}<span class="text-red-400 font-bold">{data.alertCounts.high} High</span>{/if}
				{#if data.alertCounts.medium > 0}<span class="text-amber-400 font-bold">{data.alertCounts.medium} Med</span>{/if}
				{#if data.alertCounts.low > 0}<span class="text-blue-400 font-bold">{data.alertCounts.low} Low</span>{/if}
			</div>
		</div>
	</div>

	<!-- Active Alerts Strip -->
	{#if data.activeAlerts?.length > 0}
		<div class="col-span-12 space-y-1">
			{#each data.activeAlerts as alert}
				<div class="flex items-center gap-2 px-3 py-2 rounded border text-xs
					{alert.severity === 'High' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
					 alert.severity === 'Medium' ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' :
					 'bg-blue-900/20 border-blue-500/30 text-blue-400'}">
					<span class="material-symbols-outlined text-sm">
						{alert.severity === 'High' ? 'error' : alert.severity === 'Medium' ? 'warning' : 'info'}
					</span>
					<span class="font-bold">{alert.alert_type}</span>
					<span class="flex-1">{alert.message}</span>
					{#if alert.batch_id}
						<a href="/batches/{alert.batch_id}/stages/{alert.stage_number ?? 1}" class="font-bold underline hover:opacity-80">View Batch</a>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Row 3: Pipeline + Lot Progress stacked -->
	<div class="col-span-6 flex flex-col gap-3">
	<div class="relative overflow-visible rounded-2xl border border-border-card z-20" style="background: linear-gradient(135deg, #111827 0%, #1F2937 40%, #162032 100%);">
		<!-- Subtle grid pattern overlay -->
		<div class="absolute inset-0 opacity-[0.03] rounded-2xl overflow-hidden" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"></div>
		<div class="relative p-5">

			<div class="relative flex items-start px-3">
				{#each mainSteps() as step, i}
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
						<div class="absolute top-full mt-1 z-50 rounded-xl border border-primary/20 shadow-xl shadow-black/30 p-4 w-56 text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 {i === 0 ? 'left-0' : i === mainSteps().length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}" style="background: linear-gradient(160deg, #1e1e1e 0%, #1F2937 100%);">
							<div class="flex items-center justify-between mb-2">
								<p class="text-[11px] font-bold text-text-primary">{step.label}</p>
								<span class="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded">{step.fillPct.toFixed(0)}%</span>
							</div>
							<div class="h-1 w-full bg-bg-page rounded-full overflow-hidden mb-3">
								<div class="h-full bg-primary rounded-full transition-all" style="width: {step.fillPct}%"></div>
							</div>
							<div class="space-y-1.5">
								{#if i === 0}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Powder Output</span><span class="text-[10px] font-bold text-text-primary">{lotPowderKg.toLocaleString()} kg</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Batches Ground</span><span class="text-[10px] font-bold text-text-primary">{lotStageCounts()[1] ?? 0} / {lotBatchCount}</span></div>
								{:else if i === 1}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Extractions</span><span class="text-[10px] font-bold text-text-primary">{lotLotsExtracted} / {lotEtohStockUsedL.toLocaleString()}L</span></div>
									<div class="border-t border-border-subtle pt-1.5 mt-1 space-y-1.5">
										<p class="text-[9px] font-bold text-primary/70 uppercase tracking-wider">Filtration</p>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovered</span><span class="text-[10px] font-bold text-text-primary">{lotFiltrationOutputL.toLocaleString()} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Lost</span><span class="text-[10px] font-bold text-red-400">{lotFiltrationLossL} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovery</span><span class="text-[10px] font-bold text-text-primary">{lotFiltrationPct}%</span></div>
									</div>
								{:else if i === 2}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovered</span><span class="text-[10px] font-bold text-text-primary">{Number(lotEtohRecovered.toFixed(1)).toLocaleString()} L</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Lost</span><span class="text-[10px] font-bold text-red-400">{lotEtohLost.toFixed(1)} L</span></div>
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Recovery</span><span class="text-[10px] font-bold text-text-primary">{lotDistillationPct}%</span></div>
								{:else if i === 3}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Wet weight</span><span class="text-[10px] font-bold text-text-primary">{lotPrecipitateKg} kg</span></div>
									<div class="border-t border-border-subtle pt-1.5 mt-1 space-y-1.5">
										<p class="text-[9px] font-bold text-primary/70 uppercase tracking-wider">A/B Extraction</p>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">D-Limo Recovered</span><span class="text-[10px] font-bold text-text-primary">{lotDlimoRecoveredL} L</span></div>
										<div class="flex justify-between"><span class="text-[10px] text-text-muted">D-Limo Lost</span><span class="text-[10px] font-bold text-red-400">{lotDlimoLostL} L</span></div>
									</div>
								{:else if i === 4}
									<div class="flex justify-between"><span class="text-[10px] text-text-muted">Dried extract</span><span class="text-[10px] font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} kg</span></div>
								{/if}
							</div>
						</div>
					</div>
					<!-- Connector with notch circle -->
					{#if i < mainSteps().length - 1}
						<div class="flex-1 flex items-center relative" style="margin-top: 35px;">
							<div class="flex-1 h-px bg-gradient-to-r from-primary/60 to-primary/30"></div>
							<div class="flex-none group/notch relative flex flex-col items-center mx-2">
								<div class="h-3.5 w-3.5 rounded-full bg-bg-page border-[1.5px] border-primary/50 z-10 transition-all duration-200 group-hover/notch:border-primary group-hover/notch:bg-primary/20 group-hover/notch:scale-150 cursor-default"></div>
								<p class="text-[7px] font-medium text-text-muted/70 mt-1.5 whitespace-nowrap uppercase tracking-widest">{notchSteps[i].label}</p>
								<div class="absolute top-full mt-5 z-50 rounded-xl border border-primary/20 shadow-xl shadow-black/30 p-3 w-44 text-left opacity-0 pointer-events-none group-hover/notch:opacity-100 transition-all duration-200 left-1/2 -translate-x-1/2" style="background: linear-gradient(160deg, #1e1e1e 0%, #1F2937 100%);">
									<div class="flex items-center gap-1.5 mb-2">
										<div class="h-1.5 w-1.5 rounded-full bg-primary/60"></div>
										<p class="text-[10px] font-bold text-text-primary">{notchSteps[i].label}</p>
									</div>
									<div class="space-y-1">
										{#if i === 0}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Total Powder</span><span class="text-[9px] font-bold text-text-primary">{lotPowderKg} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Batches Ground</span><span class="text-[9px] font-bold text-text-primary">{lotStageCounts()[1] ?? 0} / {lotBatchCount}</span></div>
										{:else if i === 1}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovered</span><span class="text-[9px] font-bold text-text-primary">{lotFiltrationOutputL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lost</span><span class="text-[9px] font-bold text-red-400">{lotFiltrationLossL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovery</span><span class="text-[9px] font-bold text-text-primary">{lotFiltrationPct}%</span></div>
										{:else if i === 2}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Recovered</span><span class="text-[9px] font-bold text-text-primary">{lotDlimoRecoveredL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Lost</span><span class="text-[9px] font-bold text-red-400">{lotDlimoLostL} L</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Batches Processed</span><span class="text-[9px] font-bold text-text-primary">{lotStageCounts()[3] ?? 0} / {lotBatchCount}</span></div>
										{:else if i === 3}
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Precipitate In</span><span class="text-[9px] font-bold text-text-primary">{lotPrecipitateKg} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Final Product</span><span class="text-[9px] font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} kg</span></div>
											<div class="flex justify-between"><span class="text-[9px] text-text-muted">Batches Dried</span><span class="text-[9px] font-bold text-text-primary">{lotStageCounts()[4] ?? 0} / {lotBatchCount}</span></div>
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
		<div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle pr-3">
			<div class="flex items-center gap-1 flex-none">
				{#each allLots() as lot}
					<button onclick={() => selectedLot = lot} class="px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded transition-colors {activeLot === lot ? 'text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}">{lot}</button>
				{/each}
			</div>
			<div class="flex-1 h-1.5 bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {lotCompletePct}%"></div>
			</div>
			<p class="text-[9px] text-text-muted whitespace-nowrap">{Math.round(lotIntakeKg)} kg · {lotBatches().length} batches</p>
			<div class="flex gap-px rounded overflow-hidden flex-none" style="border: 1px solid rgba(30, 30, 30, 0.8);">
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
								{#if key === 'current' || (key === 'previous' && hasHistory) || (key === 'avg5' && data.runHistory.filter(r => r.status === 'Completed').length >= 1)}
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
					<span class="text-[8px] font-medium text-text-secondary">{fmt(projectedTotalCost)}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="text-[7px] text-text-muted/30 uppercase">Recovery</span>
					<span class="text-[8px] font-medium" style="color: {projectedSolventRecovery >= 95 ? '#bef264' : '#ef4444'};">{projectedSolventRecovery.toFixed(1)}%</span>
				</div>
			</div>
		</div>

		<!-- Lot progress table -->
		{#if data.activeBatchProgress.length === 0}
			<p class="text-xs text-text-muted">No active lots</p>
		{:else}
			<div class="pr-1 overflow-y-auto overflow-x-hidden" style="max-height: 170px; scrollbar-width: thin; scrollbar-color: rgba(55,65,81,0.4) transparent;">
				<!-- Header -->
				<div style="display: grid; grid-template-columns: 72px repeat(7, 1fr) 12px 1fr 1fr 1fr;" class="text-[7px] font-bold text-text-muted uppercase tracking-wider pb-1.5 border-b border-border-subtle gap-1.5 sticky top-0 bg-bg-card z-10">
					<button onclick={selectRun} class="text-left transition-colors {selectedBatchId === null ? 'text-primary' : 'text-text-muted hover:text-primary/70'}">{activeLot ?? runLabel}</button>
					{#each TABLE_COLUMNS as col}
						<div class="text-center">{col.label}</div>
					{/each}
					<div></div>
					<div class="text-center">Prog</div>
					<div class="text-center">Stage</div>
					<div class="text-center">Act</div>
				</div>
				{#each sortedBatches() as batch}
					{@const s1f = batch.stages.find(s => s.stage_number === 1)?.status === 'Finalized'}
					{@const s2f = batch.stages.find(s => s.stage_number === 2)?.status === 'Finalized'}
					{@const s3f = batch.stages.find(s => s.stage_number === 3)?.status === 'Finalized'}
					{@const s4f = batch.stages.find(s => s.stage_number === 4)?.status === 'Finalized'}
					{@const completedStages = (s1f ? 1 : 0) + (s2f ? 3 : 0) + (s3f ? 1 : 0) + (s4f ? 1 : 0) + (batch.final_product_g != null ? 1 : 0)}
					<button onclick={() => selectBatch(batch.id)} style="display: grid; grid-template-columns: 72px repeat(7, 1fr) 12px 1fr 1fr 1fr;" class="items-center py-1.5 border-b rounded gap-1.5 transition-all w-full text-left {selectedBatchId === batch.id ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border-subtle hover:bg-bg-card-hover/30'}">
						<!-- Lot ID + Position -->
						<div class="hover:bg-bg-card-hover transition-colors rounded px-0.5 py-0.5 overflow-hidden">
							<p class="text-[8px] font-bold text-text-primary truncate">{batch.batch_number}</p>
							<p class="text-[7px] text-text-muted truncate">{batch.lot_position ?? '—'}</p>
						</div>
						<!-- 7 Stage cells -->
						{#each TABLE_COLUMNS as col, ci}
							{@const colStatus = columnStatusColor(batch.stages, col.dbStages)}
							{@const isFinalized = colStatus.includes('primary')}
							{@const isInProgress = colStatus.includes('blue')}
							<div class="group/cell relative text-center rounded py-0.5 px-0.5 text-[8px] font-bold hover:bg-bg-card-hover transition-colors {colStatus}">
								{#if ci === 0}
									{batch.powder_output_kg != null ? batch.powder_output_kg.toFixed(1) : '—'}
								{:else if ci === 6}
									{batch.final_product_g != null ? (batch.final_product_g / 1000).toFixed(3) : '—'}
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
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Used</span><span class="text-[9px] font-bold text-text-primary">{batch.etoh_vol_L?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Crude Extract</span><span class="text-[9px] font-bold text-text-primary">{batch.crude_extract_wt_kg?.toFixed(2) ?? '—'} kg</span></div>
											</div>
										{:else if ci === 2}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Filtration</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.etoh_recovered_L?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Lost</span><span class="text-[9px] font-bold text-red-500">{batch.etoh_lost_L?.toFixed(0) ?? '0'} L</span></div>
											</div>
										{:else if ci === 3}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Distillation</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.etoh_recovered_L?.toFixed(0) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">EtOH Lost</span><span class="text-[9px] font-bold text-red-500">{batch.etoh_lost_L?.toFixed(0) ?? '0'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovery %</span><span class="text-[9px] font-bold text-primary">{batch.etoh_recovery_pct?.toFixed(1) ?? '—'}%</span></div>
											</div>
										{:else if ci === 4}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Acid/Base Extraction</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Used</span><span class="text-[9px] font-bold text-text-primary">{batch.dlimo_vol_L?.toFixed(1) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Recovered</span><span class="text-[9px] font-bold text-text-primary">{batch.dlimo_recovered_L?.toFixed(1) ?? '—'} L</span></div>
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Lost</span><span class="text-[9px] font-bold text-red-500">{batch.dlimo_lost_L?.toFixed(1) ?? '0'} L</span></div>
											</div>
										{:else if ci === 5}
											<p class="text-[9px] font-bold text-text-primary mb-1.5">Precipitation</p>
											<div class="space-y-1">
												<div class="flex justify-between"><span class="text-[9px] text-text-muted">Wet Weight</span><span class="text-[9px] font-bold text-text-primary">{batch.wet_precipitate_g != null ? (batch.wet_precipitate_g / 1000).toFixed(2) : '—'} kg</span></div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
						<div></div>
						<!-- Progress bar -->
						<div class="flex flex-col items-center justify-center px-0.5 hover:bg-bg-card-hover transition-colors rounded py-0.5">
							<div class="h-1 w-full bg-border-card rounded-full overflow-hidden">
								<div class="h-full bg-primary rounded-full" style="width: {(completedStages / 7 * 100)}%"></div>
							</div>
							<p class="text-[7px] text-text-muted text-center mt-0.5">{completedStages}/7</p>
						</div>
						<!-- Current stage -->
						<div class="flex items-center justify-center hover:bg-bg-card-hover transition-colors rounded py-0.5 px-0.5 overflow-hidden">
							<p class="text-[8px] font-bold text-text-secondary truncate text-center">
								{#if batch.final_product_g != null}
									Done
								{:else if batch.wet_precipitate_g != null}
									Drying
								{:else}
									{getStageName(batch.current_stage)}
								{/if}
							</p>
						</div>
						<!-- Next action -->
						<div class="flex items-center justify-center hover:bg-bg-card-hover transition-colors rounded py-0.5">
							<span class="text-[7px] font-bold uppercase px-1 py-0.5 rounded {nextAction(batch) === 'Review' ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}">{nextAction(batch)}</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
	</div>

	<!-- Analytics Carousel - Intelligence Panels -->
	<div class="col-span-6 bg-bg-card border border-border-card rounded-xl px-4 pt-3 pb-2.5 flex flex-col overflow-hidden min-h-[520px] max-h-[520px]">
		{#if carouselIndex === 0}
			<!-- ═══ COST INTELLIGENCE ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #ec5b13;">payments</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Cost Intelligence</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.operator_name ?? selectedBatchInfo.status}</span>
					{:else}
						<span class="text-[8px] text-text-muted/35">{runLabel}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{runCompletedBatches}/{runBatchCount} batches</span>
					{/if}
				</div>
			</div>
			<div class="flex items-baseline gap-1.5 mb-2">
				{#if selectedBatchId && selectedCostRow}
					<span class="text-base font-semibold text-text-primary">{fmt(selectedCostRow.totalCost)}</span>
					{#if selectedCostRow.costPerKg}
						<span class="text-[9px] text-text-muted/50">{fmt(selectedCostRow.costPerKg)}/kg</span>
					{/if}
					{#if runCostAgg}
						{@const batchDelta = selectedCostRow.totalCost - runCostAgg.avgCostPerBatch}
						<span class="text-[9px] font-medium" style="color: {batchDelta <= 0 ? '#bef264' : '#ef4444'};">{batchDelta <= 0 ? '' : '+'}{Math.round(batchDelta).toLocaleString()} vs avg</span>
					{/if}
					{#if batchAnomalyMap.get(selectedBatchId)?.some(a => a.metric === 'cost')}
						<span class="text-[7px] px-1 py-0.5 rounded bg-red-900/30 text-red-400">ANOMALY</span>
					{/if}
				{:else}
					<span class="text-base font-semibold text-text-primary">{runCostAgg ? fmt(runCostAgg.totalCost) : '—'}</span>
					{#if runCostAgg && rs}
						{@const costVar = runCostAgg.totalCost - (runCostAgg.projectedTotal * (runCompletedBatches / runBatchCount))}
						{#if costVar <= 0}
							<span class="text-[9px] font-medium" style="color: #bef264;">{'-' + fmt(Math.abs(costVar))} under pace</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #ef4444;">{'+' + fmt(costVar)} over pace</span>
						{/if}
					{/if}
					{#if comparisonTarget}
						{@const cd = compDelta(currentRunHistory?.avgCostPerBatch ?? 0, comparisonTarget, 'avgCostPerBatch')}
						{#if cd !== null}
							<span class="text-[7px] px-1 py-0.5 rounded" style="background: rgba({cd <= 0 ? '139,170,124' : '196,137,106'}, 0.15); color: {cd <= 0 ? '#bef264' : '#ef4444'};">{cd <= 0 ? '' : '+'}{Math.round(cd)} vs {comparisonTarget.runNumber}</span>
						{/if}
					{/if}
				{/if}
			</div>

			<!-- Mode toggle -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(30, 30, 30, 0.8);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'lot' ? 'background: rgba(236, 91, 19, 0.15);' : ''} onclick={() => costMode = 'lot'}>Run Summary</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'batch' ? 'background: rgba(236, 91, 19, 0.15);' : ''} onclick={() => costMode = 'batch'}>Cost Drivers</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'history' ? 'background: rgba(236, 91, 19, 0.15);' : ''} onclick={() => costMode = 'history'}>Ton History</button>
			</div>

			{#if costMode === 'lot'}
				<!-- KPI Strip — bordered cells like reference -->
				<div class="flex gap-1.5 mb-3 overflow-x-auto">
					<div class="flex-1 min-w-[80px] border border-border-card p-2 flex flex-col justify-between" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Total Lot Cost</span>
						<span class="text-sm font-bold text-text-primary">{runCostAgg ? fmt(runCostAgg.totalCost) : '—'}</span>
						<div class="h-0.5 w-full mt-1" style="background: rgba(236, 91, 19, 0.2);"><div class="h-full" style="width: 66%; background: #ec5b13;"></div></div>
					</div>
					<div class="flex-1 min-w-[80px] border border-border-card p-2 flex flex-col justify-between" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Cost/kg</span>
						<span class="text-sm font-bold text-text-primary">{rs ? fmt(rs.costPerKg) : '—'}</span>
						<div class="h-0.5 w-full mt-1" style="background: rgba(190, 242, 100, 0.2);"><div class="h-full" style="width: 50%; background: #bef264;"></div></div>
					</div>
					<div class="flex-1 min-w-[80px] border border-border-card p-2 flex flex-col justify-between" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Material</span>
						<span class="text-sm font-bold text-text-primary">{runCostAgg?.costByCategory[0] ? fmt(runCostAgg.costByCategory[0].total) : '—'}</span>
						<div class="h-0.5 w-full mt-1" style="background: rgba(30, 30, 30, 0.8);"></div>
					</div>
					<div class="flex-1 min-w-[80px] border border-border-card p-2 flex flex-col justify-between" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Avg/Batch</span>
						<span class="text-sm font-bold text-text-primary">{runCostAgg ? fmt(runCostAgg.avgCostPerBatch) : '—'}</span>
						<div class="h-0.5 w-full mt-1" style="background: rgba(30, 30, 30, 0.8);"></div>
					</div>
					<div class="flex-1 min-w-[80px] border border-border-card p-2 flex flex-col justify-between" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Projected</span>
						<span class="text-sm font-bold text-text-primary">{runCostAgg ? fmt(runCostAgg.projectedTotal) : '—'}</span>
						<div class="h-0.5 w-full mt-1" style="background: rgba(30, 30, 30, 0.8);"></div>
					</div>
				</div>

				<!-- Stage Cost Accumulation — stacked horizontal bars per stage (from reference) -->
				<div class="flex-1 flex flex-col mb-2">
					<div class="flex justify-between items-center mb-2">
						<h4 class="text-[8px] font-bold uppercase tracking-widest text-text-muted">Stage Cost Accumulation</h4>
						<div class="flex gap-3">
							<div class="flex items-center gap-1"><span class="size-1.5 rounded-full" style="background: #bef264;"></span><span class="text-[7px] uppercase font-bold text-text-muted">Leaf</span></div>
							<div class="flex items-center gap-1"><span class="size-1.5 rounded-full" style="background: #ec5b13;"></span><span class="text-[7px] uppercase font-bold text-text-muted">Solvent</span></div>
							<div class="flex items-center gap-1"><span class="size-1.5 rounded-full" style="background: #9CA3AF;"></span><span class="text-[7px] uppercase font-bold text-text-muted">Labor</span></div>
							<div class="flex items-center gap-1"><span class="size-1.5 rounded-full" style="background: #4B5563;"></span><span class="text-[7px] uppercase font-bold text-text-muted">Other</span></div>
						</div>
					</div>
					{#if runCostAgg}
						{@const cats = runCostAgg.costByCategory}
						{@const total = runCostAgg.totalCost || 1}
						<div class="flex-1 flex flex-col justify-around gap-2">
							<!-- STG_01 LEAF PREP -->
							<div>
								<div class="flex justify-between items-end mb-0.5">
									<span class="text-[8px] font-bold text-text-secondary">STG_01 LEAF PREP</span>
									<span class="text-[8px] font-mono font-bold" style="color: #ec5b13;">{fmt(total * 0.25)}</span>
								</div>
								<div class="h-5 w-full flex rounded-sm overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
									<div class="h-full flex items-center justify-center" style="width: 70%; background: #bef264; border-right: 1px solid rgba(17,24,39,0.5);">
										<span class="text-[6px] font-bold text-black/60">70%</span>
									</div>
									<div class="h-full flex items-center justify-center" style="width: 10%; background: rgba(107,140,168,0.6); border-right: 1px solid rgba(17,24,39,0.5);">
									</div>
									<div class="h-full flex items-center justify-center" style="width: 15%; background: #9CA3AF; border-right: 1px solid rgba(17,24,39,0.5);">
										<span class="text-[6px] font-bold text-black/50">15%</span>
									</div>
									<div class="h-full" style="width: 5%; background: #4B5563;"></div>
								</div>
							</div>
							<!-- STG_02 EXTRACTION -->
							<div>
								<div class="flex justify-between items-end mb-0.5">
									<span class="text-[8px] font-bold text-text-secondary">STG_02 EXTRACTION</span>
									<span class="text-[8px] font-mono font-bold" style="color: #ec5b13;">{fmt(total * 0.58)}</span>
								</div>
								<div class="h-5 w-full flex rounded-sm overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
									<div class="h-full flex items-center justify-center" style="width: 30%; background: #bef264; border-right: 1px solid rgba(17,24,39,0.5);">
										<span class="text-[6px] font-bold text-black/60">30%</span>
									</div>
									<div class="h-full flex items-center justify-center" style="width: 45%; background: #ec5b13; border-right: 1px solid rgba(17,24,39,0.5);">
										<span class="text-[6px] font-bold text-white/80">45%</span>
									</div>
									<div class="h-full flex items-center justify-center" style="width: 15%; background: #9CA3AF; border-right: 1px solid rgba(17,24,39,0.5);">
									</div>
									<div class="h-full" style="width: 10%; background: #4B5563;"></div>
								</div>
							</div>
							<!-- STG_03 AB PHASE -->
							<div>
								<div class="flex justify-between items-end mb-0.5">
									<span class="text-[8px] font-bold text-text-secondary">STG_03 A/B PHASE</span>
									<span class="text-[8px] font-mono font-bold" style="color: #ec5b13;">{fmt(total * 0.85)}</span>
								</div>
								<div class="h-5 w-full flex rounded-sm overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
									<div class="h-full" style="width: 20%; background: #bef264; border-right: 1px solid rgba(17,24,39,0.5);"></div>
									<div class="h-full" style="width: 20%; background: rgba(107,140,168,0.6); border-right: 1px solid rgba(17,24,39,0.5);"></div>
									<div class="h-full flex items-center justify-center" style="width: 40%; background: #9CA3AF; border-right: 1px solid rgba(17,24,39,0.5);">
										<span class="text-[6px] font-bold text-black/60">40%</span>
									</div>
									<div class="h-full flex items-center justify-center" style="width: 20%; background: #4B5563;">
										<span class="text-[6px] font-bold text-white/50">20%</span>
									</div>
								</div>
							</div>
							<!-- STG_04 DRYING -->
							<div>
								<div class="flex justify-between items-end mb-0.5">
									<span class="text-[8px] font-bold text-text-secondary">STG_04 DRYING</span>
									<span class="text-[8px] font-mono font-bold" style="color: #ec5b13;">{fmt(total)}</span>
								</div>
								<div class="h-5 w-full flex rounded-sm overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
									<div class="h-full" style="width: 15%; background: #bef264; border-right: 1px solid rgba(17,24,39,0.5);"></div>
									<div class="h-full" style="width: 15%; background: rgba(107,140,168,0.6); border-right: 1px solid rgba(17,24,39,0.5);"></div>
									<div class="h-full" style="width: 10%; background: #9CA3AF; border-right: 1px solid rgba(17,24,39,0.5);"></div>
									<div class="h-full flex items-center justify-center" style="width: 60%; background: #4B5563;">
										<span class="text-[6px] font-bold text-white/70">60%</span>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Sub-Batch Cost Deviation Matrix -->
				<div class="border border-border-card flex flex-col overflow-hidden rounded" style="max-height: 140px;">
					<div class="px-2.5 py-1.5 flex justify-between items-center" style="background: rgba(13, 13, 13, 0.7); border-bottom: 1px solid rgba(30, 30, 30, 0.8);">
						<h4 class="text-[8px] font-bold uppercase tracking-widest text-text-muted">Sub-Batch Cost Deviation</h4>
						<div class="flex gap-3 text-[7px] font-bold uppercase">
							<span class="flex items-center gap-1"><span class="size-1 rounded-full" style="background: #bef264;"></span> Under</span>
							<span class="flex items-center gap-1"><span class="size-1 rounded-full text-text-muted"></span> On Tgt</span>
							<span class="flex items-center gap-1"><span class="size-1 rounded-full" style="background: #ef4444;"></span> Over</span>
						</div>
					</div>
					<div class="flex-1 overflow-y-auto">
						<table class="w-full text-left border-collapse">
							<thead class="sticky top-0" style="background: rgba(13, 13, 13, 0.9);">
								<tr class="text-[7px] font-bold text-text-muted uppercase tracking-widest">
									<th class="px-2.5 py-1.5" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Batch</th>
									<th class="px-2.5 py-1.5 text-right" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Total</th>
									<th class="px-2.5 py-1.5 text-right" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">$/kg</th>
									<th class="px-2.5 py-1.5 text-right" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">vs Avg</th>
								</tr>
							</thead>
							<tbody class="text-[9px] font-mono">
								{#each [...data.runBatchCosts].sort((a,b) => b.totalCost - a.totalCost).slice(0, 5) as bc}
									{#if true}
									{@const overrun = bc.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)}
									{@const pctDev = runCostAgg?.avgCostPerBatch ? ((overrun / runCostAgg.avgCostPerBatch) * 100) : 0}
									<tr class="hover:bg-bg-card-hover cursor-pointer" style="border-bottom: 1px solid rgba(30, 30, 30, 0.5);" onclick={() => selectBatch(bc.batch_id)}>
										<td class="px-2.5 py-1 text-text-muted">{bc.batch_number.replace('SG-', '')}</td>
										<td class="px-2.5 py-1 text-right text-text-secondary">{fmt(bc.totalCost)}</td>
										<td class="px-2.5 py-1 text-right text-text-muted">{bc.costPerKg ? fmt(bc.costPerKg) : '—'}</td>
										<td class="px-2.5 py-1 text-right font-bold" style="color: {pctDev <= 0 ? '#bef264' : '#ef4444'};">{pctDev <= 0 ? '' : '+'}{pctDev.toFixed(1)}%</td>
									</tr>
									{/if}
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				<!-- Bottom: 5-col intelligence strip -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedCostRow}
						{@const rank = [...data.runBatchCosts].filter(c => c.totalCost > 0).sort((a,b) => a.totalCost - b.totalCost).findIndex(c => c.batch_id === selectedBatchId) + 1}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{rank}/{batchCostValues.length}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {selectedCostRow.totalCost <= (runCostAgg?.avgCostPerBatch ?? 0) ? '#bef264' : '#ef4444'};">{selectedCostRow.totalCost <= (runCostAgg?.avgCostPerBatch ?? 0) ? '-' : '+'}{Math.abs(Math.round(selectedCostRow.totalCost - (runCostAgg?.avgCostPerBatch ?? 0))).toLocaleString()}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p><p class="text-[9px] font-semibold text-text-secondary">{selectedCostRow.costPerKg ? fmt(selectedCostRow.costPerKg) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Overrun</p><p class="text-[9px] font-semibold" style="color: {selectedCostRow.totalCost > (runCostAgg?.avgCostPerBatch ?? 0) ? '#ef4444' : '#bef264'};">{selectedCostRow.totalCost > (runCostAgg?.avgCostPerBatch ?? 0) ? '+' : ''}{((selectedCostRow.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)) / (runCostAgg?.avgCostPerBatch || 1) * 100).toFixed(0)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {(batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'cost').length ?? 0) > 0 ? '#ef4444' : 'inherit'};">{batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'cost').length ?? 0}</p></div>
					{:else}
						{@const highestBatch = [...data.runBatchCosts].filter(c => c.totalCost > 0).sort((a,b) => b.totalCost - a.totalCost)[0]}
						{@const biggestOverrun = [...data.runBatchCosts].filter(c => c.totalCost > 0).sort((a,b) => (b.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)) - (a.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)))[0]}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Highest</p><p class="text-[9px] font-semibold text-text-secondary">{highestBatch ? highestBatch.batch_number.replace('SG-', '') : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Overrun</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{biggestOverrun ? `+${fmt(biggestOverrun.totalCost - (runCostAgg?.avgCostPerBatch ?? 0))}` : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Projected</p><p class="text-[9px] font-semibold text-text-secondary">{runCostAgg ? fmt(runCostAgg.projectedTotal) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p><p class="text-[9px] font-semibold text-text-secondary">{rs ? fmt(rs.costPerKg) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.cost}/{currentRunRank.total}</p></div>
					{/if}
				</div>
			{:else if costMode === 'batch'}
				<!-- Cost Drivers: ranked by totalCost DESC -->
				{#if runCostAgg}
					<p class="text-[8px] text-text-muted/50 mb-1.5">Budget pace: <span class="text-text-secondary font-medium">{fmt(runCostAgg.projectedTotal)}</span> projected | <span class="text-text-secondary font-medium">{fmt(runCostAgg.totalCost)}</span> spent ({(runCostAgg.totalCost / (runCostAgg.projectedTotal || 1) * 100).toFixed(0)}%)</p>
				{/if}
				<!-- Header row -->
				<div class="flex items-center gap-1.5 px-1.5 py-0.5 text-[7px] font-bold text-text-muted/40 uppercase tracking-wider border-b border-border-subtle mb-0.5">
					<span class="w-16 flex-none">Batch</span>
					<span class="w-3 flex-none"></span>
					<span class="flex-1">Cost</span>
					<span class="w-14 text-right flex-none">Total</span>
					<span class="w-12 text-right flex-none">$/kg</span>
					<span class="w-12 text-right flex-none">vs Avg</span>
				</div>
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each [...data.runBatchCosts].sort((a, b) => b.totalCost - a.totalCost) as bc}
							{@const overrun = bc.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)}
							{@const hasAnomaly = batchAnomalyMap.get(bc.batch_id)?.some(a => a.metric === 'cost')}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === bc.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(bc.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">{bc.batch_number.replace('SG-', '')}</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {bc.status === 'Completed' ? 'bg-primary' : bc.status === 'In Progress' ? 'bg-blue-500' : bc.status === 'Pending Review' ? 'bg-amber-500' : bc.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
									<div class="h-full rounded-full" style="width: {avgBatchCostForBar > 0 ? Math.min(100, (bc.totalCost / avgBatchCostForBar) * 50) : 0}%; background: rgba(236, 91, 19, 0.6);"></div>
								</div>
								<span class="text-[8px] font-medium text-text-secondary w-14 text-right flex-none">{fmt(bc.totalCost)}</span>
								<span class="text-[7px] text-text-muted/50 w-12 text-right flex-none">{bc.costPerKg ? fmt(bc.costPerKg) : '—'}</span>
								<span class="text-[7px] w-12 text-right flex-none" style="color: {overrun > 0 ? '#ef4444' : '#bef264'};">{overrun > 0 ? '+' : ''}{Math.round(overrun)}</span>
								{#if hasAnomaly}<span class="h-1.5 w-1.5 rounded-full bg-red-500 flex-none"></span>{/if}
							</button>
						{/each}
					</div>
				</div>
				<!-- Cost Pareto: top 3 categories -->
				{#if runCostAgg}
					<div class="flex gap-1.5 mb-2">
						{#each runCostAgg.costByCategory.slice(0, 3) as cat, i}
							<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(236, 91, 19, {[0.15, 0.10, 0.07][i]}); color: #ec5b13;">{cat.category}: {(cat.total / runCostAgg.totalCost * 100).toFixed(0)}%</span>
						{/each}
					</div>
				{/if}
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedCostRow}
						{@const rank = [...data.runBatchCosts].filter(c => c.totalCost > 0).sort((a,b) => a.totalCost - b.totalCost).findIndex(c => c.batch_id === selectedBatchId) + 1}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{rank}/{batchCostValues.length}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {selectedCostRow.totalCost <= (runCostAgg?.avgCostPerBatch ?? 0) ? '#bef264' : '#ef4444'};">{Math.round(selectedCostRow.totalCost - (runCostAgg?.avgCostPerBatch ?? 0))}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p><p class="text-[9px] font-semibold text-text-secondary">{selectedCostRow.costPerKg ? fmt(selectedCostRow.costPerKg) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Overrun</p><p class="text-[9px] font-semibold" style="color: {selectedCostRow.totalCost > (runCostAgg?.avgCostPerBatch ?? 0) ? '#ef4444' : '#bef264'};">{((selectedCostRow.totalCost - (runCostAgg?.avgCostPerBatch ?? 0)) / (runCostAgg?.avgCostPerBatch || 1) * 100).toFixed(0)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold">{batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'cost').length ?? 0}</p></div>
					{:else}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Lowest</p><p class="text-[9px] font-semibold text-text-secondary">{batchCostValues.length ? fmt(Math.min(...batchCostValues)) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Highest</p><p class="text-[9px] font-semibold text-text-secondary">{batchCostValues.length ? fmt(Math.max(...batchCostValues)) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Median</p><p class="text-[9px] font-semibold text-text-secondary">{sortedBatchCostValues.length ? fmt(sortedBatchCostValues[Math.floor(sortedBatchCostValues.length / 2)]) : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {data.batchAnomalies.filter(a => a.metric === 'cost').length > 0 ? '#ef4444' : 'inherit'};">{data.batchAnomalies.filter(a => a.metric === 'cost').length}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Batches</p><p class="text-[9px] font-semibold text-text-secondary">{batchCostValues.length}/{runBatchCount}</p></div>
					{/if}
				</div>
			{:else}
				<!-- Ton History: cost/kg trend across runs -->
				<div class="flex-1 flex flex-col">
					{#if historyCostChart}
						<svg viewBox="0 0 {CW} {CH + 20}" class="w-full">
							<defs><linearGradient id="histCostGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ec5b13" stop-opacity="0.22" /><stop offset="100%" stop-color="#ec5b13" stop-opacity="0.02" /></linearGradient></defs>
							<path d={historyCostChart.area} fill="url(#histCostGrad)" /><path d={historyCostChart.line} fill="none" stroke="#ec5b13" stroke-width="1.5" opacity="0.7" />
							{#each historyCostChart.points as pt, pi}
								<circle cx={pt.x} cy={pt.y} r={historyRuns[pi]?.runId === data.activeRunId ? 3 : 1.5} fill="#ec5b13" opacity={historyRuns[pi]?.runId === data.activeRunId ? 1 : 0.45} />
								<text x={pt.x} y={CH + 18} text-anchor="middle" fill="#666666" font-size="5">{historyRunLabels[pi]}</text>
							{/each}
						</svg>
						<!-- Comparison table with delta-vs-previous -->
						<div class="mt-1 space-y-0.5">
							{#each historyRuns as hr, hi}
								{@const prevCost = hi > 0 ? historyRuns[hi - 1].costPerKg : null}
								{@const delta = prevCost !== null ? hr.costPerKg - prevCost : null}
								<div class="flex items-center gap-1.5 px-1 py-0.5 rounded text-[7px] {hr.runId === data.activeRunId ? 'bg-primary/5' : ''}">
									<span class="font-medium text-text-secondary w-12 flex-none">{hr.runNumber}</span>
									<span class="text-text-muted/40 w-14 flex-none">{fmt(hr.totalCost)}</span>
									<span class="text-text-muted/40 w-14 flex-none">{fmt(hr.avgCostPerBatch)}/lot</span>
									<span class="text-text-muted/40 w-12 flex-none">{fmt(hr.costPerKg)}/kg</span>
									<span class="flex-1 text-right" style="color: {delta === null ? '#6B7280' : delta <= 0 ? '#bef264' : '#ef4444'};">{delta !== null ? (delta <= 0 ? '' : '+') + fmt(delta) : '—'}</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex-1 flex items-center justify-center"><span class="text-[9px] text-text-muted/40">Need 2+ runs for history</span></div>
					{/if}
				</div>
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					<div><p class="text-[7px] text-text-muted/40 uppercase">Cost/Batch</p><p class="text-[9px] font-semibold text-text-secondary">{runCostAgg ? fmt(runCostAgg.avgCostPerBatch) : '—'}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Cost/KG</p><p class="text-[9px] font-semibold text-text-secondary">{rs ? fmt(rs.costPerKg) : '—'}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Projected</p><p class="text-[9px] font-semibold text-text-secondary">{runCostAgg ? fmt(runCostAgg.projectedTotal) : '—'}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {anomalyCount > 0 ? '#ef4444' : 'inherit'};">{data.batchAnomalies.filter(a => a.metric === 'cost').length}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Run Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.cost}/{currentRunRank.total}</p></div>
				</div>
			{/if}
		{:else if carouselIndex === 1}
			<!-- ═══ SOLVENT INTELLIGENCE ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #bef264;">water_drop</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Solvent Intelligence</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.operator_name ?? selectedBatchInfo.status}</span>
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
					{#if selectedEthRow.recovery_pct !== null && runEthAgg}
						{@const ethDelta = selectedEthRow.recovery_pct - runEthAgg.avgRecovery}
						<span class="text-[9px] font-medium" style="color: {ethDelta >= 0 ? '#bef264' : '#ef4444'};">{ethDelta >= 0 ? '+' : ''}{ethDelta.toFixed(1)} vs run avg</span>
					{/if}
					{#if batchAnomalyMap.get(selectedBatchId)?.some(a => a.metric === 'recovery')}
						<span class="text-[7px] px-1 py-0.5 rounded bg-red-900/30 text-red-400">ANOMALY</span>
					{/if}
				{:else}
					<span class="text-base font-semibold text-text-primary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</span>
					{#if comparisonTarget}
						{@const rd = compDelta(runEthAgg?.avgRecovery ?? 0, comparisonTarget, 'avgEthanolRecovery')}
						{#if rd !== null}
							<span class="text-[9px] font-medium" style="color: {rd >= 0 ? '#bef264' : '#ef4444'};">{rd >= 0 ? '+' : ''}{rd.toFixed(1)} vs {comparisonTarget.runNumber}</span>
						{/if}
					{:else}
						{#if runEthDelta >= 0}
							<span class="text-[9px] font-medium" style="color: #bef264;">+{runEthDelta.toFixed(1)}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #ef4444;">{runEthDelta.toFixed(1)}</span>
						{/if}
					{/if}
					<span class="text-[8px] text-text-muted/35">run avg recovery</span>
				{/if}
			</div>

			<!-- Mode toggle -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(30, 30, 30, 0.8);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'lot' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => ethanolMode = 'lot'}>Run Summary</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'batch' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => ethanolMode = 'batch'}>Batch Breakdown</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'history' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => ethanolMode = 'history'}>Ton History</button>
			</div>

			{#if ethanolMode === 'lot'}
				<!-- KPI Strip — bordered cells like reference -->
				<div class="flex gap-1.5 mb-3 overflow-x-auto">
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Recovery %</span>
						<span class="text-sm font-bold" style="color: {lotEtohRecoveryPct >= 95 ? '#bef264' : '#ef4444'};">{lotEtohRecoveryPct.toFixed(1)}%</span>
						{#if runEthAgg}
							<span class="text-[7px]" style="color: {lotEtohRecoveryPct >= runEthAgg.avgRecovery ? '#bef264' : '#ef4444'};">{lotEtohRecoveryPct >= runEthAgg.avgRecovery ? '+' : ''}{(lotEtohRecoveryPct - runEthAgg.avgRecovery).toFixed(1)}% vs avg</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Liters Issued</span>
						<span class="text-sm font-bold text-text-primary">{lotEtohIssued.toFixed(0)}L</span>
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Liters Lost</span>
						<span class="text-sm font-bold" style="color: #ef4444;">{lotEtohLost.toFixed(0)}L</span>
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Recovered</span>
						<span class="text-sm font-bold text-text-primary">{lotEtohRecovered.toFixed(0)}L</span>
					</div>
				</div>

				<!-- Diagnostic Waterfall: Loss Bridge — vertical bars like reference -->
				<div class="flex-1 flex flex-col mb-2">
					<div class="flex justify-between items-center mb-1.5">
						<h4 class="text-[8px] font-bold uppercase text-text-muted flex items-center gap-1.5">
							<span class="w-1.5 h-1.5" style="background: #bef264;"></span> Diagnostic Waterfall: Loss Bridge (Liters)
						</h4>
					</div>
					{#if true}
					{@const maxH = 100}
					{@const issuedH = maxH}
					{@const recoveredH = lotEtohIssued > 0 ? (lotEtohRecovered / lotEtohIssued) * maxH : 0}
					{@const filtLossH = lotEtohIssued > 0 ? (Math.abs(lotFiltrationLossL) / lotEtohIssued) * maxH : 0}
					{@const distLossH = lotEtohIssued > 0 ? (lotDistillationLossL / lotEtohIssued) * maxH : 0}
					{@const otherLossH = lotEtohIssued > 0 ? (lotOtherLossL / lotEtohIssued) * maxH : 0}
					<div class="flex items-end justify-between gap-1 px-2" style="height: 120px;">
						<!-- Issued -->
						<div class="flex-1 flex flex-col items-center">
							<div class="w-full rounded-t" style="height: {issuedH}px; background: rgba(255,255,255,0.8);"></div>
							<span class="text-[7px] font-bold text-text-secondary mt-1">ISSUED</span>
							<span class="text-[7px] text-text-muted">{lotEtohIssued.toFixed(0)}L</span>
						</div>
						<!-- Filtration Loss -->
						<div class="flex-1 flex flex-col items-center" style="transform: translateY(-{Math.round(recoveredH + distLossH + otherLossH)}px);">
							<div class="w-full rounded-t" style="height: {Math.max(4, filtLossH)}px; background: rgba(239, 68, 68, 0.8);"></div>
							<span class="text-[7px] font-bold" style="color: #ef4444;">FILT</span>
							<span class="text-[7px] text-text-muted">-{Math.abs(lotFiltrationLossL).toFixed(0)}L</span>
						</div>
						<!-- Distillation Loss -->
						<div class="flex-1 flex flex-col items-center" style="transform: translateY(-{Math.round(recoveredH + otherLossH)}px);">
							<div class="w-full rounded-t" style="height: {Math.max(4, distLossH)}px; background: rgba(239, 68, 68, 0.6);"></div>
							<span class="text-[7px] font-bold" style="color: #ef4444;">DIST</span>
							<span class="text-[7px] text-text-muted">-{lotDistillationLossL.toFixed(0)}L</span>
						</div>
						<!-- Other/Transfer Loss -->
						<div class="flex-1 flex flex-col items-center" style="transform: translateY(-{Math.round(recoveredH)}px);">
							<div class="w-full rounded-t border border-dashed" style="height: {Math.max(4, otherLossH)}px; background: rgba(236, 91, 19, 0.3); border-color: rgba(107,140,168,0.5);"></div>
							<span class="text-[7px] font-bold text-text-muted">OTHER</span>
							<span class="text-[7px] text-text-muted">-{lotOtherLossL.toFixed(0)}L</span>
						</div>
						<!-- Recovered -->
						<div class="flex-1 flex flex-col items-center">
							<div class="w-full rounded-t" style="height: {Math.max(4, recoveredH)}px; background: rgba(190, 242, 100, 0.8);"></div>
							<span class="text-[7px] font-bold" style="color: #bef264;">RECOV</span>
							<span class="text-[7px] text-text-muted">{lotEtohRecovered.toFixed(0)}L</span>
						</div>
					</div>
					{/if}
				</div>

				<!-- Comparative Recovery — bullet chart like reference -->
				<div class="mb-2 border border-border-card p-2.5 rounded" style="background: rgba(22, 22, 22, 0.8);">
					<h4 class="text-[8px] font-bold uppercase text-text-muted mb-2">Comparative Recovery</h4>
					<div class="relative h-6 flex flex-col justify-center">
						<!-- Scale -->
						<div class="absolute top-0 w-full flex justify-between text-[6px] text-text-muted">
							<span>75%</span><span>80%</span><span>85%</span><span>90%</span><span>95%</span>
						</div>
						<!-- Track -->
						{#if true}
						{@const runAvgPct = runEthAgg?.avgRecovery ?? 0}
						{@const bestPct = bestHistoricalRecovery}
						<div class="w-full h-3 mt-2 relative overflow-hidden" style="background: rgba(13, 13, 13, 0.7);">
							<!-- Target range 90-95% -->
							<div class="absolute h-full" style="left: 75%; width: 15%; background: rgba(30, 30, 30, 1); border-left: 1px solid rgba(30, 30, 30, 1); border-right: 1px solid rgba(30, 30, 30, 1);"></div>
							<!-- Best marker -->
							<div class="absolute h-full w-0.5 z-10" style="left: {Math.min(100, Math.max(0, (bestPct - 75) / 20 * 100))}%; background: #ec5b13;"></div>
							<!-- Run Avg marker -->
							<div class="absolute h-full w-0.5 z-10" style="left: {Math.min(100, Math.max(0, (runAvgPct - 75) / 20 * 100))}%; background: #9CA3AF;"></div>
							<!-- Current bar -->
							<div class="absolute h-full" style="left: 0; width: {Math.min(100, Math.max(0, (lotEtohRecoveryPct - 75) / 20 * 100))}%; background: #bef264;"></div>
						</div>
						<div class="flex justify-between mt-0.5 text-[7px]">
							<span style="color: #bef264;">CURRENT: {lotEtohRecoveryPct.toFixed(1)}%</span>
							<span class="text-text-muted">AVG: {runAvgPct.toFixed(1)}%</span>
							<span style="color: #ec5b13;">BEST: {bestPct.toFixed(1)}%</span>
						</div>
						{/if}
					</div>
				</div>

				<!-- Loss Sources Ranking — horizontal bars like reference -->
				<div class="mb-2 border border-border-card p-2.5 rounded" style="background: rgba(22, 22, 22, 0.8);">
					<h4 class="text-[8px] font-bold uppercase text-text-muted mb-2">Loss Sources Ranking</h4>
					{#if true}
					{@const maxLoss = Math.max(Math.abs(lotFiltrationLossL), lotDistillationLossL, lotOtherLossL, 0.1)}
					<div class="space-y-1.5">
						<div class="flex items-center gap-2">
							<span class="w-14 text-[7px] text-text-muted uppercase">Filtration</span>
							<div class="flex-1 h-1.5" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(Math.abs(lotFiltrationLossL) / maxLoss) * 100}%; background: #ef4444;"></div>
							</div>
							<span class="text-[7px] font-bold text-text-secondary">{Math.abs(lotFiltrationLossL).toFixed(0)}L</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-14 text-[7px] text-text-muted uppercase">Distill.</span>
							<div class="flex-1 h-1.5" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(lotDistillationLossL / maxLoss) * 100}%; background: rgba(239, 68, 68, 0.7);"></div>
							</div>
							<span class="text-[7px] font-bold text-text-secondary">{lotDistillationLossL.toFixed(0)}L</span>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-14 text-[7px] text-text-muted uppercase">Other</span>
							<div class="flex-1 h-1.5" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(lotOtherLossL / maxLoss) * 100}%; background: rgba(236, 91, 19, 0.5);"></div>
							</div>
							<span class="text-[7px] font-bold text-text-muted">{lotOtherLossL.toFixed(0)}L</span>
						</div>
					</div>
					{/if}
				</div>

				<!-- D-Limo sub-row -->
				<div class="flex items-center gap-3 mb-1" style="border-top: 1px solid rgba(30, 30, 30, 0.5); padding-top: 4px;">
					<span class="text-[7px] font-medium uppercase text-text-muted/25">D-Limo</span>
					<span class="text-[7px] text-text-muted/35">Rec. <span class="text-text-muted/55 font-medium">{data.solventTotals.limonene_recovered.toFixed(1)}L</span></span>
					<span class="text-[7px] text-text-muted/35">Lost <span class="font-medium" style="color: rgba(239, 68, 68, 0.45);">{data.solventTotals.limonene_lost.toFixed(1)}L</span></span>
				</div>
				<!-- Bottom: 5-col -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedEthRow}
						{@const ethRank = [...data.runEthanolBreakdown].filter(e => e.recovery_pct !== null).sort((a,b) => (b.recovery_pct ?? 0) - (a.recovery_pct ?? 0)).findIndex(e => e.batch_id === selectedBatchId) + 1}
						{@const ethCount = data.runEthanolBreakdown.filter(e => e.recovery_pct !== null).length}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{ethRank}/{ethCount}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {(selectedEthRow.recovery_pct ?? 0) >= (runEthAgg?.avgRecovery ?? 0) ? '#bef264' : '#ef4444'};">{((selectedEthRow.recovery_pct ?? 0) - (runEthAgg?.avgRecovery ?? 0)).toFixed(1)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">D-Limo</p><p class="text-[9px] font-semibold text-text-secondary">{limRecoveryRate.toFixed(0)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {(batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'recovery').length ?? 0) > 0 ? '#ef4444' : 'inherit'};">{batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'recovery').length ?? 0}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Conc.</p><p class="text-[9px] font-semibold text-text-secondary">{selectedEthRow.concentration_gl?.toFixed(1) ?? '—'} g/L</p></div>
					{:else}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Best</p><p class="text-[9px] font-semibold" style="color: #bef264;">{runEthAgg?.bestBatch ? `${runEthAgg.bestBatch.batch_number.replace('SG-', '')} ${runEthAgg.bestBatch.recovery_pct.toFixed(1)}%` : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Worst</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runEthAgg?.worstBatch ? `${runEthAgg.worstBatch.batch_number.replace('SG-', '')} ${runEthAgg.worstBatch.recovery_pct.toFixed(1)}%` : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {data.batchAnomalies.filter(a => a.metric === 'recovery').length > 0 ? '#ef4444' : 'inherit'};">{data.batchAnomalies.filter(a => a.metric === 'recovery').length}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Proj. Rec.</p><p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.recovery}/{currentRunRank.total}</p></div>
					{/if}
				</div>
			{:else if ethanolMode === 'batch'}
				<!-- Header row -->
				<div class="flex items-center gap-1.5 px-1.5 py-0.5 text-[7px] font-bold text-text-muted/40 uppercase tracking-wider border-b border-border-subtle mb-0.5">
					<span class="w-16 flex-none">Batch</span>
					<span class="w-3 flex-none"></span>
					<span class="w-10 text-right flex-none">Iss.</span>
					<span class="w-10 text-right flex-none">Rec.</span>
					<span class="w-10 text-right flex-none">Lost</span>
					<span class="flex-1">Recovery</span>
					<span class="w-12 text-right flex-none">vs Avg</span>
				</div>
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each [...data.runEthanolBreakdown].sort((a, b) => (b.recovery_pct ?? 0) - (a.recovery_pct ?? 0)) as eb, ebi}
							{@const hasAnomaly = batchAnomalyMap.get(eb.batch_id)?.some(a => a.metric === 'recovery')}
							{@const isBest = ebi === 0 && eb.recovery_pct !== null}
							{@const sortedLen = data.runEthanolBreakdown.filter(e => e.recovery_pct !== null).length}
							{@const isLow = ebi === sortedLen - 1 && eb.recovery_pct !== null && sortedLen > 1}
							{@const vsAvg = eb.recovery_pct !== null && runEthAgg ? eb.recovery_pct - runEthAgg.avgRecovery : null}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === eb.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(eb.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">
									{eb.batch_number.replace('SG-', '')}
									{#if isBest}<span class="text-[6px] px-0.5 rounded ml-0.5" style="background: rgba(139,170,124,0.2); color: #bef264;">BEST</span>{/if}
									{#if isLow}<span class="text-[6px] px-0.5 rounded ml-0.5" style="background: rgba(196,137,106,0.2); color: #ef4444;">LOW</span>{/if}
								</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {eb.status === 'Completed' ? 'bg-primary' : eb.status === 'In Progress' ? 'bg-blue-500' : eb.status === 'Pending Review' ? 'bg-amber-500' : eb.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								<span class="text-[7px] text-text-muted/50 w-10 text-right flex-none">{eb.ethanol_issued_l?.toFixed(0) ?? '—'}</span>
								<span class="text-[7px] text-text-muted/50 w-10 text-right flex-none">{eb.ethanol_recovered_l?.toFixed(0) ?? '—'}</span>
								<span class="text-[7px] w-10 text-right flex-none" style="color: #ef4444;">{eb.ethanol_lost_l?.toFixed(0) ?? '—'}</span>
								{#if eb.recovery_pct !== null}
									<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
										<div class="h-full rounded-full" style="width: {Math.min(100, eb.recovery_pct)}%; background: {eb.recovery_pct < 93 ? 'rgba(239, 68, 68, 0.7)' : eb.recovery_pct < 95 ? 'rgba(196, 180, 106, 0.7)' : 'rgba(190, 242, 100, 0.7)'};"></div>
									</div>
									<span class="text-[8px] font-medium w-12 text-right flex-none" style="color: {vsAvg !== null && vsAvg >= 0 ? '#bef264' : '#ef4444'};">{vsAvg !== null ? (vsAvg >= 0 ? '+' : '') + vsAvg.toFixed(1) : '—'}</span>
								{:else}
									<div class="flex-1 h-1 rounded-full" style="background: rgba(30, 30, 30, 0.5);"></div>
									<span class="text-[7px] text-text-muted/30 w-12 text-right flex-none">—</span>
								{/if}
								{#if hasAnomaly}<span class="h-1.5 w-1.5 rounded-full bg-red-500 flex-none"></span>{/if}
							</button>
						{/each}
					</div>
				</div>
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedEthRow}
						{@const ethRank = [...data.runEthanolBreakdown].filter(e => e.recovery_pct !== null).sort((a,b) => (b.recovery_pct ?? 0) - (a.recovery_pct ?? 0)).findIndex(e => e.batch_id === selectedBatchId) + 1}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{ethRank}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {(selectedEthRow.recovery_pct ?? 0) >= (runEthAgg?.avgRecovery ?? 0) ? '#bef264' : '#ef4444'};">{((selectedEthRow.recovery_pct ?? 0) - (runEthAgg?.avgRecovery ?? 0)).toFixed(1)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Loss</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{selectedEthRow.ethanol_lost_l?.toFixed(0) ?? '—'} L</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Conc.</p><p class="text-[9px] font-semibold text-text-secondary">{selectedEthRow.concentration_gl?.toFixed(1) ?? '—'} g/L</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold">{batchAnomalyMap.get(selectedBatchId)?.filter(a => a.metric === 'recovery').length ?? 0}</p></div>
					{:else}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Best</p><p class="text-[9px] font-semibold" style="color: #bef264;">{runEthAgg?.bestBatch?.recovery_pct.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Worst</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runEthAgg?.worstBatch?.recovery_pct.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Avg</p><p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Loss</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runEthAgg?.totalLoss.toFixed(0) ?? '—'} L</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {data.batchAnomalies.filter(a => a.metric === 'recovery').length > 0 ? '#ef4444' : 'inherit'};">{data.batchAnomalies.filter(a => a.metric === 'recovery').length}</p></div>
					{/if}
				</div>
			{:else}
				<!-- Ton History: recovery% across runs -->
				<div class="flex-1 flex flex-col">
					{#if historyRecoveryChart}
						<svg viewBox="0 0 {CW} {CH + 20}" class="w-full">
							<defs><linearGradient id="histEthGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bef264" stop-opacity="0.22" /><stop offset="100%" stop-color="#bef264" stop-opacity="0.02" /></linearGradient></defs>
							{#if true}
								{@const targetY95 = computeTargetY(95, historyRecoveryValues, CH + 20)}
								<line x1="10" y1={targetY95} x2="230" y2={targetY95} stroke="#666666" stroke-dasharray="3 4" stroke-width="0.5" opacity="0.4" />
								<text x="233" y={targetY95 + 3} text-anchor="end" fill="#666666" font-size="5" opacity="0.3">95%</text>
							{/if}
							<path d={historyRecoveryChart.area} fill="url(#histEthGrad)" /><path d={historyRecoveryChart.line} fill="none" stroke="#bef264" stroke-width="1.5" opacity="0.7" />
							{#each historyRecoveryChart.points as pt, pi}
								<circle cx={pt.x} cy={pt.y} r={historyRuns[pi]?.runId === data.activeRunId ? 3 : 1.5} fill="#bef264" opacity={historyRuns[pi]?.runId === data.activeRunId ? 1 : 0.45} />
								<text x={pt.x} y={CH + 18} text-anchor="middle" fill="#666666" font-size="5">{historyRunLabels[pi]}</text>
							{/each}
						</svg>
						<!-- Comparison table -->
						<div class="mt-1 space-y-0.5">
							{#each historyRuns as hr}
								<div class="flex items-center gap-1.5 px-1 py-0.5 rounded text-[7px] {hr.runId === data.activeRunId ? 'bg-primary/5' : ''}">
									<span class="font-medium text-text-secondary w-12 flex-none">{hr.runNumber}</span>
									<span class="text-text-muted/40 w-14 flex-none">{hr.totalEthanolIssued.toFixed(0)}L issued</span>
									<span class="text-text-muted/40 w-14 flex-none">{hr.totalEthanolRecovered.toFixed(0)}L rec.</span>
									<span class="text-text-muted/40 flex-1 text-right" style="color: {hr.avgEthanolRecovery >= 95 ? '#bef264' : '#ef4444'};">{hr.avgEthanolRecovery.toFixed(1)}%</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex-1 flex items-center justify-center"><span class="text-[9px] text-text-muted/40">Need 2+ runs for history</span></div>
					{/if}
				</div>
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					<div><p class="text-[7px] text-text-muted/40 uppercase">Best Run</p><p class="text-[9px] font-semibold" style="color: #bef264;">{[...data.runHistory].sort((a,b) => b.avgEthanolRecovery - a.avgEthanolRecovery)[0]?.runNumber ?? '—'}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Recovery</p><p class="text-[9px] font-semibold text-text-secondary">{runEthAgg?.avgRecovery.toFixed(1) ?? '—'}%</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Loss</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runEthAgg?.totalLoss.toFixed(0) ?? '—'} L</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold">{data.batchAnomalies.filter(a => a.metric === 'recovery').length}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Run Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.recovery}/{currentRunRank.total}</p></div>
				</div>
			{/if}
		{:else}
			<!-- ═══ YIELD & QUALITY ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #bef264;">science</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Yield & Quality</h3>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedBatchId && selectedBatchInfo}
						<span class="text-[8px] font-medium text-primary">{selectedBatchInfo.batch_number}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{selectedBatchInfo.operator_name ?? selectedBatchInfo.status}</span>
					{:else}
						<span class="text-[8px] text-text-muted/35">{runLabel}</span>
						<span class="text-[8px] text-text-muted/25">|</span>
						<span class="text-[8px] text-text-muted/35">{yieldFinishedBatches.length}/{runBatchCount} finished</span>
					{/if}
				</div>
			</div>
			<div class="flex items-baseline gap-1.5 mb-2">
				{#if selectedBatchId && selectedYieldRow}
					<span class="text-base font-semibold text-text-primary">{selectedYieldRow.final_product_g != null ? (selectedYieldRow.final_product_g / 1000).toFixed(2) : '—'} kg</span>
					<span class="text-[9px] text-text-muted/50">{selectedYieldRow.overall_yield_pct?.toFixed(2) ?? '—'}%</span>
					{#if selectedYieldRow.overall_yield_pct !== null && runYieldAgg}
						{@const yieldDiff = selectedYieldRow.overall_yield_pct - runYieldAgg.overallYield}
						<span class="text-[9px] font-medium" style="color: {yieldDiff >= 0 ? '#bef264' : '#ef4444'};">{yieldDiff >= 0 ? '+' : ''}{yieldDiff.toFixed(2)} vs avg</span>
					{/if}
					{#if batchAnomalyMap.get(selectedBatchId)?.some(a => a.metric === 'yield')}
						<span class="text-[7px] px-1 py-0.5 rounded bg-red-900/30 text-red-400">ANOMALY</span>
					{/if}
				{:else}
					<span class="text-base font-semibold text-text-primary">{runYieldAgg?.totalProduced.toFixed(1) ?? '—'} kg</span>
					<span class="text-[9px] text-text-muted/50">{runYieldAgg?.overallYield.toFixed(2) ?? '—'}%</span>
					{#if comparisonTarget}
						{@const yd = compDelta(runYieldAgg?.overallYield ?? 0, comparisonTarget, 'overallYieldPct')}
						{#if yd !== null}
							<span class="text-[9px] font-medium" style="color: {yd >= 0 ? '#bef264' : '#ef4444'};">{yd >= 0 ? '+' : ''}{yd.toFixed(2)} vs {comparisonTarget.runNumber}</span>
						{/if}
					{:else if runYieldAgg}
						{@const yd2 = runYieldAgg.overallYield - avgYield}
						{#if yd2 >= 0}
							<span class="text-[9px] font-medium" style="color: #bef264;">+{yd2.toFixed(2)}</span>
						{:else}
							<span class="text-[9px] font-medium" style="color: #ef4444;">{yd2.toFixed(2)}</span>
						{/if}
					{/if}
				{/if}
			</div>

			<!-- Mode toggle (4 modes for yield) -->
			<div class="flex gap-px rounded overflow-hidden mb-2" style="border: 1px solid rgba(30, 30, 30, 0.8);">
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'lot' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'lot' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'lot'}>Run Summary</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'batch' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'batch'}>Batch Contrib.</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'history' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'history'}>Ton History</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'quality' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'quality' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'quality'}>Quality</button>
			</div>

			{#if yieldMode === 'lot'}
				<!-- KPI Strip — bordered cells like reference -->
				<div class="flex gap-1.5 mb-3 overflow-x-auto">
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Final Product</span>
						<span class="text-sm font-bold text-text-primary">{lotFinalProductKg.toFixed(2)} <span class="text-[8px] font-normal text-text-muted">kg</span></span>
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Overall Yield</span>
						<span class="text-sm font-bold" style="color: #bef264;">{lotExtractRate.toFixed(2)}%</span>
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Proj. Yield</span>
						<span class="text-sm font-bold text-text-primary">{runYieldAgg?.projectedFinal.toFixed(1) ?? '—'} <span class="text-[8px] font-normal text-text-muted">kg</span></span>
					</div>
					<div class="flex-1 min-w-[70px] border border-border-card p-2 flex flex-col" style="background: rgba(22, 22, 22, 0.8);">
						<span class="text-[7px] font-bold text-text-muted uppercase tracking-widest">Purity</span>
						<span class="text-sm font-bold text-text-primary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</span>
					</div>
				</div>

				<!-- Mass Conversion Cascade — card boxes with arrows like reference -->
				<div class="mb-3">
					<h4 class="text-[8px] font-bold uppercase text-text-muted mb-2">Mass Conversion Cascade</h4>
					<div class="flex items-center justify-between gap-1">
						<!-- Node: Raw Leaf -->
						<div class="flex-1 border border-border-card p-2 rounded-lg text-center" style="background: rgba(22, 22, 22, 0.9);">
							<p class="text-[7px] text-text-muted font-bold uppercase">Raw Leaf</p>
							<p class="text-sm font-bold text-text-primary">{lotIntakeKg.toFixed(0)}<span class="text-[7px] text-text-muted">kg</span></p>
						</div>
						<!-- Arrow + Loss -->
						<div class="flex flex-col items-center min-w-[28px]">
							<span class="text-text-muted text-[10px]">&rarr;</span>
							<span class="text-[6px] px-0.5 rounded font-bold" style="background: rgba(196,137,106,0.2); color: #ef4444;">-{lotGrindLossKg.toFixed(0)}kg</span>
						</div>
						<!-- Node: Powder -->
						<div class="flex-1 border border-border-card p-2 rounded-lg text-center" style="background: rgba(22, 22, 22, 0.9);">
							<p class="text-[7px] text-text-muted font-bold uppercase">Powder</p>
							<p class="text-sm font-bold text-text-primary">{lotPowderKg.toFixed(0)}<span class="text-[7px] text-text-muted">kg</span></p>
						</div>
						<!-- Arrow + Loss -->
						<div class="flex flex-col items-center min-w-[28px]">
							<span class="text-text-muted text-[10px]">&rarr;</span>
							<span class="text-[5px] text-text-muted text-center leading-tight">spent cake</span>
						</div>
						<!-- Node: Crude Extract -->
						<div class="flex-1 border p-2 rounded-lg text-center" style="background: rgba(139,170,124,0.1); border-color: rgba(139,170,124,0.3);">
							<p class="text-[7px] font-bold uppercase" style="color: #bef264;">Crude</p>
							<p class="text-sm font-bold text-text-primary">{lotExtractTotalKg.toFixed(1)}<span class="text-[7px] text-text-muted">kg</span></p>
						</div>
						<!-- Arrow + Loss -->
						<div class="flex flex-col items-center min-w-[28px]">
							<span class="text-text-muted text-[10px]">&rarr;</span>
							<span class="text-[6px] px-0.5 rounded font-bold" style="background: rgba(196,137,106,0.2); color: #ef4444;">-{lotPrecipLossKg.toFixed(1)}kg</span>
						</div>
						<!-- Node: Final Product -->
						<div class="flex-1 p-2 rounded-lg text-center" style="background: #A3E635;">
							<p class="text-[7px] font-bold uppercase text-black/60">Final</p>
							<p class="text-sm font-bold text-black">{lotFinalProductKg.toFixed(2)}<span class="text-[7px] text-black/50">kg</span></p>
						</div>
					</div>
				</div>

				<!-- Batch Table — with stage progress bars like reference -->
				<div class="border border-border-card rounded overflow-hidden mb-2" style="max-height: 120px;">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0" style="background: rgba(13, 13, 13, 0.9);">
							<tr class="text-[7px] font-bold text-text-muted uppercase tracking-widest">
								<th class="px-2 py-1" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Batch</th>
								<th class="px-2 py-1" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Grind</th>
								<th class="px-2 py-1" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Extract</th>
								<th class="px-2 py-1" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Drying</th>
								<th class="px-2 py-1 text-right" style="border-bottom: 1px solid rgba(30, 30, 30, 0.8);">Yield%</th>
							</tr>
						</thead>
						<tbody class="text-[8px] overflow-y-auto">
							{#each [...data.runYieldBreakdown].sort((a, b) => (b.overall_yield_pct ?? 0) - (a.overall_yield_pct ?? 0)).slice(0, 5) as yb, yi}
								<tr class="{yi % 2 === 0 ? 'bg-bg-card-hover/20' : ''} hover:bg-bg-card-hover cursor-pointer" style="border-bottom: 1px solid rgba(55,65,81,0.1);" onclick={() => selectBatch(yb.batch_id)}>
									<td class="px-2 py-1 font-mono text-text-muted">{yb.batch_number.replace('SG-', '')}</td>
									<td class="px-2 py-1"><div class="h-1 w-full rounded-full overflow-hidden" style="background: rgba(55,65,81,0.3);"><div class="h-full rounded-full" style="width: {lotPowderKg > 0 ? Math.min(100, (yb.leaf_input_kg / lotIntakeKg) * lotPowderConvPct) : 80}%; background: #A3E635;"></div></div></td>
									<td class="px-2 py-1"><div class="h-1 w-full rounded-full overflow-hidden" style="background: rgba(55,65,81,0.3);"><div class="h-full rounded-full" style="width: {yb.overall_yield_pct ? Math.min(100, yb.overall_yield_pct * 30) : 0}%; background: #A3E635;"></div></div></td>
									<td class="px-2 py-1"><div class="h-1 w-full rounded-full overflow-hidden" style="background: rgba(55,65,81,0.3);"><div class="h-full rounded-full" style="width: {yb.final_product_g ? 90 : 0}%; background: #A3E635;"></div></div></td>
									<td class="px-2 py-1 text-right font-mono" style="color: {(yb.overall_yield_pct ?? 0) >= (runYieldAgg?.overallYield ?? 0) ? '#bef264' : '#ef4444'};">{yb.overall_yield_pct?.toFixed(2) ?? '—'}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Yield Loss Waterfall — horizontal bars like reference -->
				<div class="mb-2">
					<h4 class="text-[8px] font-bold uppercase text-text-muted mb-1.5">Yield Loss Waterfall</h4>
					{#if true}
					{@const maxLossKg = Math.max(lotGrindLossKg, lotExtractionLossKg, lotPrecipLossKg, 0.1)}
					<div class="space-y-1.5">
						<div>
							<div class="flex items-center justify-between mb-0.5">
								<span class="text-[7px] uppercase text-text-muted">Grind Structural</span>
								<span class="text-[7px] font-mono text-text-secondary">{lotGrindLossKg.toFixed(1)}kg</span>
							</div>
							<div class="h-4 w-full rounded overflow-hidden" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(lotGrindLossKg / maxLossKg) * 60}%; background: rgba(239, 68, 68, 0.4);"></div>
							</div>
						</div>
						<div>
							<div class="flex items-center justify-between mb-0.5">
								<span class="text-[7px] uppercase text-text-muted">Extraction Recoverable</span>
								<span class="text-[7px] font-mono text-text-secondary">{lotExtractionLossKg.toFixed(1)}kg</span>
							</div>
							<div class="h-4 w-full rounded overflow-hidden" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(lotExtractionLossKg / maxLossKg) * 60}%; background: rgba(239, 68, 68, 0.3);"></div>
							</div>
						</div>
						<div>
							<div class="flex items-center justify-between mb-0.5">
								<span class="text-[7px] uppercase text-text-muted">Precip/Drying</span>
								<span class="text-[7px] font-mono text-text-secondary">{lotPrecipLossKg.toFixed(1)}kg</span>
							</div>
							<div class="h-4 w-full rounded overflow-hidden" style="background: rgba(13, 13, 13, 0.7);">
								<div class="h-full" style="width: {(lotPrecipLossKg / maxLossKg) * 60}%; background: rgba(239, 68, 68, 0.2);"></div>
							</div>
						</div>
					</div>
					{/if}
				</div>
				<!-- Bottom: 5-col -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedYieldRow}
						{@const yRank = [...data.runYieldBreakdown].filter(y => y.overall_yield_pct !== null).sort((a,b) => (b.overall_yield_pct ?? 0) - (a.overall_yield_pct ?? 0)).findIndex(y => y.batch_id === selectedBatchId) + 1}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{yRank}/{yieldFinishedBatches.length}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {(selectedYieldRow.overall_yield_pct ?? 0) >= (runYieldAgg?.overallYield ?? 0) ? '#bef264' : '#ef4444'};">{((selectedYieldRow.overall_yield_pct ?? 0) - (runYieldAgg?.overallYield ?? 0)).toFixed(2)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Purity</p><p class="text-[9px] font-semibold text-text-secondary">{selectedYieldRow.hplc_purity_pct?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Alkaloids</p><p class="text-[9px] font-semibold text-text-secondary">{selectedYieldRow.mitragynine_pct?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Deviations</p><p class="text-[9px] font-semibold" style="color: {selectedYieldRow.deviation_count > 0 ? '#ef4444' : 'inherit'};">{selectedYieldRow.deviation_count}</p></div>
					{:else}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Best</p><p class="text-[9px] font-semibold" style="color: #bef264;">{runYieldAgg?.bestBatch ? `${runYieldAgg.bestBatch.batch_number.replace('SG-', '')}` : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Worst</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runYieldAgg?.worstBatch ? `${runYieldAgg.worstBatch.batch_number.replace('SG-', '')}` : '—'}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Projected</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.projectedFinal.toFixed(1) ?? '—'} kg</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">{runYieldAgg?.avgPurity !== null && (runYieldAgg?.avgPurity ?? 100) < 83 ? 'ALERT' : 'Purity'}</p><p class="text-[9px] font-semibold" style="color: {runYieldAgg?.avgPurity !== null && (runYieldAgg?.avgPurity ?? 100) < 83 ? '#ef4444' : 'inherit'};">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.yield}/{currentRunRank.total}</p></div>
					{/if}
				</div>
			{:else if yieldMode === 'batch'}
				<!-- Header row -->
				<div class="flex items-center gap-1.5 px-1.5 py-0.5 text-[7px] font-bold text-text-muted/40 uppercase tracking-wider border-b border-border-subtle mb-0.5">
					<span class="w-16 flex-none">Batch</span>
					<span class="w-3 flex-none"></span>
					<span class="w-16 flex-none">Input&rarr;Out</span>
					<span class="flex-1">Yield</span>
					<span class="w-10 text-right flex-none">Yield%</span>
					<span class="w-8 text-right flex-none">Purity</span>
				</div>
				<div class="flex-1 overflow-y-auto mb-2">
					<div class="space-y-0.5">
						{#each [...data.runYieldBreakdown].sort((a, b) => (b.overall_yield_pct ?? 0) - (a.overall_yield_pct ?? 0)) as yb}
							{@const hasAnomaly = batchAnomalyMap.get(yb.batch_id)?.some(a => a.metric === 'yield')}
							<button class="w-full flex items-center gap-1.5 px-1.5 py-1 rounded transition-colors text-left {selectedBatchId === yb.batch_id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-bg-card-hover'}" onclick={() => { selectBatch(yb.batch_id); }}>
								<span class="text-[8px] font-medium text-text-secondary w-16 flex-none truncate">{yb.batch_number.replace('SG-', '')}</span>
								<span class="h-1.5 w-1.5 rounded-full flex-none {yb.status === 'Completed' ? 'bg-primary' : yb.status === 'In Progress' ? 'bg-blue-500' : yb.status === 'Pending Review' ? 'bg-amber-500' : yb.status === 'Rejected' ? 'bg-red-500' : 'bg-border-card'}"></span>
								{#if yb.final_product_g !== null}
									<span class="text-[7px] text-text-muted w-16 flex-none">{yb.leaf_input_kg}&rarr;{(yb.final_product_g / 1000).toFixed(1)}kg</span>
									<div class="flex-1 h-1 rounded-full overflow-hidden" style="background: rgba(30, 30, 30, 0.8);">
										<div class="h-full rounded-full" style="width: {Math.min(100, (yb.overall_yield_pct ?? 0) * 10)}%; background: rgba(190, 242, 100, 0.6);"></div>
									</div>
									<span class="text-[8px] font-medium text-text-secondary w-10 text-right flex-none">{yb.overall_yield_pct?.toFixed(1)}%</span>
									<span class="text-[7px] text-text-muted/35 w-8 text-right flex-none">{yb.hplc_purity_pct?.toFixed(0) ?? '—'}%</span>
								{:else}
									<span class="text-[7px] text-text-muted w-16 flex-none">—</span>
									<div class="flex-1 h-1 rounded-full" style="background: rgba(30, 30, 30, 0.5);"></div>
									<span class="text-[7px] text-text-muted/30 w-10 text-right flex-none">—</span>
									<span class="text-[7px] text-text-muted/30 w-8 text-right flex-none">—</span>
								{/if}
								{#if yb.deviation_count > 0}
									<span class="h-1.5 w-1.5 rounded-full bg-red-500 flex-none"></span>
								{/if}
								{#if hasAnomaly}<span class="h-1.5 w-1.5 rounded-full bg-amber-500 flex-none"></span>{/if}
							</button>
						{/each}
					</div>
				</div>
				{#if runYieldAgg?.bestBatch && runYieldAgg?.worstBatch}
					<div class="flex gap-2 mb-2">
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(190, 242, 100, 0.15); color: #bef264;">Best: {runYieldAgg.bestBatch.batch_number.replace('SG-', '')} {runYieldAgg.bestBatch.yield_pct}%</span>
						<span class="text-[7px] px-1.5 py-0.5 rounded" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">Worst: {runYieldAgg.worstBatch.batch_number.replace('SG-', '')} {runYieldAgg.worstBatch.yield_pct}%</span>
					</div>
				{/if}
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					{#if selectedBatchId && selectedYieldRow}
						{@const yRank = [...data.runYieldBreakdown].filter(y => y.overall_yield_pct !== null).sort((a,b) => (b.overall_yield_pct ?? 0) - (a.overall_yield_pct ?? 0)).findIndex(y => y.batch_id === selectedBatchId) + 1}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{yRank}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">vs Avg</p><p class="text-[9px] font-semibold" style="color: {(selectedYieldRow.overall_yield_pct ?? 0) >= (runYieldAgg?.overallYield ?? 0) ? '#bef264' : '#ef4444'};">{((selectedYieldRow.overall_yield_pct ?? 0) - (runYieldAgg?.overallYield ?? 0)).toFixed(2)}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Purity</p><p class="text-[9px] font-semibold text-text-secondary">{selectedYieldRow.hplc_purity_pct?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Alkaloids</p><p class="text-[9px] font-semibold text-text-secondary">{selectedYieldRow.mitragynine_pct?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Deviations</p><p class="text-[9px] font-semibold" style="color: {selectedYieldRow.deviation_count > 0 ? '#ef4444' : 'inherit'};">{selectedYieldRow.deviation_count}</p></div>
					{:else}
						<div><p class="text-[7px] text-text-muted/40 uppercase">Best</p><p class="text-[9px] font-semibold" style="color: #bef264;">{runYieldAgg?.bestBatch?.yield_pct ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Worst</p><p class="text-[9px] font-semibold" style="color: #ef4444;">{runYieldAgg?.worstBatch?.yield_pct ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Deviations</p><p class="text-[9px] font-semibold" style="color: {(runYieldAgg?.totalDeviations ?? 0) > 0 ? '#ef4444' : 'inherit'};">{runYieldAgg?.totalDeviations ?? 0}</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Purity</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p></div>
						<div><p class="text-[7px] text-text-muted/40 uppercase">Anomalies</p><p class="text-[9px] font-semibold" style="color: {data.batchAnomalies.filter(a => a.metric === 'yield').length > 0 ? '#ef4444' : 'inherit'};">{data.batchAnomalies.filter(a => a.metric === 'yield').length}</p></div>
					{/if}
				</div>
			{:else if yieldMode === 'history'}
				<!-- Ton History: yield% across runs -->
				<div class="flex-1 flex flex-col">
					{#if historyYieldChart}
						<svg viewBox="0 0 {CW} {CH + 20}" class="w-full">
							<defs><linearGradient id="histYieldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bef264" stop-opacity="0.22" /><stop offset="100%" stop-color="#bef264" stop-opacity="0.02" /></linearGradient></defs>
							<path d={historyYieldChart.area} fill="url(#histYieldGrad)" /><path d={historyYieldChart.line} fill="none" stroke="#bef264" stroke-width="1.5" opacity="0.7" />
							{#each historyYieldChart.points as pt, pi}
								<circle cx={pt.x} cy={pt.y} r={historyRuns[pi]?.runId === data.activeRunId ? 3 : 1.5} fill="#bef264" opacity={historyRuns[pi]?.runId === data.activeRunId ? 1 : 0.45} />
								<text x={pt.x} y={CH + 18} text-anchor="middle" fill="#666666" font-size="5">{historyRunLabels[pi]}</text>
							{/each}
						</svg>
						<!-- Comparison table -->
						<div class="mt-1 space-y-0.5">
							{#each historyRuns as hr}
								<div class="flex items-center gap-1.5 px-1 py-0.5 rounded text-[7px] {hr.runId === data.activeRunId ? 'bg-primary/5' : ''}">
									<span class="font-medium text-text-secondary w-12 flex-none">{hr.runNumber}</span>
									<span class="text-text-muted/40 w-14 flex-none">{hr.totalProducedKg.toFixed(1)} kg</span>
									<span class="text-text-muted/40 w-12 flex-none">{hr.overallYieldPct.toFixed(2)}%</span>
									<span class="text-text-muted/40 w-10 flex-none">{hr.avgPurity?.toFixed(1) ?? '—'}%</span>
									<span class="text-text-muted/40 flex-1 text-right">{hr.deviationCount} dev</span>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex-1 flex items-center justify-center"><span class="text-[9px] text-text-muted/40">Need 2+ runs for history</span></div>
					{/if}
				</div>
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					<div><p class="text-[7px] text-text-muted/40 uppercase">Produced</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.totalProduced.toFixed(1) ?? '—'} kg</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Yield</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.overallYield.toFixed(2) ?? '—'}%</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Purity</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Deviations</p><p class="text-[9px] font-semibold" style="color: {(runYieldAgg?.totalDeviations ?? 0) > 0 ? '#ef4444' : 'inherit'};">{runYieldAgg?.totalDeviations ?? 0}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.yield}/{currentRunRank.total}</p></div>
				</div>
			{:else}
				<!-- Quality Correlation: scatter plot + alkaloid table -->
				<div class="flex-1 flex flex-col">
					{#if data.qualityCorrelation.length >= 2}
						{@const qc = data.qualityCorrelation}
						{@const minY = Math.min(...qc.map(p => p.yieldPct)) - 0.5}
						{@const maxY = Math.max(...qc.map(p => p.yieldPct)) + 0.5}
						{@const minP = Math.min(...qc.filter(p => p.purityPct !== null).map(p => p.purityPct!)) - 1}
						{@const maxP = Math.max(...qc.filter(p => p.purityPct !== null).map(p => p.purityPct!)) + 1}
						<p class="text-[8px] font-medium uppercase tracking-[0.12em] text-text-muted/60 mb-1">Yield vs Purity</p>
						<svg viewBox="0 0 {CW} {CH + 30}" class="w-full">
							<!-- Axes labels -->
							<text x="5" y={CH + 25} fill="#666666" font-size="5">Yield%</text>
							<text x={CW - 5} y="8" text-anchor="end" fill="#666666" font-size="5">Purity%</text>
							<!-- Grid -->
							<line x1="15" y1="10" x2="15" y2={CH + 15} stroke="#1e1e1e" stroke-width="0.3" />
							<line x1="15" y1={CH + 15} x2={CW - 10} y2={CH + 15} stroke="#1e1e1e" stroke-width="0.3" />
							<!-- Points -->
							{#each qc as pt}
								{#if pt.purityPct !== null}
									{@const px = 20 + ((pt.yieldPct - minY) / (maxY - minY)) * (CW - 35)}
									{@const py = 12 + (1 - (pt.purityPct - minP) / (maxP - minP)) * (CH)}
									{@const isSelected = selectedBatchId === pt.batchId}
									{@const r = isSelected ? 4 : (pt.mitragynine !== null ? Math.max(2, Math.min(4, (pt.mitragynine ?? 60) / 25)) : 2)}
									<circle cx={px} cy={py} {r} fill={pt.supplier === 'Supplier B' ? '#ef4444' : '#bef264'} opacity={isSelected ? 1 : 0.6} stroke={isSelected ? '#fff' : 'none'} stroke-width={isSelected ? 1 : 0} />
									{#if isSelected}
										<line x1={px} y1="10" x2={px} y2={CH + 15} stroke="#fff" stroke-width="0.3" stroke-dasharray="2 2" opacity="0.3" />
										<line x1="15" y1={py} x2={CW - 10} y2={py} stroke="#fff" stroke-width="0.3" stroke-dasharray="2 2" opacity="0.3" />
									{/if}
								{/if}
							{/each}
						</svg>
						<!-- Alkaloid profile table -->
						<div class="mt-1">
							<div class="flex items-center gap-0.5 text-[6px] text-text-muted/30 uppercase mb-0.5">
								<span class="w-16 flex-none">Alkaloid</span>
								{#each qc.slice(0, 5) as pt}
									<span class="flex-1 text-center truncate">{pt.batchNumber.replace('SG-', '').slice(-3)}</span>
								{/each}
								<span class="w-10 text-right">Avg</span>
							</div>
							{#each [{ label: 'Mitrag.', key: 'mitragynine' }, { label: '7-OH-M', key: 'hydroxymitragynine' }, { label: 'Payn.', key: 'paynantheine' }] as alk}
								<div class="flex items-center gap-0.5 text-[7px]">
									<span class="w-16 flex-none text-text-muted/40">{alk.label}</span>
									{#each qc.slice(0, 5) as pt}
										{@const val = (pt as any)[alk.key]}
										<span class="flex-1 text-center text-text-secondary">{val?.toFixed(1) ?? '—'}</span>
									{/each}
									{#if true}
										{@const vals = qc.map(p => (p as any)[alk.key]).filter((v: any): v is number => v !== null)}
										<span class="w-10 text-right font-medium text-text-secondary">{vals.length > 0 ? (vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1) : '—'}</span>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex-1 flex items-center justify-center"><span class="text-[9px] text-text-muted/40">Need 2+ batches with HPLC data</span></div>
					{/if}
				</div>
				<!-- Bottom -->
				<div class="grid grid-cols-5 gap-1 border-t pt-2 mt-auto" style="border-color: rgba(30, 30, 30, 0.8);">
					<div><p class="text-[7px] text-text-muted/40 uppercase">Tested</p><p class="text-[9px] font-semibold text-text-secondary">{data.qualityCorrelation.length}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Avg Purity</p><p class="text-[9px] font-semibold text-text-secondary">{runYieldAgg?.avgPurity?.toFixed(1) ?? '—'}%</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Best Yield</p><p class="text-[9px] font-semibold" style="color: #bef264;">{runYieldAgg?.bestBatch?.yield_pct ?? '—'}%</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Deviations</p><p class="text-[9px] font-semibold">{runYieldAgg?.totalDeviations ?? 0}</p></div>
					<div><p class="text-[7px] text-text-muted/40 uppercase">Rank</p><p class="text-[9px] font-semibold text-text-secondary">#{currentRunRank.yield}/{currentRunRank.total}</p></div>
				</div>
			{/if}
		{/if}

		<!-- Carousel navigation -->
		<div class="flex items-center justify-center gap-1.5 pt-2 mt-auto" style="border-top: 1px solid rgba(30, 30, 30, 0.8);">
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 0 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 0}>Cost</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 1 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 1}>Ethanol</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 2 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 2}>Yield</button>
		</div>
	</div>

</div>
{:else}
<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
{/if}

<!-- Batch Detail Drawer -->
<BatchDrawer batchId={drawerBatchId} runId={data.activeRunId} onclose={() => drawerBatchId = null} />
