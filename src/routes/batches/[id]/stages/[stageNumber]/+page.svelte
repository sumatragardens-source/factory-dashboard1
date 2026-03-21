<script lang="ts">
	import { getProcessStageName, STAGE_KEYS } from '$lib/constants/stageNames';
	import { enhance } from '$app/forms';
	import { calculateLeafDryMass, calculateGrindThroughput, calculateDryingLoss, calculateOverallDryYield } from '$lib/calculations/yield';
	import { fmt } from '$lib/config/costs';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: any } = $props();

	const stageIcons = ['eco', 'science', 'swap_horiz', 'air'];

	// Stage 1 derived calculations
	const s1NetLeaf = $derived(data.stage1?.net_leaf_kg ?? 0);
	const s1Moisture = $derived(data.stage1?.moisture_pct ?? 0);
	const s1PowderOutput = $derived(data.stage1?.powder_output_kg ?? 0);
	const s1Runtime = $derived(data.stage1?.runtime_min ?? 0);
	const leafDryMass = $derived(s1NetLeaf > 0 && s1Moisture > 0 ? calculateLeafDryMass(s1NetLeaf, s1Moisture) : null);
	const grindThroughput = $derived(s1PowderOutput > 0 && s1Runtime > 0 ? calculateGrindThroughput(s1PowderOutput, s1Runtime) : null);

	// Stage 2 derived calculations
	const ssRatio = $derived(
		(data.stage2?.etoh_vol_L && data.stage1?.powder_output_kg)
			? data.stage2.etoh_vol_L / data.stage1.powder_output_kg
			: null
	);
	const etohLost = $derived(
		(data.stage2?.etoh_vol_L && data.stage2?.etoh_recovered_L)
			? data.stage2.etoh_vol_L - data.stage2.etoh_recovered_L
			: null
	);
	const etohRecoveryPct = $derived(
		(data.stage2?.etoh_vol_L && data.stage2?.etoh_recovered_L && data.stage2.etoh_vol_L > 0)
			? (data.stage2.etoh_recovered_L / data.stage2.etoh_vol_L) * 100
			: null
	);

	// Intermediate yield calculations
	const crudeYieldPct = $derived(
		(data.stage2?.crude_extract_wt_kg && data.stage1?.powder_output_kg && data.stage1.powder_output_kg > 0)
			? (data.stage2.crude_extract_wt_kg / data.stage1.powder_output_kg) * 100
			: null
	);
	const powderRetentionPct = $derived(
		(data.stage1?.powder_output_kg && data.batch?.leaf_input_kg && data.batch.leaf_input_kg > 0)
			? (data.stage1.powder_output_kg / data.batch.leaf_input_kg) * 100
			: null
	);

	// Stage 4 derived calculations
	const s4WetPrecip = $derived((data.stage4?.wet_precipitate_g ?? 0) / 1000);
	const s4FinalProduct = $derived((data.stage4?.final_product_g ?? 0) / 1000);
	const dryingLoss = $derived(s4WetPrecip > 0 && s4FinalProduct > 0 ? calculateDryingLoss(s4WetPrecip, s4FinalProduct) : null);
	const overallDryYield = $derived(() => {
		const leafDry = data.stage1?.net_leaf_kg && data.stage1?.moisture_pct != null
			? calculateLeafDryMass(data.stage1.net_leaf_kg, data.stage1.moisture_pct) : 0;
		return s4FinalProduct > 0 && leafDry > 0 ? calculateOverallDryYield(s4FinalProduct, leafDry) : null;
	});

	const currentStage = $derived(data.stages.find((s) => s.stage_number === data.stageNumber));
	const isFinalized = $derived(currentStage?.status === 'Finalized');

	const disabledClass = 'w-full bg-bg-input/50 border-border-card rounded-lg text-sm text-text-muted cursor-not-allowed';
	const inputClass = $derived(isFinalized ? disabledClass : 'w-full bg-bg-input border-border-card rounded-lg text-sm text-text-primary focus:ring-primary');
	const readonlyClass = 'w-full bg-primary/5 border-none rounded-lg text-sm font-bold text-text-primary focus:ring-primary';
	const highlightClass = $derived(isFinalized ? disabledClass : 'w-full bg-primary/10 border-primary/30 border-2 rounded-lg text-sm font-black text-text-primary focus:ring-primary');
	const labelClass = 'text-[10px] font-bold uppercase text-text-muted';
	const reqLabelClass = "text-[10px] font-bold uppercase text-text-muted after:content-['*'] after:text-red-400 after:ml-0.5";
	const sectionClass = 'bg-bg-card p-6 rounded-xl border border-border-card shadow-sm';
	const headingClass = 'text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2';
</script>

