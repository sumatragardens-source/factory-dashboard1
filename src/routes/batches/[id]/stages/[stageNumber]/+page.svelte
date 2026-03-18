<script lang="ts">
	import { getStageName, STAGE_KEYS } from '$lib/constants/stageNames';
	import { enhance } from '$app/forms';
	import { calculateLeafDryMass, calculateGrindThroughput, calculateDryingLoss, calculateOverallDryYield } from '$lib/calculations/yield';
	import { fmt } from '$lib/config/costs';

	let { data, form } = $props();

	const stageIcons = ['eco', 'science', 'swap_horiz', 'air'];

	// Stage 1 derived calculations
	const s1NetLeaf = $derived(data.stage1?.net_leaf_kg ?? 0);
	const s1Moisture = $derived(data.stage1?.moisture_pct ?? 0);
	const s1PowderOutput = $derived(data.stage1?.powder_output_kg ?? 0);
	const s1Runtime = $derived(data.stage1?.runtime_min ?? 0);
	const leafDryMass = $derived(s1NetLeaf > 0 && s1Moisture > 0 ? calculateLeafDryMass(s1NetLeaf, s1Moisture) : null);
	const grindThroughput = $derived(s1PowderOutput > 0 && s1Runtime > 0 ? calculateGrindThroughput(s1PowderOutput, s1Runtime) : null);

	// Stage 4 derived calculations
	const s4WetPrecip = $derived((data.stage4?.wet_precipitate_g ?? 0) / 1000);
	const s4FinalProduct = $derived((data.stage4?.final_product_g ?? 0) / 1000);
	const dryingLoss = $derived(s4WetPrecip > 0 && s4FinalProduct > 0 ? calculateDryingLoss(s4WetPrecip, s4FinalProduct) : null);
	const overallDryYield = $derived(() => {
		const leafDry = data.stage1?.net_leaf_kg && data.stage1?.moisture_pct != null
			? calculateLeafDryMass(data.stage1.net_leaf_kg, data.stage1.moisture_pct) : 0;
		return s4FinalProduct > 0 && leafDry > 0 ? calculateOverallDryYield(s4FinalProduct, leafDry) : null;
	});

	const inputClass = 'w-full bg-bg-input border-border-card rounded-lg text-sm text-text-primary focus:ring-primary';
	const readonlyClass = 'w-full bg-primary/5 border-none rounded-lg text-sm font-bold text-text-primary focus:ring-primary';
	const highlightClass = 'w-full bg-primary/10 border-primary/30 border-2 rounded-lg text-sm font-black text-text-primary focus:ring-primary';
	const labelClass = 'text-[10px] font-bold uppercase text-text-muted';
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
					<span class="leading-tight">{sn}. {getStageName(sn)}</span>
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
					<h2 class="text-lg font-bold text-text-primary">{getStageName(data.stageNumber)}</h2>
					<div class="flex items-center gap-2 text-xs font-medium text-text-muted ml-4">
						<a href="/batches/{data.batch.id}" class="hover:text-primary">Batch {data.batch.batch_number}</a>
						<span class="material-symbols-outlined text-xs">chevron_right</span>
						<span class="text-text-primary">{getStageName(data.stageNumber)}</span>
					</div>
				</div>
				<div class="flex gap-3">
					<button type="submit" formaction="?/save" class="px-4 py-2 bg-primary/20 text-text-primary rounded text-sm font-bold flex items-center gap-2 hover:bg-primary/30 transition-colors">
						<span class="material-symbols-outlined text-sm">save</span>
						Save Progress
					</button>
				</div>
			</header>

			{#if data.alerts?.length > 0}
				{@const unacked = data.alerts.filter((a: any) => !a.acknowledged)}
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
										<input class={inputClass} type="number" step="0.01" name="gross_leaf_kg" value={data.stage1?.gross_leaf_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Container (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="container_kg" value={data.stage1?.container_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Net Leaf (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="net_leaf_kg" value={data.stage1?.net_leaf_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Moisture (%)</label>
										<input class={inputClass} type="number" step="0.1" name="moisture_pct" value={data.stage1?.moisture_pct ?? ''} />
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
										<input class={inputClass} type="text" name="grinder_id" value={data.stage1?.grinder_id ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Screen (microns)</label>
										<input class={inputClass} type="number" name="screen_microns" value={data.stage1?.screen_microns ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Grind Start</label>
										<input class={inputClass} type="datetime-local" name="grind_start" value={data.stage1?.grind_start ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Grind End</label>
										<input class={inputClass} type="datetime-local" name="grind_end" value={data.stage1?.grind_end ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Runtime (min)</label>
										<input class={inputClass} type="number" name="runtime_min" value={data.stage1?.runtime_min ?? ''} />
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
										<label class={labelClass}>Powder Output (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="powder_output_kg" value={data.stage1?.powder_output_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dust Loss (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="dust_loss_kg" value={data.stage1?.dust_loss_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Retained (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="retained_kg" value={data.stage1?.retained_kg ?? ''} />
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
										<label class={labelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage1?.operator_name ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage1?.notes ?? ''} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 2}
							<!-- Stage 2: Ethanol + Water Extraction -->

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Ethanol Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>EtOH Volume (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="etoh_vol_L" value={data.stage2?.etoh_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Purity (%)</label>
										<input class={inputClass} type="number" step="0.1" name="etoh_purity_pct" value={data.stage2?.etoh_purity_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="extract_temp_C" value={data.stage2?.extract_temp_C ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Time (min)</label>
										<input class={inputClass} type="number" name="extract_time_min" value={data.stage2?.extract_time_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Extract Cycles</label>
										<input class={inputClass} type="number" name="extract_cycles" value={data.stage2?.extract_cycles ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Agitation (RPM)</label>
										<input class={inputClass} type="number" name="agitation_rpm" value={data.stage2?.agitation_rpm ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Stir Time (min)</label>
										<input class={inputClass} type="number" name="stir_time_min" value={data.stage2?.stir_time_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Settle Time (min)</label>
										<input class={inputClass} type="number" name="settle_time_min" value={data.stage2?.settle_time_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Filtrate Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="filtrate_vol_L" value={data.stage2?.filtrate_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Spent Cake (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="spent_cake_kg" value={data.stage2?.spent_cake_kg ?? ''} />
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
										<label class={labelClass}>EtOH Recovered (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="etoh_recovered_L" value={data.stage2?.etoh_recovered_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Recovery (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.1" name="etoh_recovery_pct" value={data.stage2?.etoh_recovery_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>EtOH Lost (L)</label>
										<input class={inputClass} type="number" step="0.1" name="etoh_lost_L" value={data.stage2?.etoh_lost_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Distill Time (min)</label>
										<input class={inputClass} type="number" name="distill_time_min" value={data.stage2?.distill_time_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Rotovap Vacuum (mbar)</label>
										<input class={inputClass} type="number" name="rotovap_vacuum_mbar" value={data.stage2?.rotovap_vacuum_mbar ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Rotovap Bath (C)</label>
										<input class={inputClass} type="number" step="0.1" name="rotovap_bath_C" value={data.stage2?.rotovap_bath_C ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Crude Aqueous Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="crude_aqueous_vol_L" value={data.stage2?.crude_aqueous_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Crude Extract Wt (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="crude_extract_wt_kg" value={data.stage2?.crude_extract_wt_kg ?? ''} />
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
										<input class={inputClass} type="number" step="0.1" name="water_vol_L" value={data.stage2?.water_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="water_temp_C" value={data.stage2?.water_temp_C ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Time (min)</label>
										<input class={inputClass} type="number" name="water_time_min" value={data.stage2?.water_time_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Cycles</label>
										<input class={inputClass} type="number" name="water_cycles" value={data.stage2?.water_cycles ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Filtrate (L)</label>
										<input class={inputClass} type="number" step="0.1" name="water_filtrate_L" value={data.stage2?.water_filtrate_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Spent Cake (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="water_spent_cake_kg" value={data.stage2?.water_spent_cake_kg ?? ''} />
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
										<label class={labelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage2?.operator_name ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage2?.notes ?? ''} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 3}
							<!-- Stage 3: Basification + Back-Extraction -->

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Basification
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Initial pH</label>
										<input class={inputClass} type="number" step="0.1" name="initial_ph" value={data.stage3?.initial_ph ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>NaOH Added (g)</label>
										<input class={inputClass} type="number" step="0.1" name="naoh_added_g" value={data.stage3?.naoh_added_g ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Basified pH</label>
										<input class={highlightClass} type="number" step="0.1" name="basified_ph" value={data.stage3?.basified_ph ?? ''} />
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
										<label class={labelClass}>D-Limonene Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="dlimo_vol_L" value={data.stage3?.dlimo_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Partition Cycles</label>
										<input class={inputClass} type="number" name="partition_cycles" value={data.stage3?.partition_cycles ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Settling (min)</label>
										<input class={inputClass} type="number" name="settling_min" value={data.stage3?.settling_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Organic Phase (mL)</label>
										<input class={inputClass} type="number" step="0.1" name="organic_phase_mL" value={data.stage3?.organic_phase_mL ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Aqueous Waste (L)</label>
										<input class={inputClass} type="number" step="0.1" name="aqueous_waste_L" value={data.stage3?.aqueous_waste_L ?? ''} />
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
										<input class={inputClass} type="text" name="acetic_conc" value={data.stage3?.acetic_conc ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acetic Water Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acetic_water_vol_L" value={data.stage3?.acetic_water_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acetic Pure Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acetic_pure_vol_L" value={data.stage3?.acetic_pure_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Back-Ext Cycles</label>
										<input class={inputClass} type="number" name="backext_cycles" value={data.stage3?.backext_cycles ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Back-Ext Settle (min)</label>
										<input class={inputClass} type="number" name="backext_settle_min" value={data.stage3?.backext_settle_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Recovered (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="dlimo_recovered_L" value={data.stage3?.dlimo_recovered_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Lost (L)</label>
										<input class={inputClass} type="number" step="0.1" name="dlimo_lost_L" value={data.stage3?.dlimo_lost_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>D-Limonene Loss (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.1" name="dlimo_loss_pct" value={data.stage3?.dlimo_loss_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acidic Aqueous Vol (L)</label>
										<input class={inputClass} type="number" step="0.1" name="acidic_aq_vol_L" value={data.stage3?.acidic_aq_vol_L ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acidic pH</label>
										<input class={inputClass} type="number" step="0.1" name="acidic_ph" value={data.stage3?.acidic_ph ?? ''} />
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
										<label class={labelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage3?.operator_name ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage3?.notes ?? ''} />
									</div>
								</div>
							</section>

						{:else if data.stageNumber === 4}
							<!-- Stage 4: Precipitation + Drying -->

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">filter_drama</span>
									Precipitation
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>K2CO3 Added (g)</label>
										<input class={inputClass} type="number" step="0.1" name="k2co3_added_g" value={data.stage4?.k2co3_added_g ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitation pH</label>
										<input class={inputClass} type="number" step="0.1" name="precip_ph" value={data.stage4?.precip_ph ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitation Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="precip_temp_C" value={data.stage4?.precip_temp_C ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Wet Precipitate (g)</label>
										<input class={highlightClass} type="number" step="0.1" name="wet_precipitate_g" value={data.stage4?.wet_precipitate_g ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Wash Volume (mL)</label>
										<input class={inputClass} type="number" step="0.1" name="wash_vol_mL" value={data.stage4?.wash_vol_mL ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Wash Cycles</label>
										<input class={inputClass} type="number" name="wash_cycles" value={data.stage4?.wash_cycles ?? ''} />
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
										<input class={inputClass} type="text" name="dry_method" value={data.stage4?.dry_method ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dry Temp (C)</label>
										<input class={inputClass} type="number" step="0.1" name="dry_temp_C" value={data.stage4?.dry_temp_C ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dry Time (hr)</label>
										<input class={inputClass} type="number" step="0.1" name="dry_time_hr" value={data.stage4?.dry_time_hr ?? ''} />
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
										<label class={labelClass}>Final Product (g)</label>
										<input class={highlightClass} type="number" step="0.1" name="final_product_g" value={data.stage4?.final_product_g ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Final Moisture (%)</label>
										<input class={inputClass} type="number" step="0.1" name="final_moisture_pct" value={data.stage4?.final_moisture_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Overall Yield (%)</label>
										<input class={readonlyClass} readonly type="number" step="0.01" name="overall_yield_pct" value={data.stage4?.overall_yield_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Batch Duration (hr)</label>
										<input class={inputClass} type="number" step="0.1" name="batch_duration_hr" value={data.stage4?.batch_duration_hr ?? ''} />
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
										<label class={labelClass}>Operator Name</label>
										<input class={inputClass} type="text" name="operator_name" value={data.stage4?.operator_name ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Notes</label>
										<input class={inputClass} type="text" name="notes" value={data.stage4?.notes ?? ''} />
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
									</div>
								</div>

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
					<button type="submit" formaction="?/finalize" class="bg-primary text-text-primary px-8 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:brightness-110 transition-all">Finalize Stage</button>
				</div>
			</footer>
		</form>
	</main>
</div>
