<script lang="ts">
	import { getProcessStageName } from '$lib/constants/stageNames';
	import type { BatchDetailData } from '$lib/data/repositories/dashboardRepo';

	let {
		batchId = null,
		runId = 0,
		onclose
	}: {
		batchId: number | null;
		runId: number;
		onclose: () => void;
	} = $props();

	let detail: BatchDetailData | null = $state(null);
	let loading = $state(false);
	let activeTab: 'overview' | 'cost' | 'solvent' | 'quality' | 'deviations' = $state('overview');

	$effect(() => {
		if (batchId && runId) {
			loading = true;
			detail = null;
			activeTab = 'overview';
			fetch(`/api/batch-detail/${batchId}?runId=${runId}`)
				.then((r) => r.json())
				.then((d) => {
					detail = d;
					loading = false;
				})
				.catch(() => {
					loading = false;
				});
		}
	});

	function stageColor(status: string): string {
		if (status === 'Finalized') return 'bg-primary';
		if (status === 'In Progress') return 'bg-blue-500';
		return 'bg-border-card';
	}

	function statusColor(status: string): string {
		if (status === 'Completed') return 'text-primary bg-primary/15';
		if (status === 'In Progress') return 'text-blue-400 bg-blue-900/30';
		if (status === 'Pending Review') return 'text-amber-400 bg-amber-900/30';
		if (status === 'Rejected') return 'text-red-400 bg-red-900/30';
		return 'text-text-muted bg-bg-input';
	}

	function severityColor(severity: string): string {
		if (severity === 'Critical') return 'text-red-400 bg-red-900/30';
		if (severity === 'High') return 'text-orange-400 bg-orange-900/30';
		if (severity === 'Medium') return 'text-amber-400 bg-amber-900/30';
		return 'text-blue-400 bg-blue-900/30';
	}

	const tabs = [
		{ id: 'overview' as const, label: 'Overview' },
		{ id: 'cost' as const, label: 'Cost' },
		{ id: 'solvent' as const, label: 'Solvent' },
		{ id: 'quality' as const, label: 'Quality' },
		{ id: 'deviations' as const, label: 'Deviations' }
	];
</script>