<div class="flex h-full overflow-hidden">
	<!-- Stage Sidebar -->
	<aside class="w-72 flex-shrink-0 border-r border-border-card bg-bg-page flex flex-col h-full">
		<div class="p-6">
			<p class="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Current Batch</p>
			<p class="text-sm font-bold text-text-primary">{data.batch.batch_number}</p>
			<p class="text-xs text-text-muted mt-1">{data.batch.supplier}</p>
		</div>
		<nav class="flex flex-col gap-1 px-4">
			{#each STAGE_KEYS as sn, i}
				{@const isActive = sn === data.stageNumber}
				<a
					href="/batches/{data.batch.id}/stages/{sn}"
					class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors
						{isActive ? 'bg-primary text-text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-bg-card-hover cursor-pointer'}"
				>
					<span class="material-symbols-outlined">{stageIcons[i]}</span>
					<span class="leading-tight">{sn}. {getProcessStageName(sn)}</span>
				</a>
			{/each}
		</nav>
		<div class="mt-auto p-6 border-t border-border-card">
			<div class="flex items-center gap-3 px-3 py-2">
				<span class="material-symbols-outlined text-primary">account_circle</span>
				<div>
					<p class="text-sm font-bold text-text-primary">{data.batch.operator_name ?? 'Unassigned'}</p>
					<p class="text-xs text-text-muted">Operator</p>
				</div>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 flex flex-col h-full overflow-hidden">
		<form method="POST" use:enhance class="flex-1 flex flex-col h-full overflow-hidden">
			<header class="h-16 border-b border-border-card px-8 flex items-center justify-between bg-bg-card/80 backdrop-blur-md shrink-0">
				<div class="flex items-center gap-4">
					<span class="material-symbols-outlined text-primary">{stageIcons[data.stageNumber - 1]}</span>
					<h2 class="text-lg font-bold text-text-primary">{getProcessStageName(data.stageNumber)}</h2>
					<div class="flex items-center gap-2 text-xs font-medium text-text-muted ml-4">
						<a href="/batches/{data.batch.id}" class="hover:text-primary">Batch {data.batch.batch_number}</a>
						<span class="material-symbols-outlined text-xs">chevron_right</span>
						<span class="text-text-primary">{getProcessStageName(data.stageNumber)}</span>
					</div>
					{#if isFinalized}
						<span class="ml-2 px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
							<span class="material-symbols-outlined text-xs">lock</span>
							Finalized
						</span>
					{/if}
				</div>
				{#if !isFinalized}
					<div class="flex gap-3">
						<button type="submit" formaction="?/save" class="px-4 py-2 bg-primary/20 text-text-primary rounded text-sm font-bold flex items-center gap-2 hover:bg-primary/30 transition-colors">
							<span class="material-symbols-outlined text-sm">save</span>
							Save Progress
						</button>
					</div>
				{/if}
			</header>

			{#if data.alerts?.length > 0}
				{@const unacked = data.alerts.filter((a) => !a.acknowledged)}
				{#if unacked.length > 0}
					<div class="mx-8 mt-4 space-y-2">
						{#each unacked as alert}
							<div class="flex items-center justify-between p-3 rounded-lg border text-sm
								{alert.severity === 'High' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
								 alert.severity === 'Medium' ? 'bg-amber-900/20 border-amber-500/30 text-amber-400' :
								 'bg-blue-900/20 border-blue-500/30 text-blue-400'}">
								<div class="flex items-center gap-2">
									<span class="material-symbols-outlined text-sm">
										{alert.severity === 'High' ? 'error' : alert.severity === 'Medium' ? 'warning' : 'info'}
									</span>
									<span class="font-bold">{alert.alert_type}</span>
									<span>{alert.message}</span>
									<span class="text-xs opacity-70">({alert.actual_value} vs {alert.threshold})</span>
								</div>
								<form method="POST" action="?/acknowledge" use:enhance>
									<input type="hidden" name="alert_id" value={alert.id} />
									<input type="hidden" name="acknowledged_by" value={data.batch.operator_name ?? 'Operator'} />
									<button type="submit" class="text-xs font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20">Acknowledge</button>
								</form>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

			{#if form?.errors}
				<div class="mx-8 mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
					{#each form.errors as err}
						<p class="text-sm text-red-400">{err}</p>
					{/each}
				</div>
			{/if}
			{#if form?.success && !form?.finalized}
				<div class="mx-8 mt-4 p-3 bg-primary/20 border border-primary/30 rounded-lg">
					<p class="text-sm text-primary font-bold">Progress saved successfully.</p>
				</div>
			{/if}
			{#if form?.finalized}
				<div class="mx-8 mt-4 p-3 bg-primary/20 border border-primary/30 rounded-lg">
					<p class="text-sm text-primary font-bold">Stage finalized! Batch advanced to next stage.</p>
				</div>
			{/if}

			<div class="flex-1 overflow-y-auto p-8 no-scrollbar">
				<div class="grid grid-cols-12 gap-8 max-w-7xl mx-auto">
					<!-- Form Content -->
					<div class="col-span-8 flex flex-col gap-8">
						{#if data.stageNumber === 1}
							<!-- Stage 1: Raw Leaf to Powder -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">fingerprint</span>
									Batch Identification
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Batch Number</label>
										<input class={readonlyClass} readonly type="text" value={data.batch.batch_number} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Supplier Lot</label>
										<input class={readonlyClass} readonly type="text" value={data.batch.supplier_lot ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Lot Position</label>
										<input class={readonlyClass} readonly type="text" value={data.batch.lot_position ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">scale</span>
									Raw Leaf Measurements
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Gross Leaf (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="gross_leaf_kg" value={data.stage1?.gross_leaf_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Container (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="container_kg" value={data.stage1?.container_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={reqLabelClass}>Net Leaf (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="net_leaf_kg" value={data.stage1?.net_leaf_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Moisture (%)</label>
										<input class={inputClass} type="number" step="0.1" name="moisture_pct" value={data.stage1?.moisture_pct ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dry Mass (kg)</label>
										<input class={readonlyClass} readonly type="number" step="0.01" name="dry_mass_kg" value={data.stage1?.dry_mass_kg ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">precision_manufacturing</span>
									Grinder Settings
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Grinder ID</label>
										<input class={inputClass} type="text" name="grinder_id" value={data.stage1?.grinder_id ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Screen (microns)</label>
										<input class={inputClass} type="number" name="screen_microns" value={data.stage1?.screen_microns ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Grind Start</label>
										<input class={inputClass} type="datetime-local" name="grind_start" value={data.stage1?.grind_start ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Grind End</label>
										<input class={inputClass} type="datetime-local" name="grind_end" value={data.stage1?.grind_end ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Runtime (min)</label>
										<input class={inputClass} type="number" name="runtime_min" value={data.stage1?.runtime_min ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">inventory_2</span>
									Outputs
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Powder Output (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="powder_output_kg" value={data.stage1?.powder_output_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dust Loss (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="dust_loss_kg" value={data.stage1?.dust_loss_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Retained (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="retained_kg" value={data.stage1?.retained_kg ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Mass Balance Error (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.1" name="mass_balance_err_pct" value={data.stage1?.mass_balance_err_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Throughput (kg/hr)</label>
										<input class={readonlyClass} readonly type="number" step="0.01" name="throughput_kg_hr" value={data.stage1?.throughput_kg_hr ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">person</span>
									Operator
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage1?.operator_name ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage1?.notes ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 2}
							<!-- Stage 2: Ethanol + Water Extraction -->

							<!-- Carry-forward from Stage 1 -->
							<div class="mb-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
								<h4 class="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">
									<span class="material-symbols-outlined text-xs align-middle mr-1">input</span>
									From Stage 1: Raw Leaf to Powder
								</h4>
								{#if data.stage1 && data.stages.find((s) => s.stage_number === 1)?.status === 'Finalized'}
									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
										<div><p class="text-[10px] text-text-muted">Net Leaf</p><p class="text-sm font-bold text-text-primary">{data.stage1.net_leaf_kg} kg</p></div>
										<div><p class="text-[10px] text-text-muted">Powder Output</p><p class="text-sm font-bold text-text-primary">{data.stage1.powder_output_kg} kg</p></div>
										<div><p class="text-[10px] text-text-muted">Moisture</p><p class="text-sm font-bold text-text-primary">{data.stage1.moisture_pct}%</p></div>
										<div><p class="text-[10px] text-text-muted">Dust Loss</p><p class="text-sm font-bold text-text-primary">{data.stage1.dust_loss_kg} kg</p></div>
									</div>
								{:else}
									<p class="text-xs text-text-muted italic">Stage 1 not yet finalized</p>
								{/if}
							</div>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Ethanol Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>EtOH Volume (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="etoh_vol_L" value={data.stage2?.etoh_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Purity (%)</label>
										<input class={inputClass} type="number" step="0.1" name="etoh_purity_pct" value={data.stage2?.etoh_purity_pct ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="extract_temp_C" value={data.stage2?.extract_temp_C ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Time (min)</label>
										<input class={inputClass} type="number" name="extract_time_min" value={data.stage2?.extract_time_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Cycles</label>
										<input class={inputClass} type="number" name="extract_cycles" value={data.stage2?.extract_cycles ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Agitation (RPM)</label>
										<input class={inputClass} type="number" name="agitation_rpm" value={data.stage2?.agitation_rpm ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Stir Time (min)</label>
										<input class={inputClass} type="number" name="stir_time_min" value={data.stage2?.stir_time_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Settle Time (min)</label>
										<input class={inputClass} type="number" name="settle_time_min" value={data.stage2?.settle_time_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Filtrate Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="filtrate_vol_L" value={data.stage2?.filtrate_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Spent Cake (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="spent_cake_kg" value={data.stage2?.spent_cake_kg ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">settings</span>
									Distillation / Recovery
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>EtOH Recovered (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="etoh_recovered_L" value={data.stage2?.etoh_recovered_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Recovery (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.1" name="etoh_recovery_pct" value={data.stage2?.etoh_recovery_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Lost (L)</label>
										<input class={inputClass} type="number" step="0.1" name="etoh_lost_L" value={data.stage2?.etoh_lost_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Distill Time (min)</label>
										<input class={inputClass} type="number" name="distill_time_min" value={data.stage2?.distill_time_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Rotovap Vacuum (mbar)</label>
										<input class={inputClass} type="number" name="rotovap_vacuum_mbar" value={data.stage2?.rotovap_vacuum_mbar ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Rotovap Bath (C)</label>
										<input class={inputClass} type="number" step="0.1" name="rotovap_bath_C" value={data.stage2?.rotovap_bath_C ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Crude Aqueous Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="crude_aqueous_vol_L" value={data.stage2?.crude_aqueous_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={reqLabelClass}>Crude Extract Wt (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="crude_extract_wt_kg" value={data.stage2?.crude_extract_wt_kg ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">water_drop</span>
									Water Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Water Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="water_vol_L" value={data.stage2?.water_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="water_temp_C" value={data.stage2?.water_temp_C ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Time (min)</label>
										<input class={inputClass} type="number" name="water_time_min" value={data.stage2?.water_time_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Cycles</label>
										<input class={inputClass} type="number" name="water_cycles" value={data.stage2?.water_cycles ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Filtrate (L)</label>
										<input class={inputClass} type="number" step="0.1" name="water_filtrate_L" value={data.stage2?.water_filtrate_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Spent Cake (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="water_spent_cake_kg" value={data.stage2?.water_spent_cake_kg ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">person</span>
									Operator
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage2?.operator_name ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage2?.notes ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 3}
							<!-- Stage 3: Basification + Back-Extraction -->

							<!-- Carry-forward from Stage 2 -->
							<div class="mb-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
								<h4 class="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">
									<span class="material-symbols-outlined text-xs align-middle mr-1">input</span>
									From Stage 2: Ethanol Extraction
								</h4>
								{#if data.stage2 && data.stages.find((s) => s.stage_number === 2)?.status === 'Finalized'}
									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
										<div><p class="text-[10px] text-text-muted">Crude Extract</p><p class="text-sm font-bold text-text-primary">{data.stage2.crude_extract_wt_kg} kg</p></div>
										<div><p class="text-[10px] text-text-muted">EtOH Issued</p><p class="text-sm font-bold text-text-primary">{data.stage2.etoh_vol_L} L</p></div>
										<div><p class="text-[10px] text-text-muted">EtOH Recovered</p><p class="text-sm font-bold text-text-primary">{data.stage2.etoh_recovered_L} L</p></div>
										<div><p class="text-[10px] text-text-muted">Recovery %</p><p class="text-sm font-bold text-text-primary">{data.stage2.etoh_recovery_pct}%</p></div>
									</div>
								{:else}
									<p class="text-xs text-text-muted italic">Stage 2 not yet finalized</p>
								{/if}
							</div>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Basification
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Initial pH</label>
										<input class={inputClass} type="number" step="0.1" name="initial_ph" value={data.stage3?.initial_ph ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>NaOH Added (g)</label>
										<input class={inputClass} type="number" step="0.1" name="naoh_added_g" value={data.stage3?.naoh_added_g ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Basified pH</label>
										<input class={highlightClass} type="number" step="0.1" name="basified_ph" value={data.stage3?.basified_ph ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">layers</span>
									D-Limonene Partition
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>D-Limonene Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="dlimo_vol_L" value={data.stage3?.dlimo_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Partition Cycles</label>
										<input class={inputClass} type="number" name="partition_cycles" value={data.stage3?.partition_cycles ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Settling (min)</label>
										<input class={inputClass} type="number" name="settling_min" value={data.stage3?.settling_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Organic Phase (mL)</label>
										<input class={inputClass} type="number" step="0.1" name="organic_phase_mL" value={data.stage3?.organic_phase_mL ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Aqueous Waste (L)</label>
										<input class={inputClass} type="number" step="0.1" name="aqueous_waste_L" value={data.stage3?.aqueous_waste_L ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">swap_horiz</span>
									Acetic Acid Back-Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Acetic Concentration</label>
										<input class={inputClass} type="text" name="acetic_conc" value={data.stage3?.acetic_conc ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acetic Water Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acetic_water_vol_L" value={data.stage3?.acetic_water_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acetic Pure Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acetic_pure_vol_L" value={data.stage3?.acetic_pure_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Back-Ext Cycles</label>
										<input class={inputClass} type="number" name="backext_cycles" value={data.stage3?.backext_cycles ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Back-Ext Settle (min)</label>
										<input class={inputClass} type="number" name="backext_settle_min" value={data.stage3?.backext_settle_min ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Recovered (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="dlimo_recovered_L" value={data.stage3?.dlimo_recovered_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Lost (L)</label>
										<input class={inputClass} type="number" step="0.1" name="dlimo_lost_L" value={data.stage3?.dlimo_lost_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Loss (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.1" name="dlimo_loss_pct" value={data.stage3?.dlimo_loss_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acidic Aqueous Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acidic_aq_vol_L" value={data.stage3?.acidic_aq_vol_L ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acidic pH</label>
										<input class={inputClass} type="number" step="0.1" name="acidic_ph" value={data.stage3?.acidic_ph ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">person</span>
									Operator
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage3?.operator_name ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage3?.notes ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 4}
							<!-- Stage 4: Precipitation + Drying -->

							<!-- Carry-forward from Stage 3 -->
							<div class="mb-4 bg-primary/5 border border-primary/15 rounded-xl p-4">
								<h4 class="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">
									<span class="material-symbols-outlined text-xs align-middle mr-1">input</span>
									From Stage 3: Acid/Base Extraction
								</h4>
								{#if data.stage3 && data.stages.find((s) => s.stage_number === 3)?.status === 'Finalized'}
									<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
										<div><p class="text-[10px] text-text-muted">D-Limo Issued</p><p class="text-sm font-bold text-text-primary">{data.stage3.dlimo_vol_L} L</p></div>
										<div><p class="text-[10px] text-text-muted">D-Limo Recovered</p><p class="text-sm font-bold text-text-primary">{data.stage3.dlimo_recovered_L} L</p></div>
										<div><p class="text-[10px] text-text-muted">Acidic Aq Vol</p><p class="text-sm font-bold text-text-primary">{data.stage3.acidic_aq_vol_L} L</p></div>
										<div><p class="text-[10px] text-text-muted">Organic Phase</p><p class="text-sm font-bold text-text-primary">{data.stage3.organic_phase_mL} mL</p></div>
									</div>
								{:else}
									<p class="text-xs text-text-muted italic">Stage 3 not yet finalized</p>
								{/if}
							</div>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">filter_drama</span>
									Precipitation
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>K2CO3 Added (g)</label>
										<input class={inputClass} type="number" step="0.1" name="k2co3_added_g" value={data.stage4?.k2co3_added_g ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitation pH</label>
										<input class={inputClass} type="number" step="0.1" name="precip_ph" value={data.stage4?.precip_ph ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitation Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="precip_temp_C" value={data.stage4?.precip_temp_C ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={reqLabelClass}>Wet Precipitate (g)</label>
										<input class={highlightClass} type="number" step="0.1" name="wet_precipitate_g" value={data.stage4?.wet_precipitate_g ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Wash Volume (mL)</label>
										<input class={inputClass} type="number" step="0.1" name="wash_vol_mL" value={data.stage4?.wash_vol_mL ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Wash Cycles</label>
										<input class={inputClass} type="number" name="wash_cycles" value={data.stage4?.wash_cycles ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">thermostat</span>
									Drying Parameters
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Dry Method</label>
										<input class={inputClass} type="text" name="dry_method" value={data.stage4?.dry_method ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dry Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="dry_temp_C" value={data.stage4?.dry_temp_C ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dry Time (hr)</label>
										<input class={inputClass} type="number" step="0.1" name="dry_time_hr" value={data.stage4?.dry_time_hr ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">package_2</span>
									Final Product
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Final Product (g)</label>
										<input class={highlightClass} type="number" step="0.1" name="final_product_g" value={data.stage4?.final_product_g ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Final Moisture (%)</label>
										<input class={inputClass} type="number" step="0.1" name="final_moisture_pct" value={data.stage4?.final_moisture_pct ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Overall Yield (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.01" name="overall_yield_pct" value={data.stage4?.overall_yield_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Batch Duration (hr)</label>
										<input class={inputClass} type="number" step="0.1" name="batch_duration_hr" value={data.stage4?.batch_duration_hr ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">person</span>
									Operator
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={reqLabelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage4?.operator_name ?? ''} disabled={isFinalized} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage4?.notes ?? ''} disabled={isFinalized} />
									</div>
								</div>
							</section>
						{/if}
					</div>

					<!-- Right Column: Calculated Results -->
					<div class="col-span-4 flex flex-col gap-6">
						<div class="sticky top-0">
							{#if data.stageNumber === 1 && data.stage1}
								<div class="bg-bg-card text-text-primary p-8 rounded-xl border border-primary/40 shadow-xl relative overflow-hidden">
									<div class="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
									<h3 class="text-xs font-black uppercase tracking-widest text-primary mb-8">Mass Balance Verification</h3>
									<div class="space-y-6 relative z-10">
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Net Leaf Input</p>
												<p class="text-2xl font-black">{data.stage1.net_leaf_kg?.toFixed(2)} <span class="text-xs font-normal text-text-muted">kg</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">trending_down</span>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Powder Output</p>
												<p class="text-2xl font-black">{data.stage1.powder_output_kg?.toFixed(2)} <span class="text-xs font-normal text-text-muted">kg</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">inventory</span>
										</div>
										<div class="flex justify-between items-end bg-primary/10 -mx-4 px-4 py-4 rounded-lg">
											<div>
												<p class="text-[10px] uppercase text-primary font-black">Dust Loss</p>
												<p class="text-3xl font-black text-primary">{data.stage1.dust_loss_kg?.toFixed(2) ?? '0.00'} <span class="text-sm font-normal">kg</span></p>
											</div>
											<div class="text-right">
												<span class="material-symbols-outlined text-amber-400">warning</span>
											</div>
										</div>
										<div class="pt-4 border-t border-border-card">
											<div class="flex justify-between mb-2">
												<span class="text-[10px] uppercase font-bold text-text-muted">Mass Balance Error</span>
												<span class="text-[10px] font-bold {(data.stage1.mass_balance_err_pct ?? 0) <= 2 ? 'text-primary' : 'text-amber-400'}">{data.stage1.mass_balance_err_pct ?? 0}%</span>
											</div>
											<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
												<div class="{(data.stage1.mass_balance_err_pct ?? 0) <= 2 ? 'bg-primary' : 'bg-amber-400'} h-full rounded-full" style="width: {Math.min((data.stage1.mass_balance_err_pct ?? 0) * 20, 100)}%"></div>
											</div>
											<p class="text-[9px] {(data.stage1.mass_balance_err_pct ?? 0) <= 2 ? 'text-primary' : 'text-amber-400'} mt-1">{(data.stage1.mass_balance_err_pct ?? 0) <= 2 ? 'Within tolerance' : 'Above 2% threshold'}</p>
										</div>
									</div>
									{#if leafDryMass}
										<div class="pt-4 border-t border-border-card">
											<div class="flex justify-between items-center">
												<span class="text-[10px] uppercase font-bold text-text-muted">Leaf Dry Mass</span>
												<span class="text-sm font-black text-text-primary">{leafDryMass} <span class="text-xs font-normal text-text-muted">kg</span></span>
											</div>
										</div>
									{/if}
									{#if grindThroughput}
										<div class="pt-4 border-t border-border-card">
											<div class="flex justify-between items-center">
												<span class="text-[10px] uppercase font-bold text-text-muted">Grind Throughput</span>
												<span class="text-sm font-black text-text-primary">{grindThroughput} <span class="text-xs font-normal text-text-muted">kg/hr</span></span>
											</div>
										</div>
									{/if}
								</div>

							{:else if data.stageNumber === 2 && data.stage2}
								<div class="bg-bg-card text-text-primary p-8 rounded-xl border border-primary/40 shadow-xl relative overflow-hidden">
									<div class="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
									<h3 class="text-xs font-black uppercase tracking-widest text-primary mb-8">Extraction Metrics</h3>
									<div class="space-y-6 relative z-10">
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">EtOH Recovery</p>
												<p class="text-2xl font-black">{data.stage2.etoh_recovery_pct ?? '—'} <span class="text-xs font-normal text-text-muted">%</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">restart_alt</span>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">EtOH Lost</p>
												<p class="text-2xl font-black">{data.stage2.etoh_lost_L ?? '—'} <span class="text-xs font-normal text-text-muted">L</span></p>
											</div>
											<span class="material-symbols-outlined text-amber-400 mb-1">water_drop</span>
										</div>
										<div class="flex justify-between items-end bg-primary/10 -mx-4 px-4 py-4 rounded-lg">
											<div>
												<p class="text-[10px] uppercase text-primary font-black">Crude Extract</p>
												<p class="text-3xl font-black text-primary">{data.stage2.crude_extract_wt_kg ?? '—'} <span class="text-sm font-normal">kg</span></p>
											</div>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Filtrate Volume</p>
												<p class="text-2xl font-black">{data.stage2.filtrate_vol_L ?? '—'} <span class="text-xs font-normal text-text-muted">L</span></p>
											</div>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Spent Cake</p>
												<p class="text-2xl font-black">{data.stage2.spent_cake_kg ?? '—'} <span class="text-xs font-normal text-text-muted">kg</span></p>
											</div>
										</div>
										{#if ssRatio}
											<div class="flex justify-between items-end border-b border-border-card pb-4">
												<div>
													<p class="text-[10px] uppercase text-text-muted font-bold">Solvent-to-Solid Ratio</p>
													<p class="text-2xl font-black">{ssRatio.toFixed(1)} <span class="text-xs font-normal text-text-muted">: 1</span></p>
												</div>
												<span class="material-symbols-outlined text-primary mb-1">balance</span>
											</div>
										{/if}
									</div>
								</div>

								<!-- Ethanol Balance -->
								{#if data.stage2.etoh_vol_L && etohRecoveryPct != null && etohLost != null}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Ethanol Balance</h4>
										<div class="space-y-3">
											<div class="flex justify-between items-center text-xs">
												<span class="text-text-muted">Issued</span>
												<span class="font-bold text-text-primary">{data.stage2.etoh_vol_L} L</span>
											</div>
											<div class="flex h-3 rounded-full overflow-hidden bg-border-card">
												<div class="bg-primary h-full" style="width: {etohRecoveryPct}%"></div>
												<div class="bg-amber-500 h-full" style="width: {100 - etohRecoveryPct}%"></div>
											</div>
											<div class="flex justify-between items-center text-xs">
												<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-primary"></span> Recovered</span>
												<span class="font-bold text-primary">{data.stage2.etoh_recovered_L} L ({etohRecoveryPct.toFixed(1)}%)</span>
											</div>
											<div class="flex justify-between items-center text-xs">
												<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Lost</span>
												<span class="font-bold text-amber-400">{etohLost.toFixed(1)} L ({(100 - etohRecoveryPct).toFixed(1)}%)</span>
											</div>
										</div>
									</div>
								{/if}

								<!-- Extraction Yield -->
								{#if crudeYieldPct != null}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Extraction Yield</h4>
										<p class="text-2xl font-black text-primary">{crudeYieldPct.toFixed(2)}%</p>
										<p class="text-[10px] text-text-muted mt-1">crude yield from {data.stage1?.powder_output_kg} kg powder</p>
									</div>
								{/if}

							{:else if data.stageNumber === 3 && data.stage3}
								<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm">
									<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">pH Progression</h4>
									<div class="flex items-center justify-between">
										<div class="text-center">
											<p class="text-[10px] uppercase text-text-muted font-bold">Initial</p>
											<p class="text-2xl font-black text-text-primary">{data.stage3.initial_ph ?? '—'}</p>
										</div>
										<span class="material-symbols-outlined text-text-muted">arrow_forward</span>
										<div class="text-center">
											<p class="text-[10px] uppercase text-primary font-bold">Basified</p>
											<p class="text-2xl font-black text-primary">{data.stage3.basified_ph ?? '—'}</p>
										</div>
										<span class="material-symbols-outlined text-text-muted">arrow_forward</span>
										<div class="text-center">
											<p class="text-[10px] uppercase text-amber-400 font-bold">Acidic</p>
											<p class="text-2xl font-black text-amber-400">{data.stage3.acidic_ph ?? '—'}</p>
										</div>
									</div>
								</div>
								<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
									<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">D-Limonene Recovery</h4>
									<div class="grid grid-cols-3 gap-2 text-center">
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Added</p>
											<p class="text-sm font-black text-text-primary">{data.stage3.dlimo_vol_L ?? '—'}L</p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-primary font-bold">Recov.</p>
											<p class="text-sm font-black text-primary">{data.stage3.dlimo_recovered_L ?? '—'}L</p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-red-500 font-bold">Lost</p>
											<p class="text-sm font-black text-red-500">{data.stage3.dlimo_lost_L ?? '—'}L</p>
										</div>
									</div>
									{#if data.stage3.dlimo_loss_pct != null}
										<div class="mt-4 pt-4 border-t border-border-card">
											<div class="flex justify-between mb-2">
												<span class="text-[10px] uppercase font-bold text-text-muted">D-Limonene Loss</span>
												<span class="text-[10px] font-bold {(data.stage3.dlimo_loss_pct ?? 0) <= 10 ? 'text-primary' : 'text-amber-400'}">{data.stage3.dlimo_loss_pct}%</span>
											</div>
											<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
												<div class="{(data.stage3.dlimo_loss_pct ?? 0) <= 10 ? 'bg-primary' : 'bg-amber-400'} h-full rounded-full" style="width: {Math.min(data.stage3.dlimo_loss_pct ?? 0, 100)}%"></div>
											</div>
										</div>
									{/if}
								</div>

								<!-- Cumulative Progress -->
								{#if data.batch?.leaf_input_kg}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Cumulative Progress</h4>
										<div class="space-y-3">
											<div>
												<div class="flex justify-between text-[11px] mb-1">
													<span class="text-text-muted">Leaf input</span>
													<span class="font-bold text-text-primary">{data.batch.leaf_input_kg} kg</span>
												</div>
												<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
													<div class="bg-primary/40 h-full rounded-full" style="width: 100%"></div>
												</div>
											</div>
											{#if data.stage1?.powder_output_kg}
												<div>
													<div class="flex justify-between text-[11px] mb-1">
														<span class="text-text-muted">After grinding</span>
														<span class="font-bold text-text-primary">{data.stage1.powder_output_kg} kg {#if powderRetentionPct}({powderRetentionPct.toFixed(1)}%){/if}</span>
													</div>
													<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
														<div class="bg-primary/60 h-full rounded-full" style="width: {powderRetentionPct ?? 0}%"></div>
													</div>
												</div>
											{/if}
											{#if data.stage2?.crude_extract_wt_kg}
												<div>
													<div class="flex justify-between text-[11px] mb-1">
														<span class="text-text-muted">After extraction</span>
														<span class="font-bold text-text-primary">{data.stage2.crude_extract_wt_kg} kg {#if crudeYieldPct}({crudeYieldPct.toFixed(1)}% of powder){/if}</span>
													</div>
													<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
														<div class="bg-primary h-full rounded-full" style="width: {data.batch.leaf_input_kg > 0 ? (data.stage2.crude_extract_wt_kg / data.batch.leaf_input_kg * 100) : 0}%"></div>
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}

							{:else if data.stageNumber === 4 && data.stage4}
								<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm">
									<h4 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Batch Summary</h4>
									<div class="space-y-4">
										<div class="bg-primary/5 p-4 rounded-lg">
											<p class="text-[10px] uppercase text-primary font-bold">Final Product</p>
											<p class="text-2xl font-black text-text-primary">{data.stage4.final_product_g ?? '—'} <span class="text-xs font-normal text-text-muted">grams</span></p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Wet Precipitate</p>
											<p class="text-xl font-black text-text-primary">{data.stage4.wet_precipitate_g ?? '—'} <span class="text-xs font-normal text-text-muted">grams</span></p>
										</div>
										<div class="bg-primary/10 p-4 rounded-lg border border-primary/30">
											<p class="text-[10px] uppercase text-primary font-bold">Overall Yield</p>
											<p class="text-3xl font-black text-primary">{data.stage4.overall_yield_pct ?? '—'} <span class="text-sm font-normal">%</span></p>
										</div>
										{#if data.stage4.final_moisture_pct != null}
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Final Moisture</p>
												<p class="text-xl font-black text-text-primary">{data.stage4.final_moisture_pct} <span class="text-xs font-normal text-text-muted">%</span></p>
											</div>
										{/if}
										{#if dryingLoss != null}
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Drying Loss</p>
												<p class="text-xl font-black text-text-primary">{dryingLoss} <span class="text-xs font-normal text-text-muted">%</span></p>
											</div>
										{/if}
										{#if overallDryYield() != null}
											<div class="bg-amber-900/10 p-4 rounded-lg border border-amber-500/30">
												<p class="text-[10px] uppercase text-amber-400 font-bold">Overall Dry Yield</p>
												<p class="text-3xl font-black text-amber-400">{overallDryYield()} <span class="text-sm font-normal">%</span></p>
											</div>
										{/if}
										{#if data.stage4.batch_duration_hr}
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Batch Duration</p>
												<p class="text-xl font-black text-text-primary">{data.stage4.batch_duration_hr} <span class="text-xs font-normal text-text-muted">hr</span></p>
											</div>
										{/if}
									</div>
								</div>
								<!-- Full Mass Cascade -->
								{#if data.batch?.leaf_input_kg}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Full Mass Cascade</h4>
										<div class="space-y-2">
											<div class="flex items-center gap-2 text-[11px]">
												<span class="w-3 h-3 rounded bg-primary/30 shrink-0"></span>
												<span class="text-text-muted">Leaf</span>
												<span class="ml-auto font-bold text-text-primary">{data.batch.leaf_input_kg} kg</span>
											</div>
											{#if data.stage1?.powder_output_kg}
												<div class="flex items-center gap-2 text-[11px] pl-2">
													<span class="material-symbols-outlined text-xs text-text-muted">arrow_downward</span>
													<span class="text-text-muted">Powder</span>
													<span class="ml-auto font-bold text-text-primary">{data.stage1.powder_output_kg} kg</span>
													{#if powderRetentionPct}<span class="text-[10px] text-primary">({powderRetentionPct.toFixed(1)}%)</span>{/if}
												</div>
											{/if}
											{#if data.stage2?.crude_extract_wt_kg}
												<div class="flex items-center gap-2 text-[11px] pl-4">
													<span class="material-symbols-outlined text-xs text-text-muted">arrow_downward</span>
													<span class="text-text-muted">Crude</span>
													<span class="ml-auto font-bold text-text-primary">{data.stage2.crude_extract_wt_kg} kg</span>
													{#if crudeYieldPct}<span class="text-[10px] text-primary">({crudeYieldPct.toFixed(1)}%)</span>{/if}
												</div>
											{/if}
											{#if data.stage4?.final_product_g}
												<div class="flex items-center gap-2 text-[11px] pl-6">
													<span class="material-symbols-outlined text-xs text-primary">arrow_downward</span>
													<span class="text-primary font-bold">Final</span>
													<span class="ml-auto font-black text-primary">{(data.stage4.final_product_g / 1000).toFixed(3)} kg</span>
													{#if data.stage4.overall_yield_pct}<span class="text-[10px] text-primary">({data.stage4.overall_yield_pct}%)</span>{/if}
												</div>
											{/if}
										</div>
									</div>
								{/if}

								{#if data.stage4.wet_precipitate_g && data.stage4.final_product_g}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Detailed Metrics</h4>
										<div class="space-y-3">
											<div class="flex justify-between items-center text-xs">
												<span class="text-text-muted">Drying Loss</span>
												<span class="font-bold text-text-primary">{(data.stage4.wet_precipitate_g - data.stage4.final_product_g).toFixed(1)} g</span>
											</div>
											{#if data.totalCost && data.stage4.final_product_g}
												<div class="flex justify-between items-center text-xs border-t border-border-card pt-2 mt-2">
													<span class="text-text-secondary font-bold">Cost per kg</span>
													<span class="font-black text-primary">{fmt(data.totalCost / (data.stage4.final_product_g / 1000))}</span>
												</div>
											{/if}
										</div>
									</div>
								{/if}

							{:else}
								<div class="bg-bg-input p-8 rounded-xl text-center">
									<span class="material-symbols-outlined text-4xl text-text-muted">analytics</span>
									<p class="text-sm text-text-muted mt-2">No data recorded for this stage yet.</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Footer Action Bar -->
			<footer class="h-14 border-t border-border-card px-8 flex items-center justify-between bg-bg-card shrink-0">
				<div class="flex items-center gap-4 text-xs font-bold text-text-muted">
					<span class="flex items-center gap-1"><span class="w-2 h-2 bg-primary rounded-full"></span> SYSTEM ONLINE</span>
				</div>
				<div class="flex gap-4">
					<a href="/batches/{data.batch.id}" class="text-sm font-bold text-text-muted hover:text-text-primary">Back to Batch</a>
					{#if isFinalized}
						<span class="text-sm font-bold text-primary/60 flex items-center gap-1">
							<span class="material-symbols-outlined text-sm">check_circle</span>
							Stage Finalized
						</span>
					{:else}
						<button type="submit" formaction="?/finalize" class="bg-primary text-text-primary px-8 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all">Finalize Stage</button>
					{/if}
				</div>
			</footer>
		</form>
	</main>
</div>
