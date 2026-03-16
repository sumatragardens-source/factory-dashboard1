<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const pm = data.pipeline;
	const TOTAL_INTAKE_KG = 1000;

	// Fill percentage: lots finalized × 100kg / 1000kg
	function stageFill(stageNumber: number): number {
		return Math.min(100, ((pm.stageCounts[stageNumber] ?? 0) * 100) / TOTAL_INTAKE_KG * 100);
	}

	// KPI: Throughput — lots that have finalized stage 1
	const lotsProcessed = pm.stageCounts[1] ?? 0;

	// KPI: Final Yield
	const yieldPct = Math.min(100, data.totalFinalYield.pct);
	const remainingYieldKg = (data.totalFinalYield.targetKg - data.totalFinalYield.producedKg).toFixed(1);

	// Intake bar
	const processedKg = (pm.stageCounts[1] ?? 0) * 100;
	const intakePct = (processedKg / TOTAL_INTAKE_KG) * 100;
	const remainingKg = TOTAL_INTAKE_KG - processedKg;

	// Filtration & distillation rates
	const filtrationLossL = Number((pm.ethanol70TotalL - pm.filtrationOutputL).toFixed(1));
	const filtrationPct = pm.ethanol70TotalL > 0 ? (pm.filtrationOutputL / pm.ethanol70TotalL * 100).toFixed(1) : '0';
	const distillationPct = pm.filtrationOutputL > 0 ? (pm.ethanolRecoveredL / pm.filtrationOutputL * 100).toFixed(1) : '0';

	// Pipeline: 5 main icons connected by lines with 4 notch circles between them
	const mainSteps = [
		{ icon: 'eco', label: 'Raw Material', href: '/stages/1', fillPct: stageFill(1) },
		{ icon: 'science', label: 'EtOH', href: '/stages/2', fillPct: stageFill(2) },
		{ icon: 'local_fire_department', label: 'Distillation', href: '/stages/4', fillPct: stageFill(4) },
		{ icon: '✦', label: 'Precipitation', href: '/stages/7', fillPct: stageFill(7), customIcon: true },
		{ icon: 'diamond', label: 'Final Yield', href: '/stages/8', fillPct: stageFill(8) }
	];
	const notchSteps = [
		{ label: 'Powder', stage: 1 },
		{ label: 'Filtration', stage: 3 },
		{ label: 'A/B', stage: 5 },
		{ label: 'Drying', stage: 8 }
	];

	// Solvent recovery rates (bottom cards)
	const ethRecoveryRate = data.solventTotals.ethanol_issued > 0 ? (data.solventTotals.ethanol_recovered / data.solventTotals.ethanol_issued * 100) : 0;
	const limRecoveryRate = data.solventTotals.limonene_issued > 0 ? (data.solventTotals.limonene_recovered / data.solventTotals.limonene_issued * 100) : 0;

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

	const stageBreakdown = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
		stage: n,
		count: data.activeBatchProgress.filter(b => b.current_stage === n).length
	})).filter(s => s.count > 0);
</script>