{#if batchId !== null}
	<!-- Backdrop -->
	<button class="fixed inset-0 bg-black/40 z-40" onclick={onclose} aria-label="Close drawer"></button>

	<!-- Drawer -->
	<div
		class="fixed right-0 top-0 h-full w-[420px] z-50 bg-bg-card border-l border-border-card shadow-2xl flex flex-col overflow-hidden"
	>
		{#if loading}
			<div class="flex-1 flex items-center justify-center">
				<span class="text-text-muted text-sm">Loading...</span>
			</div>
		{:else if detail}
			<!-- Header -->
			<div class="px-4 pt-4 pb-3 border-b border-border-card flex items-center justify-between">
				<div class="flex items-center gap-2">
					<h2 class="text-sm font-bold text-text-primary">{detail.batch.batch_number}</h2>
					<span class="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded {statusColor(detail.batch.status)}"
						>{detail.batch.status}</span
					>
				</div>
				<button class="text-text-muted hover:text-text-primary transition-colors" onclick={onclose}>
					<span class="material-symbols-outlined text-[18px]">close</span>
				</button>
			</div>

			<!-- Context row -->
			<div class="px-4 py-2 flex gap-3 text-[8px] text-text-muted border-b border-border-card/50">
				{#if detail.batch.operator_name}
					<span><span class="text-text-muted/40">Op:</span> {detail.batch.operator_name}</span>
				{/if}
				{#if detail.batch.supplier}
					<span><span class="text-text-muted/40">Supplier:</span> {detail.batch.supplier}</span>
				{/if}
			</div>

			<!-- Stage progress bar -->
			<div class="px-4 py-2 border-b border-border-card/50">
				<div class="flex gap-0.5">
					{#each detail.stages as stage}
						<div
							class="flex-1 h-1.5 rounded-full {stageColor(stage.status)}"
							title="{getProcessStageName(stage.stage_number)}: {stage.status}"
						></div>
					{/each}
				</div>
				<p class="text-[7px] text-text-muted/40 mt-1">
					{detail.stages.filter((s) => s.status === 'Finalized').length}/4 stages complete
				</p>
			</div>

			<!-- Tab nav -->
			<div class="px-4 pt-2 flex gap-1 border-b border-border-card/50">
				{#each tabs as tab}
					<button
						class="px-2 py-1 text-[8px] font-bold uppercase tracking-wider rounded-t transition-colors {activeTab ===
						tab.id
							? 'text-text-primary bg-bg-input border-b-2 border-primary'
							: 'text-text-muted/40 hover:text-text-muted/60'}"
						onclick={() => (activeTab = tab.id)}
						>{tab.label}{#if tab.id === 'deviations' && detail.deviations.length > 0}<span
								class="ml-1 text-[7px] text-red-400">({detail.deviations.length})</span
							>{/if}</button
					>
				{/each}
			</div>

			<!-- Tab content -->
			<div class="flex-1 overflow-y-auto px-4 py-3">
				{#if activeTab === 'overview'}
					<!-- Key metrics grid -->
					<div class="grid grid-cols-2 gap-2 mb-3">
						<div class="bg-bg-input rounded p-2">
							<p class="text-[7px] text-text-muted/40 uppercase">Yield</p>
							<p class="text-sm font-bold text-text-primary">{detail.stage4?.overall_yield_pct?.toFixed(1) ?? '—'}%</p>
							{#if detail.runAvgYield}
								<p class="text-[7px] text-text-muted/40">Run avg: {detail.runAvgYield}%</p>
							{/if}
						</div>
						<div class="bg-bg-input rounded p-2">
							<p class="text-[7px] text-text-muted/40 uppercase">Cost</p>
							<p class="text-sm font-bold text-text-primary">${Math.round(detail.totalCost).toLocaleString()}</p>
							{#if detail.costPerKg}
								<p class="text-[7px] text-text-muted/40">${detail.costPerKg}/kg</p>
							{/if}
						</div>
						<div class="bg-bg-input rounded p-2">
							<p class="text-[7px] text-text-muted/40 uppercase">EtOH Recovery</p>
							<p class="text-sm font-bold text-text-primary">{detail.stage2?.etoh_recovery_pct?.toFixed(1) ?? '—'}%</p>
							{#if detail.runAvgRecovery}
								<p class="text-[7px] text-text-muted/40">Run avg: {detail.runAvgRecovery}%</p>
							{/if}
						</div>
						<div class="bg-bg-input rounded p-2">
							<p class="text-[7px] text-text-muted/40 uppercase">Output</p>
							<p class="text-sm font-bold text-text-primary">
								{detail.stage4?.final_product_g != null ? (detail.stage4.final_product_g / 1000).toFixed(2) : '—'} kg
							</p>
							<p class="text-[7px] text-text-muted/40">from {detail.batch.leaf_input_kg} kg leaf</p>
						</div>
					</div>

					<!-- Stage timeline -->
					<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">Stage Timeline</p>
					<div class="space-y-1 mb-3">
						{#each detail.stages as stage}
							<div class="flex items-center gap-2 text-[8px]">
								<span class="w-3 h-3 rounded-full flex-none {stageColor(stage.status)}"></span>
								<span class="flex-1 text-text-secondary">{getProcessStageName(stage.stage_number)}</span>
								<span class="text-text-muted/40">
									{#if stage.finalized_at}
										{stage.finalized_at.split(' ')[0]}
									{:else if stage.started_at}
										Started {stage.started_at.split(' ')[0]}
									{:else}
										Pending
									{/if}
								</span>
							</div>
						{/each}
					</div>

					<!-- vs Run Average comparison bars -->
					{#if detail.runAvgYield || detail.runAvgRecovery}
						<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">vs Run Average</p>
						<div class="space-y-1.5">
							{#if detail.stage4?.overall_yield_pct && detail.runAvgYield}
								{@const diff = detail.stage4.overall_yield_pct - detail.runAvgYield}
								<div class="flex items-center gap-2">
									<span class="text-[8px] text-text-muted w-14">Yield</span>
									<div class="flex-1 h-1 rounded-full bg-border-card overflow-hidden">
										<div
											class="h-full rounded-full"
											style="width: {Math.min(100, (detail.stage4.overall_yield_pct / 10) * 100)}%; background: {diff >=
											0
												? '#8BAA7C'
												: '#C4896A'};"
										></div>
									</div>
									<span class="text-[8px] font-medium" style="color: {diff >= 0 ? '#8BAA7C' : '#C4896A'};"
										>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span
									>
								</div>
							{/if}
							{#if detail.stage2?.etoh_recovery_pct && detail.runAvgRecovery}
								{@const diff = detail.stage2.etoh_recovery_pct - detail.runAvgRecovery}
								<div class="flex items-center gap-2">
									<span class="text-[8px] text-text-muted w-14">Recovery</span>
									<div class="flex-1 h-1 rounded-full bg-border-card overflow-hidden">
										<div
											class="h-full rounded-full"
											style="width: {Math.min(100, detail.stage2.etoh_recovery_pct)}%; background: {diff >= 0
												? '#8BAA7C'
												: '#C4896A'};"
										></div>
									</div>
									<span class="text-[8px] font-medium" style="color: {diff >= 0 ? '#8BAA7C' : '#C4896A'};"
										>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span
									>
								</div>
							{/if}
						</div>
					{/if}
				{:else if activeTab === 'cost'}
					<div class="mb-3">
						<div class="flex items-baseline gap-2 mb-2">
							<span class="text-lg font-bold text-text-primary">${Math.round(detail.totalCost).toLocaleString()}</span>
							{#if detail.costPerKg}
								<span class="text-[9px] text-text-muted">${detail.costPerKg}/kg</span>
							{/if}
						</div>
						{#if detail.runAvgCostPerKg}
							<p class="text-[8px] text-text-muted/40">Run avg: ${detail.runAvgCostPerKg}/kg</p>
						{/if}
					</div>

					<!-- Category bars -->
					<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">Cost by Category</p>
					{@const maxCatCost = Math.max(...detail.costs.map((c) => c.total), 1)}
					<div class="space-y-1.5 mb-3">
						{#each detail.costs as cat}
							<div class="flex items-center gap-2">
								<span class="text-[8px] text-text-muted w-16 flex-none">{cat.category}</span>
								<div class="flex-1 h-1 rounded-full bg-border-card overflow-hidden">
									<div
										class="h-full rounded-full"
										style="width: {(cat.total / maxCatCost) * 100}%; background: rgba(107, 140, 168, 0.7);"
									></div>
								</div>
								<span class="text-[8px] font-medium text-text-secondary w-14 text-right flex-none"
									>${Math.round(cat.total).toLocaleString()}</span
								>
							</div>
						{/each}
					</div>
				{:else if activeTab === 'solvent'}
					{#if detail.stage2}
						<div class="grid grid-cols-2 gap-2 mb-3">
							<div class="bg-bg-input rounded p-2">
								<p class="text-[7px] text-text-muted/40 uppercase">Issued</p>
								<p class="text-sm font-bold text-text-primary">{detail.stage2.etoh_vol_L?.toFixed(0)} L</p>
							</div>
							<div class="bg-bg-input rounded p-2">
								<p class="text-[7px] text-text-muted/40 uppercase">Recovered</p>
								<p class="text-sm font-bold" style="color: #8BAA7C;">{detail.stage2.etoh_recovered_L?.toFixed(0)} L</p>
							</div>
							<div class="bg-bg-input rounded p-2">
								<p class="text-[7px] text-text-muted/40 uppercase">Lost</p>
								<p class="text-sm font-bold" style="color: #C4896A;">{detail.stage2.etoh_lost_L?.toFixed(0)} L</p>
							</div>
							<div class="bg-bg-input rounded p-2">
								<p class="text-[7px] text-text-muted/40 uppercase">Recovery</p>
								<p class="text-sm font-bold text-text-primary">{detail.stage2.etoh_recovery_pct?.toFixed(1)}%</p>
								<p class="text-[7px] text-text-muted/40">Target: 95%</p>
							</div>
						</div>

						<!-- Reactor details -->
						{#if detail.reactors.length > 0}
							<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">Reactors</p>
							<div class="space-y-1 mb-3">
								{#each detail.reactors as reactor}
									<div class="flex items-center gap-2 text-[8px] text-text-muted">
										<span class="font-medium text-text-secondary">R{reactor.reactor_number}</span>
										<span>{reactor.powder_mass_kg}kg</span>
										<span>{reactor.ethanol_70_volume_l}L</span>
										<span>{reactor.temperature_c}°C</span>
										<span>{reactor.soak_time_min}min</span>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Limonene -->
						{#if detail.stage3}
							<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1">D-Limonene</p>
							<div class="flex gap-3 text-[8px] text-text-muted">
								<span>Used: {detail.stage3.dlimo_vol_L}L</span>
								<span>Recovered: {detail.stage3.dlimo_recovered_L}L</span>
								<span style="color: #C4896A;">Lost: {detail.stage3.dlimo_lost_L}L</span>
							</div>
						{/if}
					{:else}
						<div class="flex flex-col items-center justify-center py-8 text-text-muted/40">
							<span class="material-symbols-outlined text-[24px] mb-1">water_drop</span>
							<span class="text-[9px]">No solvent data yet</span>
						</div>
					{/if}
				{:else if activeTab === 'quality'}
					<!-- Yield cascade -->
					<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">Material Flow</p>
					<div class="space-y-0 mb-3">
						<div class="flex items-center gap-1.5">
							<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.9);"></span>
							<span class="text-[8px] text-text-muted flex-1">Leaf Input</span>
							<span class="text-[8px] font-medium text-text-secondary">{detail.batch.leaf_input_kg} kg</span>
						</div>
						{#if detail.stage1?.powder_output_kg}
							<div class="flex items-center gap-1.5 py-px">
								<div class="w-1 flex justify-center">
									<div class="w-px h-2" style="background: rgba(139, 170, 124, 0.25);"></div>
								</div>
								<span class="text-[7px] text-text-muted/35">{detail.stage1.powder_yield_pct}%</span>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.6);"></span>
								<span class="text-[8px] text-text-muted flex-1">Powder</span>
								<span class="text-[8px] font-medium text-text-secondary">{detail.stage1.powder_output_kg} kg</span>
							</div>
						{/if}
						{#if detail.stage2?.crude_extract_wt_kg}
							<div class="flex items-center gap-1.5 py-px">
								<div class="w-1 flex justify-center">
									<div class="w-px h-2" style="background: rgba(139, 170, 124, 0.25);"></div>
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.4);"></span>
								<span class="text-[8px] text-text-muted flex-1">Extract</span>
								<span class="text-[8px] font-medium text-text-secondary">{detail.stage2.crude_extract_wt_kg} kg</span>
							</div>
						{/if}
						{#if detail.stage4?.final_product_g}
							<div class="flex items-center gap-1.5 py-px">
								<div class="w-1 flex justify-center">
									<div class="w-px h-2" style="background: rgba(139, 170, 124, 0.25);"></div>
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<span class="h-1 w-1 rounded-full flex-none" style="background: rgba(139, 170, 124, 0.2);"></span>
								<span class="text-[8px] text-text-muted flex-1">Final Product</span>
								<span class="text-[8px] font-medium text-text-secondary"
									>{(detail.stage4.final_product_g / 1000).toFixed(2)} kg</span
								>
							</div>
						{/if}
					</div>

					<!-- HPLC Profile -->
					{#if detail.labResults.length > 0}
						{@const hplc = detail.labResults.find((r) => r.test_type === 'HPLC' && r.status === 'Completed')}
						{#if hplc}
							<p class="text-[8px] font-medium uppercase tracking-wider text-text-muted/60 mb-1.5">HPLC Profile</p>
							<div class="space-y-1 mb-2">
								<div class="flex justify-between text-[8px]">
									<span class="text-text-muted">Mitragynine</span>
									<span class="font-medium text-text-secondary">{hplc.mitragynine_pct?.toFixed(1)}%</span>
								</div>
								<div class="flex justify-between text-[8px]">
									<span class="text-text-muted">7-OH-M</span>
									<span class="font-medium text-text-secondary">{hplc.hydroxy_mitragynine_pct?.toFixed(1)}%</span>
								</div>
								<div class="flex justify-between text-[8px]">
									<span class="text-text-muted">Purity</span>
									<span class="font-medium text-text-secondary">{hplc.hplc_purity_pct?.toFixed(1)}%</span>
								</div>
							</div>
						{/if}
					{/if}

					<!-- vs Run Average -->
					{#if detail.stage4?.overall_yield_pct && detail.runAvgYield}
						{@const diff = detail.stage4.overall_yield_pct - detail.runAvgYield}
						<div class="flex items-center gap-2 mt-2 pt-2" style="border-top: 1px solid rgba(55, 65, 81, 0.2);">
							<span class="text-[8px] text-text-muted">vs Run Avg Yield:</span>
							<span class="text-[8px] font-medium" style="color: {diff >= 0 ? '#8BAA7C' : '#C4896A'};"
								>{diff >= 0 ? '+' : ''}{diff.toFixed(2)}%</span
							>
						</div>
					{/if}
				{:else if activeTab === 'deviations'}
					{#if detail.deviations.length === 0}
						<div class="flex flex-col items-center justify-center py-8 text-text-muted/40">
							<span class="material-symbols-outlined text-[24px] mb-1">check_circle</span>
							<span class="text-[9px]">No deviations recorded</span>
						</div>
					{:else}
						<div class="space-y-2">
							{#each detail.deviations as dev}
								<div class="bg-bg-input rounded p-2">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-[7px] font-bold uppercase px-1 py-0.5 rounded {severityColor(dev.severity)}"
											>{dev.severity}</span
										>
										<span
											class="text-[7px] font-bold uppercase px-1 py-0.5 rounded {dev.status === 'Open'
												? 'text-red-400 bg-red-900/30'
												: dev.status === 'Resolved' || dev.status === 'Closed'
													? 'text-primary bg-primary/15'
													: 'text-amber-400 bg-amber-900/30'}">{dev.status}</span
										>
										<span class="text-[8px] text-text-muted ml-auto">Stage {dev.stage_number}</span>
									</div>
									<p class="text-[9px] text-text-secondary mb-1">{dev.description}</p>
									{#if dev.parameter}
										<p class="text-[8px] text-text-muted">
											{dev.parameter}: expected {dev.expected_value}, got {dev.actual_value}
										</p>
									{/if}
									{#if dev.corrective_action}
										<p class="text-[8px] text-text-muted mt-1">
											<span class="text-text-muted/40">Fix:</span>
											{dev.corrective_action}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<span class="text-text-muted/40 text-sm">No data</span>
			</div>
		{/if}
	</div>
{/if}
