<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import { fmt, TARGETS, UNIT_RATES } from '$lib/config/costs';
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

	function costBarColorByRange(cpk: number, allCpks: number[], isCurrent: boolean): string {
		const alpha = isCurrent ? 0.8 : 0.5;
		const valid = allCpks.filter(v => v > 0);
		if (valid.length < 2 || cpk <= 0) return `rgba(190,242,100,${alpha})`;
		const mn = Math.min(...valid);
		const mx = Math.max(...valid);
		if (mx === mn) return `rgba(190,242,100,${alpha})`;
		const t = (cpk - mn) / (mx - mn);
		let r, g, b;
		if (t < 0.5) {
			const u = t * 2;
			r = Math.round(190 + (245 - 190) * u);
			g = Math.round(242 + (158 - 242) * u);
			b = Math.round(100 + (11 - 100) * u);
		} else {
			const u = (t - 0.5) * 2;
			r = Math.round(245 + (239 - 245) * u);
			g = Math.round(158 + (68 - 158) * u);
			b = Math.round(11 + (68 - 11) * u);
		}
		return `rgba(${r},${g},${b},${alpha})`;
	}

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
	let chartTooltip: { x: number; y: number; lines: string[] } | null = $state(null);
	let expandedCard: 0 | 1 | 2 | null = $state(null);

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
	const activeLot = $derived(selectedLot ?? allLots()[allLots().length - 1] ?? null);
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

	// ── Lot-vs-Lot Comparison Derived State ──
	const LOT_COLORS = ['#A3E635','#ec5b13','#ef4444','#f59e0b','#9ca3af','#bef264','#6b7280','#4b5563'];

	const previousLotId = $derived.by(() => {
		const order = allLots();
		const idx = order.indexOf(activeLot ?? '');
		return idx > 0 ? order[idx - 1] : null;
	});

	interface LotAgg {
		avgRecoveryPct: number;
		totalEthIssued: number;
		totalEthRecovered: number;
		totalEthLost: number;
		totalCost: number;
		avgCostPerKg: number;
		totalYieldKg: number;
		avgYieldPct: number;
		avgPurity: number | null;
		avgMitragynine: number | null;
		batchCount: number;
		bestBatchRecovery: string;
		deviationCount: number;
		costBySegment: { leaf: number; solvent: number; chemicals: number; labor: number; electricity: number; testing: number };
	}

	const lotSummaries = $derived.by(() => {
		const map = new Map<string, LotAgg>();
		const lots = allLots();
		if (!lots.length) return map;

		// Initialize
		for (const lot of lots) {
			map.set(lot, {
				avgRecoveryPct: 0, totalEthIssued: 0, totalEthRecovered: 0, totalEthLost: 0,
				totalCost: 0, avgCostPerKg: 0, totalYieldKg: 0, avgYieldPct: 0,
				avgPurity: null, avgMitragynine: null, batchCount: 0, bestBatchRecovery: '—',
				deviationCount: 0,
				costBySegment: { leaf: 0, solvent: 0, chemicals: 0, labor: 0, electricity: 0, testing: 0 }
			});
		}

		// Ethanol
		for (const eb of data.runEthanolBreakdown) {
			if (!eb.supplier_lot) continue;
			const agg = map.get(eb.supplier_lot);
			if (!agg) continue;
			agg.totalEthIssued += eb.ethanol_issued_l ?? 0;
			agg.totalEthRecovered += eb.ethanol_recovered_l ?? 0;
			agg.totalEthLost += eb.ethanol_lost_l ?? 0;
		}

		// Costs
		for (const bc of data.runBatchCosts) {
			if (!bc.supplier_lot) continue;
			const agg = map.get(bc.supplier_lot);
			if (!agg) continue;
			agg.totalCost += bc.totalCost;
			agg.batchCount++;
		}

		// Cost segments
		for (const seg of data.batchCostBreakdown) {
			if (!seg.supplierLot) continue;
			const agg = map.get(seg.supplierLot);
			if (!agg) continue;
			agg.costBySegment.leaf += seg.leaf;
			agg.costBySegment.solvent += seg.solvent;
			agg.costBySegment.chemicals += seg.chemicals;
			agg.costBySegment.labor += seg.labor;
			agg.costBySegment.electricity += seg.electricity;
			agg.costBySegment.testing += seg.testing;
		}

		// Yield
		for (const yb of data.runYieldBreakdown) {
			if (!yb.supplier_lot) continue;
			const agg = map.get(yb.supplier_lot);
			if (!agg) continue;
			agg.totalYieldKg += (yb.final_product_g ?? 0) / 1000;
			agg.deviationCount += yb.deviation_count;
		}

		// Finalize averages
		for (const [lot, agg] of map) {
			if (agg.totalEthIssued > 0) agg.avgRecoveryPct = (agg.totalEthRecovered / agg.totalEthIssued) * 100;

			const yieldBatches = data.runYieldBreakdown.filter(y => y.supplier_lot === lot && y.overall_yield_pct != null);
			if (yieldBatches.length > 0) {
				agg.avgYieldPct = yieldBatches.reduce((s, y) => s + (y.overall_yield_pct ?? 0), 0) / yieldBatches.length;
			}

			const purityBatches = data.runYieldBreakdown.filter(y => y.supplier_lot === lot && y.hplc_purity_pct != null);
			if (purityBatches.length > 0) {
				agg.avgPurity = purityBatches.reduce((s, y) => s + (y.hplc_purity_pct ?? 0), 0) / purityBatches.length;
			}

			const mitBatches = data.runYieldBreakdown.filter(y => y.supplier_lot === lot && y.mitragynine_pct != null);
			if (mitBatches.length > 0) {
				agg.avgMitragynine = mitBatches.reduce((s, y) => s + (y.mitragynine_pct ?? 0), 0) / mitBatches.length;
			}

			const lotInputKg = data.runYieldBreakdown.filter(y => y.supplier_lot === lot).reduce((s, y) => s + y.leaf_input_kg, 0);
			agg.avgCostPerKg = agg.totalYieldKg > 0 ? agg.totalCost / agg.totalYieldKg : 0;

			const ethBatches = data.runEthanolBreakdown.filter(e => e.supplier_lot === lot && e.recovery_pct != null);
			if (ethBatches.length > 0) {
				const best = ethBatches.reduce((a, b) => (a.recovery_pct ?? 0) > (b.recovery_pct ?? 0) ? a : b);
				agg.bestBatchRecovery = best.batch_number.replace('SG-', '');
			}
		}

		return map;
	});

	const allTimeLotAvg = $derived.by(() => {
		const lots = allLots();
		const summaries = lotSummaries;
		if (lots.length === 0) return { recoveryPct: 0, costPerKg: 0, yieldPct: 0 };
		let recSum = 0, costSum = 0, yieldSum = 0, recN = 0, costN = 0, yieldN = 0;
		for (const lot of lots) {
			const agg = summaries.get(lot);
			if (!agg) continue;
			if (agg.avgRecoveryPct > 0) { recSum += agg.avgRecoveryPct; recN++; }
			if (agg.avgCostPerKg > 0) { costSum += agg.avgCostPerKg; costN++; }
			if (agg.avgYieldPct > 0) { yieldSum += agg.avgYieldPct; yieldN++; }
		}
		return {
			recoveryPct: recN > 0 ? recSum / recN : 0,
			costPerKg: costN > 0 ? costSum / costN : 0,
			yieldPct: yieldN > 0 ? yieldSum / yieldN : 0
		};
	});

	function rollingAvg(values: number[], window: number): number[] {
		return values.map((_, i) => {
			const start = Math.max(0, i - window + 1);
			const slice = values.slice(start, i + 1);
			return slice.reduce((a, b) => a + b, 0) / slice.length;
		});
	}

	const batchSequenceEthanol = $derived.by(() => {
		return data.runEthanolBreakdown
			.filter(e => e.recovery_pct != null)
			.map((e, i) => ({
				index: i,
				batchId: e.batch_id,
				batchNumber: e.batch_number,
				lot: e.supplier_lot ?? '',
				recoveryPct: e.recovery_pct ?? 0
			}));
	});

	function getLotStageYields(lotId: string | null): { grinding: number; extraction: number; abPhase: number; drying: number } {
		if (!lotId) return { grinding: 0, extraction: 0, abPhase: 0, drying: 0 };
		const batches = data.activeBatchProgress.filter(b => b.supplier_lot === lotId);
		if (batches.length === 0) return { grinding: 0, extraction: 0, abPhase: 0, drying: 0 };

		// Grinding: only batches with powder data
		const withPowder = batches.filter(b => b.powder_output_kg != null);
		const grindLeaf = withPowder.reduce((s, b) => s + (b.leaf_input_kg ?? 0), 0);
		const grindPowder = withPowder.reduce((s, b) => s + (b.powder_output_kg ?? 0), 0);

		// Extraction: EtOH solvent recovery rate
		const withEtoh = batches.filter(b => b.etoh_vol_L != null && b.etoh_vol_L > 0);
		const extIssued = withEtoh.reduce((s, b) => s + (b.etoh_vol_L ?? 0), 0);
		const extRecovered = withEtoh.reduce((s, b) => s + (b.etoh_recovered_L ?? 0), 0);

		// A/B Phase: d-Limonene solvent recovery rate
		const withDlimo = batches.filter(b => b.dlimo_vol_L != null && b.dlimo_vol_L > 0);
		const abIssued = withDlimo.reduce((s, b) => s + (b.dlimo_vol_L ?? 0), 0);
		const abRecovered = withDlimo.reduce((s, b) => s + (b.dlimo_recovered_L ?? 0), 0);

		// Drying: only batches with final product data
		const withFinal = batches.filter(b => b.final_product_g != null);
		const dryPrecip = withFinal.reduce((s, b) => s + ((b.wet_precipitate_g ?? 0) / 1000), 0);
		const dryFinal = withFinal.reduce((s, b) => s + ((b.final_product_g ?? 0) / 1000), 0);

		return {
			grinding: grindLeaf > 0 ? (grindPowder / grindLeaf) * 100 : 0,
			extraction: extIssued > 0 ? (extRecovered / extIssued) * 100 : 0,
			abPhase: abIssued > 0 ? (abRecovered / abIssued) * 100 : 0,
			drying: dryPrecip > 0 ? (dryFinal / dryPrecip) * 100 : 0
		};
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
			<div class="flex items-center gap-1 flex-none overflow-x-auto min-w-0">
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

		{#if activeLot}
		<div class="flex items-center gap-3 px-2 py-1 mb-1 rounded text-[8px]"
			style="background: rgba(163,230,53,0.04); border: 1px solid rgba(163,230,53,0.08);">
			<span class="text-[7px] text-text-muted uppercase">Leaf</span>
			<span class="font-mono font-bold text-text-primary">{Math.round(lotIntakeKg)} kg</span>
			<span class="text-white/10">|</span>
			<span class="text-[7px] text-text-muted uppercase">Powder</span>
			<span class="font-mono font-bold text-text-primary">{lotPowderKg} kg</span>
			<span class="text-white/10">|</span>
			<span class="text-[7px] text-text-muted uppercase">EtOH</span>
			<span class="font-mono font-bold text-text-primary">{lotEtohIssued.toFixed(0)} L</span>
			<span class="text-white/10">|</span>
			<span class="text-[7px] text-text-muted uppercase">Recovery</span>
			<span class="font-mono font-bold" style="color: {lotEtohRecoveryPct >= 95 ? '#bef264' : '#ef4444'};">{lotEtohRecoveryPct.toFixed(1)}%</span>
			<span class="text-white/10">|</span>
			<span class="text-[7px] text-text-muted uppercase">Yield</span>
			<span class="font-mono font-bold text-text-primary">{lotFinalProductKg.toFixed(3)} kg</span>
		</div>
		{/if}

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
			<div class="pr-1 overflow-y-auto overflow-x-hidden max-h-[40vh]" style="scrollbar-width: thin; scrollbar-color: rgba(55,65,81,0.4) transparent;">
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
	<div class="{expandedCard !== null ? 'fixed inset-4 z-50' : 'col-span-6'} border border-white/10 rounded-xl px-4 pt-3 pb-2.5 flex flex-col {expandedCard === null ? 'min-h-[650px]' : ''}" style="background: #161616;">
		<div class="flex-shrink-0">
		{#if carouselIndex === 0}
			<!-- ═══ COST INTELLIGENCE ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #ec5b13;">payments</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Cost Intelligence</h3>
					<button class="text-text-muted/25 hover:text-text-muted/60 transition-colors" onclick={() => expandedCard = expandedCard === carouselIndex ? null : carouselIndex}>
						<span class="material-symbols-outlined text-[11px]">{expandedCard === carouselIndex ? 'close_fullscreen' : 'open_in_full'}</span>
					</button>
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
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'batch' ? 'background: rgba(236, 91, 19, 0.15);' : ''} onclick={() => costMode = 'batch'}>Lot History</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {costMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={costMode === 'history' ? 'background: rgba(236, 91, 19, 0.15);' : ''} onclick={() => costMode = 'history'}>Cost Drivers</button>
			</div>
		{:else if carouselIndex === 1}
			<!-- ═══ SOLVENT INTELLIGENCE ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #bef264;">water_drop</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Solvent Intelligence</h3>
					<button class="text-text-muted/25 hover:text-text-muted/60 transition-colors" onclick={() => expandedCard = expandedCard === carouselIndex ? null : carouselIndex}>
						<span class="material-symbols-outlined text-[11px]">{expandedCard === carouselIndex ? 'close_fullscreen' : 'open_in_full'}</span>
					</button>
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
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'batch' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => ethanolMode = 'batch'}>Lot History</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {ethanolMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={ethanolMode === 'history' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => ethanolMode = 'history'}>Batch Breakdown</button>
			</div>
		{:else}
			<!-- ═══ YIELD & QUALITY ═══ -->
			<div class="flex items-center justify-between mb-1.5">
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-[14px] opacity-50" style="color: #bef264;">science</span>
					<h3 class="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">Yield & Quality</h3>
					<button class="text-text-muted/25 hover:text-text-muted/60 transition-colors" onclick={() => expandedCard = expandedCard === carouselIndex ? null : carouselIndex}>
						<span class="material-symbols-outlined text-[11px]">{expandedCard === carouselIndex ? 'close_fullscreen' : 'open_in_full'}</span>
					</button>
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
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'batch' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'batch' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'batch'}>Lot History</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'history' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'history' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'history'}>Batch Contrib.</button>
				<button class="flex-1 px-1.5 py-px text-[6.5px] font-medium uppercase tracking-wider transition-colors {yieldMode === 'quality' ? 'text-text-primary' : 'text-text-muted/35 hover:text-text-muted/60'}" style={yieldMode === 'quality' ? 'background: rgba(190, 242, 100, 0.15);' : ''} onclick={() => yieldMode = 'quality'}>Quality</button>
			</div>
		{/if}
		</div>
		<div class="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style="scrollbar-width: thin; scrollbar-color: rgba(55,65,81,0.4) transparent;">
		{#if carouselIndex === 0}
			{#if costMode === 'lot'}
				{#if true}
				{@const curLotAgg = activeLot ? lotSummaries.get(activeLot) : null}
				{@const prevLot = previousLotId}
				{@const prevLotAgg = prevLot ? lotSummaries.get(prevLot) : null}
				{@const cpkDelta = prevLotAgg && prevLotAgg.avgCostPerKg > 0 ? (curLotAgg?.avgCostPerKg ?? 0) - prevLotAgg.avgCostPerKg : null}
				{@const costDelta = prevLotAgg ? (curLotAgg?.totalCost ?? 0) - prevLotAgg.totalCost : null}
				{@const lots = allLots()}
				{@const bestLot = lots.reduce((best, l) => { const a = lotSummaries.get(l); return a && a.avgCostPerKg > 0 && (best === null || a.avgCostPerKg < (lotSummaries.get(best)?.avgCostPerKg ?? Infinity)) ? l : best; }, null as string | null)}
				{@const matCost = curLotAgg ? curLotAgg.costBySegment.leaf + curLotAgg.costBySegment.solvent + curLotAgg.costBySegment.chemicals : 0}

				<!-- S1: KPI Strip -->
				<div class="flex gap-1.5 mb-2 overflow-x-auto">
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Cost/KG</span>
						<span class="text-sm font-black font-mono text-white">{curLotAgg?.avgCostPerKg ? fmt(curLotAgg.avgCostPerKg) : '—'}</span>
						{#if cpkDelta !== null}
							<span class="text-[7px] font-bold" style="color: {cpkDelta <= 0 ? '#bef264' : '#ef4444'};">{cpkDelta <= 0 ? '▼' : '▲'} {fmt(Math.abs(cpkDelta))} vs prev</span>
						{:else}
							<span class="text-[7px] font-bold text-slate-600">—</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Total Lot Cost</span>
						<span class="text-sm font-black font-mono text-white">{curLotAgg ? fmt(curLotAgg.totalCost) : '—'}</span>
						{#if costDelta !== null}
							<span class="text-[7px] font-bold" style="color: {costDelta <= 0 ? '#bef264' : '#ef4444'};">{costDelta <= 0 ? '▼' : '▲'} {fmt(Math.abs(costDelta))}</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Material Cost</span>
						<span class="text-sm font-black font-mono text-white">{fmt(matCost)}</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Avg/Batch</span>
						<span class="text-sm font-black font-mono text-white">{curLotAgg && curLotAgg.batchCount > 0 ? fmt(curLotAgg.totalCost / curLotAgg.batchCount) : '—'}</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Best Lot</span>
						<span class="text-sm font-black font-mono text-white">{bestLot ? bestLot.replace('LOT-', 'L') : '—'}</span>
					</div>
				</div>

				<!-- S2: Batch Cost Bar Chart — HERO -->
				{@const lotBatchCosts = data.runBatchCosts.filter(c => c.supplier_lot === activeLot && c.totalCost > 0)}
				{@const batchCostVals = lotBatchCosts.map(c => c.totalCost)}
				{@const batchCostMax = Math.max(...batchCostVals) * 1.05}
				{@const batchCostMin = Math.max(0, Math.min(...batchCostVals) * 0.9)}
				{@const batchCostAvg = lotBatchCosts.length > 0 ? lotBatchCosts.reduce((s, c) => s + c.totalCost, 0) / lotBatchCosts.length : 0}
				{@const avgLinePct = batchCostAvg > 0 && batchCostMax > batchCostMin ? ((batchCostAvg - batchCostMin) / (batchCostMax - batchCostMin)) * 100 : 0}
				{#if lotBatchCosts.length > 0}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Batch Cost — {activeLot?.replace('LOT-', 'L')}</h4>
					<div class="relative flex items-end gap-1 px-1 h-[110px]">
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {avgLinePct}%; border-color: rgba(255,255,255,0.25);"></div>
						<span class="absolute text-[6px] font-mono text-slate-400 right-1" style="bottom: {avgLinePct + 1}%;">avg {fmt(batchCostAvg)}</span>
						{#each lotBatchCosts as bc}
							{@const hPct = batchCostMax > batchCostMin ? ((bc.totalCost - batchCostMin) / (batchCostMax - batchCostMin)) * 100 : 50}
							{@const isOver = bc.totalCost > batchCostAvg}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectBatch(bc.batch_id)}
								onmouseenter={(e) => chartTooltip = { x: e.clientX, y: e.clientY, lines: [bc.batch_number, `Total: ${fmt(bc.totalCost)}`, bc.costPerKg ? `$/kg: ${fmt(bc.costPerKg)}` : ''] }} onmouseleave={() => chartTooltip = null}>
								<span class="text-[6px] font-mono font-bold mb-0.5 text-white">{fmt(bc.totalCost)}</span>
								<div class="w-full rounded-t transition-all {selectedBatchId === bc.batch_id ? 'ring-2 ring-[#ec5b13]' : ''}" style="height: {hPct}%; background: {isOver ? 'rgba(239,68,68,0.6)' : 'rgba(190,242,100,0.6)'}; min-height: 4px;"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{bc.batch_number.replace('SG-', '')}</span>
							</button>
						{/each}
					</div>
				</div>
				{/if}

				<!-- S3: Cost Variance Heatmap -->
				{@const lotCostSegs = data.batchCostBreakdown.filter(s => s.supplierLot === activeLot)}
				{#if lotCostSegs.length > 0}
				{@const segCats = ['leaf', 'solvent', 'chemicals'] as const}
				{@const segLabels = ['Leaf', 'Solvent', 'Chem']}
				{@const segAvgs = segCats.map(cat => { const vals = lotCostSegs.map(s => s[cat]); return vals.reduce((a, b) => a + b, 0) / vals.length; })}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cost Variance Heatmap</h4>
					<div class="border border-white/10 rounded overflow-auto" style="max-height: 100px;">
						<table class="w-full text-left border-collapse">
							<thead class="sticky top-0" style="background: #0d0d0d;">
								<tr class="text-[6px] font-bold text-slate-500 uppercase tracking-widest">
									<th class="px-1.5 py-0.5" style="border-bottom: 1px solid #1e1e1e;">Batch</th>
									{#each segLabels as label}
										<th class="px-1 py-0.5 text-center" style="border-bottom: 1px solid #1e1e1e;">{label}</th>
									{/each}
								</tr>
							</thead>
							<tbody class="text-[7px] font-mono">
								{#each lotCostSegs as seg}
									<tr class="cursor-pointer hover:bg-white/5 transition-colors" style="border-bottom: 1px solid rgba(30,30,30,0.5);" onclick={() => selectBatch(seg.batchId)}>
										<td class="px-1.5 py-0.5 text-slate-400">{seg.batchNumber.replace('SG-', '')}</td>
										{#each segCats as cat, ci}
											{@const val = seg[cat]}
											{@const avg = segAvgs[ci]}
											{@const devPct = avg > 0 ? ((val - avg) / avg) * 100 : 0}
											{@const bgColor = devPct <= -10 ? 'rgba(190,242,100,0.3)' : devPct <= -3 ? 'rgba(190,242,100,0.15)' : devPct >= 10 ? 'rgba(239,68,68,0.3)' : devPct >= 3 ? 'rgba(239,68,68,0.15)' : 'transparent'}
											{@const txtColor = devPct <= -3 ? '#bef264' : devPct >= 3 ? '#ef4444' : '#cbd5e1'}
											<td class="px-1 py-0.5 text-center" style="background: {bgColor}; color: {txtColor};">{fmt(val)}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				<p class="text-[6px] text-slate-600 mt-0.5 italic">Labor, electricity & testing costs are fixed per batch</p>
				</div>
				{/if}

				<!-- S4: Cost Breakdown — Current vs Previous -->
				{@const segColors = { leaf: '#bef264', solvent: '#ec5b13', chemicals: '#ef4444', labor: '#9ca3af', electricity: '#f59e0b', testing: '#4b5563' }}
				{@const segKeys = ['leaf', 'solvent', 'chemicals', 'labor', 'electricity', 'testing'] as const}
				{@const curSegs = curLotAgg?.costBySegment ?? { leaf: 0, solvent: 0, chemicals: 0, labor: 0, electricity: 0, testing: 0 }}
				{@const curTotal = Object.values(curSegs).reduce((a, b) => a + b, 0) || 1}
				{@const prevSegs = prevLotAgg?.costBySegment ?? null}
				{@const prevTotal = prevSegs ? Object.values(prevSegs).reduce((a, b) => a + b, 0) || 1 : 1}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cost Breakdown — Current vs Previous</h4>
					<div class="space-y-1">
						<div>
							<span class="text-[6px] font-bold text-slate-500 uppercase">CURRENT ({activeLot?.replace('LOT-', 'L')})</span>
							<div class="flex h-4 w-full rounded-sm overflow-hidden mt-0.5">
								{#each segKeys as key}
									{@const pct = (curSegs[key] / curTotal) * 100}
									{#if pct > 0}
										<div class="h-full flex items-center justify-center overflow-hidden" style="width: {pct}%; background: {segColors[key]}; border-right: 1px solid #161616;" title="{key}: {pct.toFixed(0)}%">
										{#if pct >= 12}
											<span class="text-[5px] font-mono font-bold text-black/70 truncate px-0.5">{fmt(curSegs[key])}</span>
										{/if}
									</div>
									{/if}
								{/each}
							</div>
						</div>
						<div>
							<span class="text-[6px] font-bold text-slate-500 uppercase">PREVIOUS ({prevLot ? prevLot.replace('LOT-', 'L') : '—'})</span>
							{#if prevSegs}
								<div class="flex h-4 w-full rounded-sm overflow-hidden mt-0.5">
									{#each segKeys as key}
										{@const pct = (prevSegs[key] / prevTotal) * 100}
										{#if pct > 0}
											<div class="h-full opacity-50 flex items-center justify-center overflow-hidden" style="width: {pct}%; background: {segColors[key]}; border-right: 1px solid #161616;">
												{#if pct >= 12}
													<span class="text-[5px] font-mono font-bold text-black/70 truncate px-0.5">{fmt(prevSegs[key])}</span>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
							{:else}
								<div class="h-4 w-full rounded-sm mt-0.5 flex items-center justify-center" style="background: rgba(255,255,255,0.03);">
									<span class="text-[6px] text-slate-600 italic">No previous lot data</span>
								</div>
							{/if}
						</div>
						<!-- Legend -->
						<div class="flex flex-wrap gap-2 mt-0.5">
							{#each segKeys as key}
								<div class="flex items-center gap-0.5"><span class="size-1.5 rounded-full" style="background: {segColors[key]};"></span><span class="text-[6px] font-bold text-slate-500 uppercase">{key}</span></div>
							{/each}
						</div>
					</div>
				</div>

				<!-- S5: Cost Pareto Drivers -->
				{@const segEntries = curLotAgg ? Object.entries(curLotAgg.costBySegment).sort((a, b) => b[1] - a[1]).slice(0, 4) : []}
				{@const driverTotal = curLotAgg?.totalCost || 1}
				<div class="mb-1">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Top Cost Drivers</h4>
					<div class="space-y-0.5">
						{#each segEntries as [cat, amount]}
							{@const pct = (amount / driverTotal) * 100}
							{@const prevAmt = prevLotAgg ? prevLotAgg.costBySegment[cat as keyof typeof prevLotAgg.costBySegment] : null}
							{@const driverDelta = prevAmt !== null ? amount - prevAmt : null}
							<div class="flex items-center gap-1.5 text-[7px]">
								<span class="w-14 font-bold text-slate-500 uppercase truncate">{cat}</span>
								<span class="font-mono font-bold text-white">{fmt(amount)}</span>
								<span class="text-slate-500">{pct.toFixed(0)}%</span>
								{#if driverDelta !== null}
									<span style="color: {driverDelta <= 0 ? '#bef264' : '#ef4444'};">{driverDelta <= 0 ? '▼' : '▲'}{fmt(Math.abs(driverDelta))}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
				{/if}
			{:else if costMode === 'batch'}
				<!-- Lot History: Cost/KG Per Lot + Cost Breakdown -->
				{#if true}
				{@const curLotAgg = activeLot ? lotSummaries.get(activeLot) : null}
				{@const prevLot = previousLotId}
				{@const prevLotAgg = prevLot ? lotSummaries.get(prevLot) : null}
				{@const lots = allLots()}

				<!-- Cost/KG per Lot Bar Chart -->
				{@const lotCpks = lots.map(l => lotSummaries.get(l)?.avgCostPerKg ?? 0)}
				{@const cpkMax = Math.max(...lotCpks, TARGETS.costPerKg) * 1.05}
				{@const cpkMin = Math.max(0, Math.min(...lotCpks.filter(v => v > 0)) * 0.9)}
				{@const tgtBot = ((TARGETS.costPerKg - cpkMin) / (cpkMax - cpkMin)) * 100}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cost/KG per Lot</h4>
					<div class="relative flex items-end gap-1 px-1" style="height: 110px;">
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {tgtBot}%; border-color: rgba(239,68,68,0.4);"></div>
						<span class="absolute text-[6px] font-mono text-red-400/60 right-1" style="bottom: {tgtBot + 1}%;">{fmt(TARGETS.costPerKg)}</span>
						{#each lots as lot, li}
							{@const cpk = lotSummaries.get(lot)?.avgCostPerKg ?? 0}
							{@const hPct = cpk > 0 ? ((cpk - cpkMin) / (cpkMax - cpkMin)) * 100 : 0}
							{@const isCurrent = lot === activeLot}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectedLot = lot}>
								<span class="text-[6px] font-mono font-bold mb-0.5 text-white">{cpk > 0 ? fmt(cpk) : '—'}</span>
								<div class="w-full rounded-t transition-all {isCurrent ? 'ring-2 ring-[#ec5b13]' : ''}" style="height: {hPct}%; background: {costBarColorByRange(cpk, lotCpks, isCurrent)}; min-height: 4px;"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{lot.replace('LOT-', 'L')}</span>
							</button>
						{/each}
					</div>
				</div>

				<!-- Cost Breakdown — Current vs Previous -->
				{@const segColors = { leaf: '#bef264', solvent: '#ec5b13', chemicals: '#ef4444', labor: '#9ca3af', electricity: '#f59e0b', testing: '#4b5563' }}
				{@const segKeys = ['leaf', 'solvent', 'chemicals', 'labor', 'electricity', 'testing'] as const}
				{@const curSegs = curLotAgg?.costBySegment ?? { leaf: 0, solvent: 0, chemicals: 0, labor: 0, electricity: 0, testing: 0 }}
				{@const curTotal = Object.values(curSegs).reduce((a, b) => a + b, 0) || 1}
				{@const prevSegs = prevLotAgg?.costBySegment ?? null}
				{@const prevTotal = prevSegs ? Object.values(prevSegs).reduce((a, b) => a + b, 0) || 1 : 1}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cost Breakdown — Current vs Previous</h4>
					<div class="space-y-1">
						<div>
							<span class="text-[6px] font-bold text-slate-500 uppercase">CURRENT ({activeLot?.replace('LOT-', 'L')})</span>
							<div class="flex h-4 w-full rounded-sm overflow-hidden mt-0.5">
								{#each segKeys as key}
									{@const pct = (curSegs[key] / curTotal) * 100}
									{#if pct > 0}
										<div class="h-full flex items-center justify-center overflow-hidden" style="width: {pct}%; background: {segColors[key]}; border-right: 1px solid #161616;" title="{key}: {pct.toFixed(0)}%">
										{#if pct >= 12}
											<span class="text-[5px] font-mono font-bold text-black/70 truncate px-0.5">{fmt(curSegs[key])}</span>
										{/if}
									</div>
									{/if}
								{/each}
							</div>
						</div>
						<div>
							<span class="text-[6px] font-bold text-slate-500 uppercase">PREVIOUS ({prevLot ? prevLot.replace('LOT-', 'L') : '—'})</span>
							{#if prevSegs}
								<div class="flex h-4 w-full rounded-sm overflow-hidden mt-0.5">
									{#each segKeys as key}
										{@const pct = (prevSegs[key] / prevTotal) * 100}
										{#if pct > 0}
											<div class="h-full opacity-50 flex items-center justify-center overflow-hidden" style="width: {pct}%; background: {segColors[key]}; border-right: 1px solid #161616;">
												{#if pct >= 12}
													<span class="text-[5px] font-mono font-bold text-black/70 truncate px-0.5">{fmt(prevSegs[key])}</span>
												{/if}
											</div>
										{/if}
									{/each}
								</div>
							{:else}
								<div class="h-4 w-full rounded-sm mt-0.5 flex items-center justify-center" style="background: rgba(255,255,255,0.03);">
									<span class="text-[6px] text-slate-600 italic">No previous lot data</span>
								</div>
							{/if}
						</div>
						<div class="flex flex-wrap gap-2 mt-0.5">
							{#each segKeys as key}
								<div class="flex items-center gap-0.5"><span class="size-1.5 rounded-full" style="background: {segColors[key]};"></span><span class="text-[6px] font-bold text-slate-500 uppercase">{key}</span></div>
							{/each}
						</div>
					</div>
				</div>
				{/if}
			{:else}
				<!-- Cost Drivers — coming soon -->
				<div class="flex-1 flex flex-col items-center justify-center">
					<span class="material-symbols-outlined text-[24px] text-slate-600 mb-2">construction</span>
					<p class="text-[8px] text-slate-500 italic">Cost drivers analysis coming soon</p>
				</div>
			{/if}
		{:else if carouselIndex === 1}
			{#if ethanolMode === 'lot'}
				{#if true}
				{@const curLotAgg = activeLot ? lotSummaries.get(activeLot) : null}
				{@const prevLot = previousLotId}
				{@const prevLotAgg = prevLot ? lotSummaries.get(prevLot) : null}
				{@const recDelta = prevLotAgg && curLotAgg ? curLotAgg.avgRecoveryPct - prevLotAgg.avgRecoveryPct : null}
				{@const lostDelta = prevLotAgg && curLotAgg ? curLotAgg.totalEthLost - prevLotAgg.totalEthLost : null}
				{@const costImpact = curLotAgg ? curLotAgg.totalEthLost * UNIT_RATES.ethanol70.rate : 0}

				<!-- S1: KPI Strip -->
				<div class="flex gap-1.5 mb-2 overflow-x-auto">
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Recovery %</span>
						<span class="text-sm font-black font-mono" style="color: {(curLotAgg?.avgRecoveryPct ?? 0) >= 85 ? '#bef264' : '#ef4444'};">{(curLotAgg?.avgRecoveryPct ?? 0).toFixed(1)}%</span>
						{#if recDelta !== null}
							<span class="text-[7px] font-bold" style="color: {recDelta >= 0 ? '#bef264' : '#ef4444'};">{recDelta >= 0 ? '▲' : '▼'} {Math.abs(recDelta).toFixed(1)}% vs prev</span>
						{:else}
							<span class="text-[7px] font-bold text-slate-600">—</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Liters Issued</span>
						<span class="text-sm font-black font-mono text-white">{(curLotAgg?.totalEthIssued ?? 0).toFixed(0)}L</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Liters Lost</span>
						<span class="text-sm font-black font-mono" style="color: #ef4444;">{(curLotAgg?.totalEthLost ?? 0).toFixed(0)}L</span>
						{#if lostDelta !== null}
							<span class="text-[7px] font-bold" style="color: {lostDelta <= 0 ? '#bef264' : '#ef4444'};">{lostDelta <= 0 ? '▼' : '▲'} {Math.abs(lostDelta).toFixed(0)}L</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Cost Impact</span>
						<span class="text-sm font-black font-mono text-white">{fmt(costImpact)}</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Best Batch</span>
						<span class="text-sm font-black font-mono text-white">{curLotAgg?.bestBatchRecovery ?? '—'}</span>
					</div>
				</div>

				<!-- S2: Batch Recovery Bar Chart — HERO -->
				{@const lotEthData = data.runEthanolBreakdown.filter(e => e.supplier_lot === activeLot && e.recovery_pct != null)}
				{@const lotRecAvg = lotEthData.length > 0 ? lotEthData.reduce((s, e) => s + (e.recovery_pct ?? 0), 0) / lotEthData.length : 0}
				{@const recBarMin = 82}
				{@const recBarMax = 95}
				{@const recBarRange = recBarMax - recBarMin}
				{@const avgRecLinePct = lotRecAvg > 0 ? ((lotRecAvg - recBarMin) / recBarRange) * 100 : 0}
				{@const tgt95Pct = ((95 - recBarMin) / recBarRange) * 100}
				{#if lotEthData.length > 0}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Batch Recovery — {activeLot?.replace('LOT-', 'L')}</h4>
					<div class="relative flex items-end gap-1 px-1 h-[110px]">
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {avgRecLinePct}%; border-color: rgba(255,255,255,0.25);"></div>
						<span class="absolute text-[6px] font-mono text-slate-400 right-1" style="bottom: {avgRecLinePct + 1}%;">avg {lotRecAvg.toFixed(1)}%</span>
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {tgt95Pct}%; border-color: rgba(102,102,102,0.3);"></div>
						<span class="absolute text-[6px] font-mono text-slate-600 left-1" style="bottom: {tgt95Pct + 1}%;">95%</span>
						{#each lotEthData as eb}
							{@const recPct = eb.recovery_pct ?? 0}
							{@const hPct = Math.min(100, Math.max(3, ((recPct - recBarMin) / recBarRange) * 100))}
							{@const barColor = recPct >= 86 ? '#bef264' : recPct >= 83 ? '#f59e0b' : '#ef4444'}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectBatch(eb.batch_id)}
								onmouseenter={(e) => chartTooltip = { x: e.clientX, y: e.clientY, lines: [eb.batch_number, `Recovery: ${recPct.toFixed(1)}%`, `Issued: ${eb.ethanol_issued_l?.toFixed(0) ?? '—'}L`] }} onmouseleave={() => chartTooltip = null}>
								<span class="text-[6px] font-mono font-bold mb-0.5" style="color: {barColor};">{recPct.toFixed(1)}%</span>
								<div class="w-full rounded-t transition-all {selectedBatchId === eb.batch_id ? 'ring-2 ring-[#ec5b13]' : ''}" style="height: {hPct}%; background: {barColor}; opacity: 0.7; min-height: 4px;"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{eb.batch_number.replace('SG-', '')}</span>
							</button>
						{/each}
					</div>
				</div>
				{/if}

				<!-- S4: Recovery Distribution Strip -->
				{#if batchSequenceEthanol.length > 0}
				{@const seq = batchSequenceEthanol}
				{@const lots = allLots()}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Recovery Distribution</h4>
					<svg viewBox="0 0 500 25" class="w-full" style="background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">
						<!-- Range 82-88% -->
						<text x="5" y="22" fill="#666666" font-size="6">82%</text>
						<text x="475" y="22" fill="#666666" font-size="6">88%</text>
						{#each seq as s}
							{@const xPos = 25 + ((s.recoveryPct - 82) / 6) * 450}
							{@const lotIdx = lots.indexOf(s.lot)}
							<circle cx={Math.min(480, Math.max(25, xPos))} cy="10" r={s.lot === activeLot ? 3 : 2} fill={LOT_COLORS[lotIdx % LOT_COLORS.length]} opacity={s.lot === activeLot ? 1 : 0.35} />
						{/each}
					</svg>
				</div>
				{/if}

				<!-- S5: Batch Table — current lot only -->
				{@const lotEthBatches = data.runEthanolBreakdown.filter(e => e.supplier_lot === activeLot)}
				{@const lotAvgRec = curLotAgg?.avgRecoveryPct ?? 0}
				<div class="border border-white/10 rounded overflow-hidden" style="max-height: 70px;">
					<table class="w-full text-left border-collapse">
						<thead class="sticky top-0" style="background: #0d0d0d;">
							<tr class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">
								<th class="px-2 py-0.5" style="border-bottom: 1px solid #1e1e1e;">Batch</th>
								<th class="px-2 py-0.5 text-right" style="border-bottom: 1px solid #1e1e1e;">Issued</th>
								<th class="px-2 py-0.5 text-right" style="border-bottom: 1px solid #1e1e1e;">Recov.</th>
								<th class="px-2 py-0.5 text-right" style="border-bottom: 1px solid #1e1e1e;">Lost</th>
								<th class="px-2 py-0.5 text-right" style="border-bottom: 1px solid #1e1e1e;">Rec%</th>
								<th class="px-2 py-0.5 text-right" style="border-bottom: 1px solid #1e1e1e;">vs Avg</th>
							</tr>
						</thead>
						<tbody class="text-[7px] font-mono overflow-y-auto">
							{#each lotEthBatches as eb}
								{@const recPct = eb.recovery_pct ?? 0}
								{@const vsAvg = recPct - lotAvgRec}
								<tr class="hover:bg-white/5" style="border-bottom: 1px solid rgba(30,30,30,0.5);">
									<td class="px-2 py-0.5 text-slate-400">{eb.batch_number.replace('SG-', '')}</td>
									<td class="px-2 py-0.5 text-right text-white">{eb.ethanol_issued_l?.toFixed(0) ?? '—'}</td>
									<td class="px-2 py-0.5 text-right text-white">{eb.ethanol_recovered_l?.toFixed(0) ?? '—'}</td>
									<td class="px-2 py-0.5 text-right" style="color: #ef4444;">{eb.ethanol_lost_l?.toFixed(0) ?? '—'}</td>
									<td class="px-2 py-0.5 text-right font-bold" style="color: {recPct >= 86 ? '#bef264' : recPct >= 83 ? '#f59e0b' : '#ef4444'};">{recPct.toFixed(1)}%</td>
									<td class="px-2 py-0.5 text-right" style="color: {vsAvg >= 0 ? '#bef264' : '#ef4444'};">{vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(1)}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{/if}
			{:else if ethanolMode === 'batch'}
				<!-- Lot History: Recovery Trend + Lot Avg Recovery -->
				{#if true}
				{@const lots = allLots()}

				<!-- Recovery Trend — All Batches -->
				{#if batchSequenceEthanol.length >= 2}
				{@const seq = batchSequenceEthanol}
				{@const recoveryValues = seq.map(s => s.recoveryPct)}
				{@const rolling5 = rollingAvg(recoveryValues, 5)}
				{@const minR = Math.min(...recoveryValues) - 2}
				{@const maxR = Math.max(...recoveryValues) + 2}
				{@const rangeR = maxR - minR || 1}
				{@const targetY95 = 10 + (1 - (95 - minR) / rangeR) * 115}
				{@const ySteps = [minR, minR + rangeR * 0.25, minR + rangeR * 0.5, minR + rangeR * 0.75, maxR]}
				{@const rollPts = rolling5.map((v, i) => `${(40 + (i / (seq.length - 1)) * 540).toFixed(1)},${(10 + (1 - (v - minR) / rangeR) * 115).toFixed(1)}`).join(' ')}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Recovery Trend — All Batches</h4>
					<svg viewBox="0 0 600 140" class="w-full" style="background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px;">
						{#each lots as lot, li}
							{@const lotBatchesInSeq = seq.filter(s => s.lot === lot)}
							{#if lotBatchesInSeq.length > 0}
								{@const firstIdx = seq.indexOf(lotBatchesInSeq[0])}
								{@const lastIdx = seq.indexOf(lotBatchesInSeq[lotBatchesInSeq.length - 1])}
								{@const x1 = 40 + (firstIdx / (seq.length - 1)) * 540}
								{@const x2 = 40 + (lastIdx / (seq.length - 1)) * 540}
								<rect x={x1 - 2} y="10" width={Math.max(4, x2 - x1 + 4)} height="115" fill={lot === activeLot ? 'rgba(236,91,19,0.06)' : li % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'} />
							{/if}
						{/each}
						{#each lots as lot, li}
							{#if li > 0}
								{@const lotBatchesInSeq = seq.filter(s => s.lot === lot)}
								{#if lotBatchesInSeq.length > 0}
									{@const firstIdx = seq.indexOf(lotBatchesInSeq[0])}
									{@const bx = 40 + (firstIdx / (seq.length - 1)) * 540}
									<line x1={bx} y1="10" x2={bx} y2="125" stroke="rgba(255,255,255,0.1)" stroke-dasharray="3 3" stroke-width="0.5" />
									<text x={bx + 2} y="18" fill="rgba(255,255,255,0.25)" font-size="6" font-weight="bold">{lot.replace('LOT-', 'L')}</text>
								{/if}
							{/if}
						{/each}
						<line x1="40" y1={targetY95} x2="580" y2={targetY95} stroke="#666666" stroke-dasharray="4 4" stroke-width="0.5" opacity="0.5" />
						<text x="582" y={targetY95 + 3} fill="#666666" font-size="6" opacity="0.5">95%</text>
						{#each ySteps as yv}
							{@const yy = 10 + (1 - (yv - minR) / rangeR) * 115}
							<text x="36" y={yy + 2} text-anchor="end" fill="#666666" font-size="5">{yv.toFixed(0)}%</text>
						{/each}
						<polyline points={rollPts} fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5" stroke-linejoin="round" />
						{#each seq as s, si}
							{@const cx = 40 + (si / (seq.length - 1)) * 540}
							{@const cy = 10 + (1 - (s.recoveryPct - minR) / rangeR) * 115}
							{@const lotIdx = lots.indexOf(s.lot)}
							<circle {cx} {cy} r={s.lot === activeLot ? 3 : 2} fill={LOT_COLORS[lotIdx % LOT_COLORS.length]} opacity={s.lot === activeLot ? 1 : 0.4} style="cursor: pointer;" onmouseenter={(e) => chartTooltip = { x: e.clientX, y: e.clientY, lines: [s.batchNumber, `Recovery: ${s.recoveryPct.toFixed(1)}%`, `Lot: ${s.lot}`] }} onmouseleave={() => chartTooltip = null} />
						{/each}
					</svg>
				</div>
				{/if}

				<!-- Lot Avg Recovery Bar Chart -->
				{@const lotRecoveries = lots.map(l => lotSummaries.get(l)?.avgRecoveryPct ?? 0)}
				{@const barMin = 84.0}
				{@const barMax = 86.0}
				{@const barRange = barMax - barMin || 1}
				{@const avgLineBot = ((allTimeLotAvg.recoveryPct - barMin) / barRange) * 100}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Lot Avg Recovery</h4>
					<div class="relative flex items-end gap-1 px-1" style="height: 60px;">
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {avgLineBot}%; border-color: rgba(255,255,255,0.2);"></div>
						{#each lots as lot, li}
							{@const rec = lotSummaries.get(lot)?.avgRecoveryPct ?? 0}
							{@const hPct = Math.min(100, Math.max(5, ((rec - barMin) / barRange) * 100))}
							{@const isAboveAvg = rec >= allTimeLotAvg.recoveryPct}
							{@const isCurrent = lot === activeLot}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectedLot = lot}>
								<span class="text-[6px] font-mono font-bold mb-0.5" style="color: {isAboveAvg ? '#bef264' : '#ef4444'};">{rec.toFixed(1)}%</span>
								<div class="w-full rounded-t transition-all {isCurrent ? 'ring-2 ring-[#ec5b13]' : ''}" style="height: {hPct}%; background: {isAboveAvg ? 'rgba(190,242,100,0.6)' : 'rgba(239,68,68,0.5)'}; min-height: 4px;"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{lot.replace('LOT-', 'L')}</span>
							</button>
						{/each}
					</div>
				</div>
				{/if}
			{:else}
				<!-- Batch Breakdown — coming soon -->
				<div class="flex-1 flex flex-col items-center justify-center">
					<span class="material-symbols-outlined text-[24px] text-slate-600 mb-2">construction</span>
					<p class="text-[8px] text-slate-500 italic">Batch breakdown analysis coming soon</p>
				</div>
			{/if}
		{:else}
			{#if yieldMode === 'lot'}
				{#if true}
				{@const curLotAgg = activeLot ? lotSummaries.get(activeLot) : null}
				{@const prevLot = previousLotId}
				{@const prevLotAgg = prevLot ? lotSummaries.get(prevLot) : null}
				{@const yieldDeltaKg = prevLotAgg ? (curLotAgg?.totalYieldKg ?? 0) - prevLotAgg.totalYieldKg : null}
				{@const rateDelta = prevLotAgg ? (curLotAgg?.avgYieldPct ?? 0) - prevLotAgg.avgYieldPct : null}
				{@const lots = allLots()}
				{@const yieldRank = (() => { const sorted = lots.map(l => lotSummaries.get(l)?.totalYieldKg ?? 0).sort((a, b) => b - a); return sorted.indexOf(curLotAgg?.totalYieldKg ?? 0) + 1; })()}
				{@const bestYieldBatch = data.runYieldBreakdown.filter(y => y.supplier_lot === activeLot && y.overall_yield_pct != null).sort((a, b) => (b.overall_yield_pct ?? 0) - (a.overall_yield_pct ?? 0))[0]}

				<!-- S1: KPI Strip -->
				<div class="flex gap-1.5 mb-2 overflow-x-auto">
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Final Yield</span>
						<span class="text-sm font-black font-mono text-white">{(curLotAgg?.totalYieldKg ?? 0).toFixed(2)} kg</span>
						{#if yieldDeltaKg !== null}
							<span class="text-[7px] font-bold" style="color: {yieldDeltaKg >= 0 ? '#bef264' : '#ef4444'};">{yieldDeltaKg >= 0 ? '▲' : '▼'} {Math.abs(yieldDeltaKg).toFixed(2)}kg</span>
						{:else}
							<span class="text-[7px] font-bold text-slate-600">—</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Extract Rate</span>
						<span class="text-sm font-black font-mono" style="color: #bef264;">{(curLotAgg?.avgYieldPct ?? 0).toFixed(2)}%</span>
						{#if rateDelta !== null}
							<span class="text-[7px] font-bold" style="color: {rateDelta >= 0 ? '#bef264' : '#ef4444'};">{rateDelta >= 0 ? '▲' : '▼'} {Math.abs(rateDelta).toFixed(2)}%</span>
						{/if}
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Best Batch</span>
						<span class="text-sm font-black font-mono text-white">{bestYieldBatch?.batch_number.replace('SG-', '') ?? '—'}</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Purity</span>
						<span class="text-sm font-black font-mono text-white">{curLotAgg?.avgPurity?.toFixed(1) ?? '—'}%</span>
					</div>
					<div class="flex-1 min-w-[80px] bg-[#0d0d0d] border border-white/10 rounded p-2 flex flex-col gap-0.5">
						<span class="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Yield Rank</span>
						<span class="text-sm font-black font-mono text-white">#{yieldRank}/{lots.length}</span>
					</div>
				</div>

				<!-- S2: Batch Yield Bar Chart — HERO -->
				{@const lotYieldData = data.runYieldBreakdown.filter(y => y.supplier_lot === activeLot && y.final_product_g != null)}
				{@const batchYieldMax = Math.max(...lotYieldData.map(y => y.final_product_g ?? 0), 1)}
				{@const batchYieldAvg = lotYieldData.length > 0 ? lotYieldData.reduce((s, y) => s + (y.final_product_g ?? 0), 0) / lotYieldData.length : 0}
				{@const yieldAvgLinePct = batchYieldAvg > 0 ? (batchYieldAvg / batchYieldMax) * 100 : 0}
				{#if lotYieldData.length > 0}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Batch Yield — {activeLot?.replace('LOT-', 'L')}</h4>
					<div class="relative flex items-end gap-1 px-1 h-[110px]">
						<div class="absolute left-0 right-0 border-t border-dashed" style="bottom: {yieldAvgLinePct}%; border-color: rgba(255,255,255,0.25);"></div>
						<span class="absolute text-[6px] font-mono text-slate-400 right-1" style="bottom: {yieldAvgLinePct + 1}%;">avg {(batchYieldAvg / 1000).toFixed(2)}kg</span>
						{#each lotYieldData as yb}
							{@const yieldG = yb.final_product_g ?? 0}
							{@const hPct = (yieldG / batchYieldMax) * 100}
							{@const isAboveAvg = yieldG >= batchYieldAvg}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectBatch(yb.batch_id)}
								onmouseenter={(e) => chartTooltip = { x: e.clientX, y: e.clientY, lines: [yb.batch_number, `Yield: ${(yieldG / 1000).toFixed(2)}kg`, `Rate: ${yb.overall_yield_pct?.toFixed(2) ?? '—'}%`] }} onmouseleave={() => chartTooltip = null}>
								<span class="text-[6px] font-mono font-bold mb-0.5 text-white">{(yieldG / 1000).toFixed(1)}</span>
								<div class="w-full rounded-t transition-all {selectedBatchId === yb.batch_id ? 'ring-2 ring-[#bef264]' : ''}" style="height: {hPct}%; background: {isAboveAvg ? 'rgba(190,242,100,0.6)' : 'rgba(239,68,68,0.5)'}; min-height: 4px;"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{yb.batch_number.replace('SG-', '')}</span>
							</button>
						{/each}
					</div>
				</div>
				{/if}

				<!-- S3: Stage Yield — Current vs Previous -->
				{@const curStages = getLotStageYields(activeLot)}
				{@const prevStages = getLotStageYields(prevLot)}
				{@const stageNames = ['Grinding', 'Extraction', 'A/B Phase', 'Drying'] as const}
				{@const stageKeys = ['grinding', 'extraction', 'abPhase', 'drying'] as const}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Stage Yield — Current vs Previous</h4>
					<div class="space-y-1">
						{#each stageKeys as key, si}
							{@const curVal = curStages[key]}
							{@const prevVal = prevStages[key]}
							{@const stageColor = curVal >= 95 ? '#bef264' : curVal >= 85 ? '#f59e0b' : '#ef4444'}
							<div class="flex items-center gap-1.5">
								<span class="w-14 text-[7px] font-bold text-slate-500 uppercase truncate">{stageNames[si]}</span>
								<div class="flex-1 flex flex-col gap-0.5">
									<div class="h-2 w-full rounded-sm overflow-hidden" style="background: rgba(255,255,255,0.05);">
										<div class="h-full rounded-sm" style="width: {Math.min(100, curVal)}%; background: {stageColor};"></div>
									</div>
									{#if prevLot}
										<div class="h-1 w-full rounded-sm overflow-hidden" style="background: rgba(255,255,255,0.03);">
											<div class="h-full rounded-sm opacity-40" style="width: {Math.min(100, prevVal)}%; background: {stageColor};"></div>
										</div>
									{/if}
								</div>
								<span class="text-[7px] font-mono font-bold w-10 text-right" style="color: {stageColor};">{curVal.toFixed(0)}%</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- S4: Batch Yield Scatter -->
				{@const scatterBatches = data.runYieldBreakdown.filter(y => y.supplier_lot === activeLot && y.final_product_g != null).map(y => {
					const eth = data.runEthanolBreakdown.find(e => e.batch_id === y.batch_id);
					return { batchId: y.batch_id, recoveryPct: eth?.recovery_pct ?? 0, yieldG: y.final_product_g ?? 0 };
				}).filter(s => s.recoveryPct > 0)}
				{#if scatterBatches.length > 0}
				{@const avgRecX = scatterBatches.reduce((s, b) => s + b.recoveryPct, 0) / scatterBatches.length}
				{@const avgYieldY = scatterBatches.reduce((s, b) => s + b.yieldG, 0) / scatterBatches.length}
				{@const xMin = Math.min(...scatterBatches.map(s => s.recoveryPct)) - 1}
				{@const xMax = Math.max(...scatterBatches.map(s => s.recoveryPct)) + 1}
				{@const yMin = Math.min(...scatterBatches.map(s => s.yieldG)) - 10}
				{@const yMax = Math.max(...scatterBatches.map(s => s.yieldG)) + 10}
				{@const crossX = 30 + ((avgRecX - xMin) / (xMax - xMin || 1)) * 440}
				{@const crossY = 5 + (1 - (avgYieldY - yMin) / (yMax - yMin || 1)) * 60}
				<div class="mb-2 overflow-hidden h-48">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Recovery vs Yield</h4>
					<svg viewBox="0 0 500 75" class="w-full" overflow="hidden" style="background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;">
						<!-- Crosshairs -->
						<line x1={crossX} y1="5" x2={crossX} y2="65" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 3" stroke-width="0.5" />
						<line x1="30" y1={crossY} x2="470" y2={crossY} stroke="rgba(255,255,255,0.12)" stroke-dasharray="3 3" stroke-width="0.5" />
						<!-- Dots -->
						{#each scatterBatches as sb}
							{@const sx = 30 + ((sb.recoveryPct - xMin) / (xMax - xMin || 1)) * 440}
							{@const sy = 5 + (1 - (sb.yieldG - yMin) / (yMax - yMin || 1)) * 60}
							{@const above = sb.yieldG >= avgYieldY}
							<circle cx={sx} cy={sy} r="4" fill={above ? '#bef264' : '#ef4444'} opacity="0.8" style="cursor: pointer;" onclick={() => selectBatch(sb.batchId)} onmouseenter={(e) => chartTooltip = { x: e.clientX, y: e.clientY, lines: [`Recovery: ${sb.recoveryPct.toFixed(1)}%`, `Yield: ${sb.yieldG.toFixed(0)}g`] }} onmouseleave={() => chartTooltip = null} />
						{/each}
						<!-- Axis labels -->
						<text x="250" y="73" text-anchor="middle" fill="#666666" font-size="5">Recovery %</text>
						<text x="5" y="35" text-anchor="start" fill="#666666" font-size="5" transform="rotate(-90, 5, 35)">Yield g</text>
					</svg>
				</div>
				{/if}

				<!-- S5: Quality Specs -->
				{@const mitVal = curLotAgg?.avgMitragynine ?? null}
				{@const purVal = curLotAgg?.avgPurity ?? null}
				{@const devCount = curLotAgg?.deviationCount ?? 0}
				{@const lotMitValues = lots.map(l => lotSummaries.get(l)?.avgMitragynine ?? 0).filter(v => v > 0)}
				{@const lotPurValues = lots.map(l => lotSummaries.get(l)?.avgPurity ?? 0).filter(v => v > 0)}
				{#if mitVal !== null || purVal !== null || devCount > 0}
				<div class="mb-1">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Quality Specs</h4>
					<div class="space-y-1.5">
						<div class="flex items-center gap-2">
							<span class="w-20 text-[7px] font-bold text-slate-500">Mitragynine %</span>
							<span class="text-[8px] font-mono font-bold text-white">{mitVal?.toFixed(1) ?? '—'}%</span>
							{#if mitVal !== null}
								<span class="text-[6px] px-1 py-0.5 rounded font-bold" style="background: {mitVal >= 1.0 ? 'rgba(190,242,100,0.15)' : 'rgba(239,68,68,0.15)'}; color: {mitVal >= 1.0 ? '#bef264' : '#ef4444'};">{mitVal >= 1.0 ? 'PASS' : 'FAIL'}</span>
							{/if}
							{#if lotMitValues.length >= 2}
								{@const mitChart = smoothPath(lotMitValues, 60, 12)}
								<svg viewBox="0 0 60 12" class="w-[60px] h-[12px]">
									<path d={mitChart.line} fill="none" stroke="#bef264" stroke-width="1" opacity="0.6" />
								</svg>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span class="w-20 text-[7px] font-bold text-slate-500">Purity %</span>
							<span class="text-[8px] font-mono font-bold text-white">{purVal !== null ? purVal.toFixed(1) + '%' : 'N/A'}</span>
							{#if purVal !== null}
								<span class="text-[6px] px-1 py-0.5 rounded font-bold" style="background: {purVal >= 80 ? 'rgba(190,242,100,0.15)' : 'rgba(239,68,68,0.15)'}; color: {purVal >= 80 ? '#bef264' : '#ef4444'};">{purVal >= 80 ? 'PASS' : 'FAIL'}</span>
							{/if}
							{#if purVal !== null}
								<div class="flex-1 h-1.5 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.05);">
									<div class="h-full rounded-full" style="width: {Math.min(100, purVal)}%; background: {purVal >= 80 ? '#bef264' : '#ef4444'};"></div>
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<span class="w-20 text-[7px] font-bold text-slate-500">Deviations</span>
							<span class="text-[8px] font-mono font-bold" style="color: {devCount > 0 ? '#ef4444' : '#bef264'};">{devCount}</span>
						</div>
					</div>
				</div>
				{:else}
				<div class="mb-1 p-2.5 rounded border border-white/5" style="background: rgba(255,255,255,0.02);">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Quality Specs</h4>
					<p class="text-[8px] text-slate-500 italic">Lab results pending — submit samples to populate quality data</p>
				</div>
				{/if}
				{/if}
			{:else if yieldMode === 'batch'}
				<!-- Lot History: Yield per Lot Bar Chart -->
				{#if true}
				{@const lots = allLots()}
				{@const lotYields = lots.map(l => lotSummaries.get(l)?.totalYieldKg ?? 0)}
				{@const yieldMax = Math.max(...lotYields) * 1.15 || 1}
				{@const lotRates = lots.map(l => lotSummaries.get(l)?.avgYieldPct ?? 0)}
				{@const rateMin = Math.min(...lotRates.filter(r => r > 0)) - 0.1}
				{@const rateMax = Math.max(...lotRates) + 0.1}
				{@const rateRange = rateMax - rateMin || 1}
				<div class="mb-2">
					<h4 class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Yield per Lot</h4>
					<div class="relative flex items-end gap-1 px-1" style="height: 110px;">
						{#each lots as lot, li}
							{@const ykg = lotSummaries.get(lot)?.totalYieldKg ?? 0}
							{@const hPct = (ykg / yieldMax) * 100}
							{@const isCurrent = lot === activeLot}
							<button class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all" onclick={() => selectedLot = lot}>
								<span class="text-[6px] font-mono font-bold mb-0.5 text-white">{ykg.toFixed(1)}</span>
								<div class="w-full rounded-t transition-all {isCurrent ? 'ring-2 ring-[#bef264]' : ''}" style="height: {hPct}%; background: rgba(190,242,100,{isCurrent ? 0.8 : 0.4}); min-height: 4px; opacity: {isCurrent ? 1 : 0.6};"></div>
								<span class="text-[5px] font-bold text-slate-500 mt-0.5">{lot.replace('LOT-', 'L')}</span>
							</button>
						{/each}
						<svg class="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
							{#each lots as lot, li}
								{@const rate = lotSummaries.get(lot)?.avgYieldPct ?? 0}
								{@const dotX = ((li + 0.5) / lots.length) * 100}
								{@const dotY = rate > 0 ? 100 - ((rate - rateMin) / rateRange) * 85 - 5 : 95}
								{#if li > 0}
									{@const prevRate = lotSummaries.get(lots[li - 1])?.avgYieldPct ?? 0}
									{@const prevX = ((li - 0.5) / lots.length) * 100}
									{@const prevY = prevRate > 0 ? 100 - ((prevRate - rateMin) / rateRange) * 85 - 5 : 95}
									<line x1="{prevX}%" y1="{prevY}%" x2="{dotX}%" y2="{dotY}%" stroke="rgba(236,91,19,0.4)" stroke-width="0.5" vector-effect="non-scaling-stroke" />
								{/if}
								<circle cx="{dotX}%" cy="{dotY}%" r="1.5" fill="#ec5b13" vector-effect="non-scaling-stroke" />
							{/each}
						</svg>
						<div class="flex items-center gap-3 mt-1 text-[6px] text-slate-500">
							<span class="inline-block w-2 h-2 rounded-sm" style="background: rgba(190,242,100,0.6);"></span>
							<span>Yield (kg)</span>
							<span class="inline-block w-1.5 h-1.5 rounded-full" style="background: #ec5b13;"></span>
							<span>Extract Rate (%)</span>
						</div>
					</div>
				</div>
				{/if}
			{:else if yieldMode === 'history'}
				<!-- Batch Contrib. — coming soon -->
				<div class="flex-1 flex flex-col items-center justify-center">
					<span class="material-symbols-outlined text-[24px] text-slate-600 mb-2">construction</span>
					<p class="text-[8px] text-slate-500 italic">Batch contribution analysis coming soon</p>
				</div>
			{:else}
				<!-- Quality — coming soon -->
				<div class="flex-1 flex flex-col items-center justify-center">
					<span class="material-symbols-outlined text-[24px] text-slate-600 mb-2">construction</span>
					<p class="text-[8px] text-slate-500 italic">Quality analysis coming soon</p>
				</div>
			{/if}
		{/if}
		</div>

		<!-- Carousel navigation -->
		<div class="flex-shrink-0 flex items-center justify-center gap-1.5 pt-2" style="border-top: 1px solid rgba(30, 30, 30, 0.8);">
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 0 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 0}>Cost</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 1 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 1}>Ethanol</button>
			<button class="px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded-full transition-colors {carouselIndex === 2 ? 'text-text-primary bg-primary/15' : 'text-text-muted/40 hover:text-text-muted/60'}" onclick={() => carouselIndex = 2}>Yield</button>
		</div>
	</div>

</div>
{:else}
<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
{/if}

{#if chartTooltip}
	<div class="fixed z-[60] pointer-events-none px-2 py-1.5 rounded-lg border border-white/10 shadow-xl text-[8px] font-mono"
		style="left: {chartTooltip.x + 12}px; top: {chartTooltip.y - 10}px; background: #1a1a1a;">
		{#each chartTooltip.lines as line}
			<div class="text-text-secondary whitespace-nowrap">{line}</div>
		{/each}
	</div>
{/if}

{#if expandedCard !== null}
	<button class="fixed inset-0 z-40 bg-black/60" onclick={() => expandedCard = null}></button>
{/if}

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') expandedCard = null; }} />

<!-- Batch Detail Drawer -->
<BatchDrawer batchId={drawerBatchId} runId={data.activeRunId} onclose={() => drawerBatchId = null} />