<div class="flex-1 p-4 grid grid-cols-12 gap-4 overflow-auto content-start">
	<!-- Row 1: 3 KPI Cards -->
	<div class="col-span-12 grid grid-cols-3 gap-4">
		<!-- Total Throughput -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Total Throughput</p>
			<p class="text-2xl font-black text-text-primary">{processedKg.toLocaleString()} <span class="text-xs font-normal text-text-muted">kg processed</span></p>
			<p class="text-[10px] text-text-muted">{lotsProcessed} lots · {intakePct.toFixed(1)}% of raw material</p>
		</div>

		<!-- Completed Lots -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Completed Lots</p>
			<p class="text-2xl font-black text-text-primary">{lotsProcessed}</p>
			<p class="text-[10px] text-text-muted">
				{#each stageBreakdown as sb, i}
					S{sb.stage}: {sb.count}{i < stageBreakdown.length - 1 ? ' · ' : ''}
				{/each}
			</p>
		</div>

		<!-- Final Yield Progress -->
		<div class="bg-bg-card border border-border-card p-3 rounded">
			<p class="text-[10px] font-black uppercase tracking-widest text-text-muted">Final Yield Progress</p>
			<p class="text-2xl font-black text-text-primary">{data.totalFinalYield.producedKg} <span class="text-xs font-normal text-text-muted">/ {data.totalFinalYield.targetKg} kg</span></p>
			<div class="mt-1.5 h-1.5 w-full bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {yieldPct}%"></div>
			</div>
			<p class="text-[10px] text-text-muted mt-1">{yieldPct.toFixed(1)}% · {remainingYieldKg} kg remaining</p>
		</div>
	</div>

	<!-- Row 2: Process Pipeline -->
	<div class="col-span-12 bg-bg-card border border-border-card p-6 rounded-xl shadow-sm">
		<h2 class="text-lg font-bold mb-6 flex items-center gap-2">
			<span class="material-symbols-outlined">hub</span>
			Active Process Pipeline
			<span class="text-xs font-normal text-text-muted ml-2">Processing {TOTAL_INTAKE_KG.toLocaleString()} kg raw material</span>
		</h2>
		<div class="relative flex items-start px-4">
			{#each mainSteps as step, i}
				<!-- Main icon -->
				<div class="flex-none group relative flex flex-col items-center text-center z-10">
					<a href={step.href} class="flex flex-col items-center">
						<div class="h-16 w-16 rounded-full bg-primary/30 text-primary border-2 border-primary shadow-[0_0_12px_rgba(143,191,111,0.3)] flex items-center justify-center">
							{#if step.icon === '✦'}
								<span class="text-[12px] leading-tight tracking-[2px]">✦✦✦<br>✦✦</span>
							{:else if step.customIcon}
								<span class="text-[20px] font-black leading-none">{step.icon}</span>
							{:else}
								<span class="material-symbols-outlined text-[26px]">{step.icon}</span>
							{/if}
						</div>
						<p class="text-[11px] font-semibold whitespace-nowrap mt-2">{step.label}</p>
					</a>
					<!-- Main tooltip -->
					<div class="absolute top-full mt-1 z-20 bg-bg-card border border-border-card rounded-lg shadow-lg p-3 w-52 text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 {i === 0 ? 'left-0' : i === mainSteps.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}">
						<p class="text-[10px] font-bold text-primary">{step.fillPct.toFixed(0)}% complete</p>
						<p class="text-[10px] text-text-muted mb-2">{(100 - step.fillPct).toFixed(0)}% remaining</p>
						<div class="border-t border-border-subtle pt-2 space-y-1.5">
							{#if i === 0}
								<!-- Raw Material -->
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Processed</span>
									<span class="text-[10px] font-bold text-text-primary">{processedKg.toLocaleString()} kg</span>
								</div>
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Remaining</span>
									<span class="text-[10px] font-bold text-text-primary">{remainingKg.toLocaleString()} kg</span>
								</div>
							{:else if i === 1}
								<!-- EtOH (extraction + filtration) -->
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Extractions</span>
									<span class="text-[10px] font-bold text-text-primary">{pm.lotsExtracted} / {pm.ethanolStockUsedL.toLocaleString()}L</span>
								</div>
								<div class="border-t border-border-subtle pt-1.5 mt-1.5 space-y-1.5">
									<p class="text-[9px] font-bold text-text-muted uppercase tracking-wider">Filtration</p>
									<div class="flex justify-between">
										<span class="text-[10px] text-text-muted">Recovered</span>
										<span class="text-[10px] font-bold text-text-primary">{pm.filtrationOutputL.toLocaleString()} L</span>
									</div>
									<div class="flex justify-between">
										<span class="text-[10px] text-text-muted">Lost</span>
										<span class="text-[10px] font-bold text-red-500">{filtrationLossL} L</span>
									</div>
									<div class="flex justify-between">
										<span class="text-[10px] text-text-muted">Recovery</span>
										<span class="text-[10px] font-bold text-text-primary">{filtrationPct}%</span>
									</div>
								</div>
							{:else if i === 2}
								<!-- Distillation -->
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Recovered</span>
									<span class="text-[10px] font-bold text-text-primary">{pm.ethanolRecoveredL.toLocaleString()} L</span>
								</div>
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Lost</span>
									<span class="text-[10px] font-bold text-red-500">{pm.ethanolLostL} L</span>
								</div>
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Recovery</span>
									<span class="text-[10px] font-bold text-text-primary">{distillationPct}%</span>
								</div>
							{:else if i === 3}
								<!-- Precipitation -->
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Wet weight</span>
									<span class="text-[10px] font-bold text-text-primary">{pm.precipitateKg} kg</span>
								</div>
								<div class="border-t border-border-subtle pt-1.5 mt-1.5 space-y-1.5">
									<p class="text-[9px] font-bold text-text-muted uppercase tracking-wider">A/B Extraction</p>
									<div class="flex justify-between">
										<span class="text-[10px] text-text-muted">D-Limo Recovered</span>
										<span class="text-[10px] font-bold text-text-primary">{pm.limoneneRecoveredL} L</span>
									</div>
									<div class="flex justify-between">
										<span class="text-[10px] text-text-muted">D-Limo Lost</span>
										<span class="text-[10px] font-bold text-red-500">{pm.limoneneLostL} L</span>
									</div>
								</div>
							{:else if i === 4}
								<!-- Final Yield -->
								<div class="flex justify-between">
									<span class="text-[10px] text-text-muted">Dried extract</span>
									<span class="text-[10px] font-bold text-text-primary">{pm.finalProductKg} kg</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
				<!-- Connector with notch circle (between main icons) -->
				{#if i < mainSteps.length - 1}
					<div class="flex-1 flex items-center relative" style="margin-top: 30px;">
						<div class="flex-1 h-0.5 bg-primary/50"></div>
						<div class="flex-none group/notch relative flex flex-col items-center mx-0.5">
							<div class="h-2.5 w-2.5 rounded-full bg-primary border border-primary/60 z-10"></div>
							<p class="text-[8px] text-text-muted mt-1 whitespace-nowrap">{notchSteps[i].label}</p>
							<!-- Notch tooltip -->
							<div class="absolute top-full mt-2 z-20 bg-bg-card border border-border-card rounded-lg shadow-lg p-2.5 w-44 text-left opacity-0 pointer-events-none group-hover/notch:opacity-100 transition-opacity duration-150 left-1/2 -translate-x-1/2">
								<p class="text-[9px] font-bold text-primary mb-1.5">{notchSteps[i].label}</p>
								<div class="space-y-1">
									{#if i === 0}
										<!-- Powder -->
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Total Powder</span><span class="text-[9px] font-bold text-text-primary">{pm.totalPowderKg} kg</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Ground</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[1] ?? 0}</span></div>
									{:else if i === 1}
										<!-- Filtration -->
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovered</span><span class="text-[9px] font-bold text-text-primary">{pm.filtrationOutputL} L</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lost</span><span class="text-[9px] font-bold text-red-500">{filtrationLossL} L</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Recovery</span><span class="text-[9px] font-bold text-text-primary">{filtrationPct}%</span></div>
									{:else if i === 2}
										<!-- A/B -->
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Recovered</span><span class="text-[9px] font-bold text-text-primary">{pm.limoneneRecoveredL} L</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">D-Limo Lost</span><span class="text-[9px] font-bold text-red-500">{pm.limoneneLostL} L</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Processed</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[5] ?? 0}</span></div>
									{:else if i === 3}
										<!-- Drying -->
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Precipitate In</span><span class="text-[9px] font-bold text-text-primary">{pm.precipitateKg} kg</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Final Product</span><span class="text-[9px] font-bold text-text-primary">{pm.finalProductKg} kg</span></div>
										<div class="flex justify-between"><span class="text-[9px] text-text-muted">Lots Dried</span><span class="text-[9px] font-bold text-text-primary">{pm.stageCounts[8] ?? 0}</span></div>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex-1 h-0.5 bg-primary/50"></div>
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Row 3: Lot Progress -->
	<div class="col-span-12 bg-bg-card border border-border-card p-4 rounded">
		<!-- Intake summary bar -->
		<div class="flex items-center gap-4 mb-4 pb-3 border-b border-border-subtle">
			<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted whitespace-nowrap">Total Intake: {TOTAL_INTAKE_KG.toLocaleString()} kg</h3>
			<div class="flex-1 h-2 bg-border-card rounded-full overflow-hidden">
				<div class="h-full bg-primary rounded-full transition-all" style="width: {intakePct}%"></div>
			</div>
			<p class="text-[10px] text-text-muted whitespace-nowrap">{processedKg.toLocaleString()} kg processed / {remainingKg.toLocaleString()} kg remaining</p>
		</div>

		<!-- Lot progress table -->
		{#if data.activeBatchProgress.length === 0}
			<p class="text-xs text-text-muted">No active lots</p>
		{:else}
			<div class="overflow-x-auto">
				<!-- Header -->
				<div style="display: grid; grid-template-columns: 120px repeat(7, 1fr) 80px 120px 55px;" class="text-[8px] font-bold text-text-muted uppercase tracking-wider pb-2 border-b border-border-subtle gap-1 min-w-[850px]">
					<div>Lot</div>
					{#each TABLE_COLUMNS as col}
						<div class="text-center">{col.label}</div>
					{/each}
					<div class="text-center">Progress</div>
					<div>Stage</div>
					<div class="text-center">Action</div>
				</div>
				{#each data.activeBatchProgress as batch}
					{@const completedStages = batch.stages.filter(s => s.status === 'Finalized').length}
					<a href="/batches/{batch.id}" style="display: grid; grid-template-columns: 120px repeat(7, 1fr) 80px 120px 55px;" class="items-center py-2 border-b border-border-subtle hover:bg-bg-card-hover transition-colors rounded gap-1 min-w-[850px]">
						<!-- Lot ID + Operator -->
						<div>
							<p class="text-xs font-bold text-text-primary">{batch.batch_number}</p>
							<p class="text-[10px] text-text-muted">{batch.operator_name ?? '—'}</p>
						</div>
						<!-- 7 Stage cells -->
						{#each TABLE_COLUMNS as col, ci}
							{@const colStatus = columnStatusColor(batch.stages, col.dbStages)}
							{@const isFinalized = colStatus.includes('primary')}
							{@const isInProgress = colStatus.includes('blue')}
							<div class="group/cell relative text-center rounded py-1 px-0.5 text-[9px] font-bold {colStatus}">
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
						<div class="px-1">
							<div class="h-1.5 w-full bg-border-card rounded-full overflow-hidden">
								<div class="h-full bg-primary rounded-full" style="width: {(completedStages / 8 * 100)}%"></div>
							</div>
							<p class="text-[9px] text-text-muted text-center mt-0.5">{completedStages}/8</p>
						</div>
						<!-- Current stage -->
						<div>
							<p class="text-[10px] font-bold text-text-secondary">
								{#if batch.final_product_weight_kg != null}
									Complete
								{:else if batch.precipitate_weight_kg != null}
									Drying
								{:else}
									{getStageName(batch.current_stage)}
								{/if}
							</p>
						</div>
						<!-- Next action -->
						<div class="text-center">
							<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded {nextAction(batch) === 'Review' ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}">{nextAction(batch)}</span>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Row 4: Analytics (2-col) -->
	<div class="col-span-12 grid grid-cols-2 gap-4">
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
						<p class="text-[10px] text-text-muted">Latest Completed Lot</p>
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
				<p class="text-[10px] text-text-muted">No completed lot data</p>
			{/if}
		</div>
	</div>
</div>
