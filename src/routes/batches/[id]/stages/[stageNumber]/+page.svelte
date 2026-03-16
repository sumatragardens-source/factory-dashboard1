<script lang="ts">
	import { getStageName, STAGE_KEYS } from '$lib/constants/stageNames';
	import { enhance } from '$app/forms';
	import { calculateDilution, calculateSolventRatio, calculateRecoveryPerHour } from '$lib/calculations/dilution';

	let { data, form } = $props();

	const stageIcons = ['energy_savings_leaf', 'biotech', 'science', 'package_2'];

	// Stage 2 reactive state
	let s2Grade = $state(data.stage2?.ethanol_stock_grade_pct ?? 96);
	let s2StockUsed = $state(data.stage2?.ethanol_stock_used_l ?? 0);

	const s2Dilution = $derived(calculateDilution(s2Grade, 70, s2StockUsed));

	// Reactor state for Stage 2
	let reactors = $state(
		[1, 2, 3].map(n => {
			const existing = data.stage2Reactors?.find((r: any) => r.reactor_number === n);
			return {
				reactor_number: n,
				machine_id: existing?.machine_id ?? null,
				temperature_c: existing?.temperature_c ?? null,
				rpm: existing?.rpm ?? null,
				soak_time_min: existing?.soak_time_min ?? null,
				powder_mass_kg: existing?.powder_mass_kg ?? null,
				ethanol_70_volume_l: existing?.ethanol_70_volume_l ?? null,
				solvent_ratio: existing?.solvent_ratio ?? null
			};
		})
	);

	// Rotovap days state for Stage 2
	let rotovapDays = $state(
		data.stage2RotovapDays?.length > 0
			? data.stage2RotovapDays.map((d: any, i: number) => ({ ...d, _idx: i }))
			: [
				{ rotovap_number: 1, machine_id: null, day_number: 1, water_bath_temp_c: null, vacuum_mbar: null, chiller_temp_c: null, rpm: null, run_time_hours: null, ethanol_recovered_l: null, recovery_per_hour_l: null, _idx: 0 }
			]
	);

	function addRotovapDay(rotovapNum: number) {
		const existingDays = rotovapDays.filter((d: any) => d.rotovap_number === rotovapNum);
		const nextDay = existingDays.length + 1;
		rotovapDays = [...rotovapDays, {
			rotovap_number: rotovapNum, machine_id: null, day_number: nextDay,
			water_bath_temp_c: null, vacuum_mbar: null, chiller_temp_c: null, rpm: null,
			run_time_hours: null, ethanol_recovered_l: null, recovery_per_hour_l: null,
			_idx: rotovapDays.length
		}];
	}

	const reactorMachines = $derived(data.machines?.filter((m: any) => m.machine_type === 'Reactor') ?? []);
	const rotovapMachines = $derived(data.machines?.filter((m: any) => m.machine_type === 'Rotovap') ?? []);

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
			<p class="text-xs text-text-muted mt-1">{data.batch.strain}</p>
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
										<label class={labelClass}>Supplier</label>
										<input class={inputClass} type="text" name="supplier" value={data.batch.supplier ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Leaf Batch ID</label>
										<input class={inputClass} type="text" name="leaf_batch_id" value={data.batch.leaf_batch_id ?? ''} placeholder="e.g. LB-2026-001" />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">calendar_today</span>
									Processing Dates
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Receipt Date</label>
										<input class={inputClass} type="date" name="receipt_date" value={data.stage1?.receipt_date ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Processing Date</label>
										<input class={inputClass} type="date" name="processing_date" value={data.stage1?.processing_date ?? ''} />
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
										<label class={labelClass}>Gross Weight (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="gross_weight_kg" value={data.stage1?.gross_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Tare Weight (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="tare_weight_kg" value={data.stage1?.tare_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Moisture Content (%)</label>
										<input class={inputClass} type="number" step="0.1" name="moisture_content_pct" value={data.stage1?.moisture_content_pct ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">precision_manufacturing</span>
									Grinder Machine Data
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Machine Temp (°C)</label>
										<input class={inputClass} type="number" name="machine_temp_c" value={data.stage1?.machine_temp_c ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>RPM</label>
										<input class={inputClass} type="number" name="rpm" value={data.stage1?.rpm ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Run Duration (min)</label>
										<input class={inputClass} type="number" name="run_duration_min" value={data.stage1?.run_duration_min ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Screen Mesh (mm)</label>
										<input class={inputClass} type="number" step="0.1" name="screen_mesh_mm" value={data.stage1?.screen_mesh_mm ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Feed Rate Setting</label>
										<input class={inputClass} type="text" name="feed_rate_setting" value={data.stage1?.feed_rate_setting ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">inventory_2</span>
									Outputs
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Final Powder Weight (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="powder_weight_kg" value={data.stage1?.powder_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Dust Loss (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="dust_loss_kg" value={data.stage1?.dust_loss_kg ?? ''} />
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
								</div>
							</section>

						{:else if data.stageNumber === 2}
							<!-- Stage 2: Ethanol Extraction (New Schema) -->

							<!-- Ethanol Dilution Calculator -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">water_drop</span>
									Ethanol Dilution Calculator
								</h3>
								<div class="grid grid-cols-2 gap-6 mb-4">
									<div class="space-y-1">
										<label class={labelClass}>Ethanol Stock Grade (%)</label>
										<select class={inputClass} name="ethanol_stock_grade_pct" bind:value={s2Grade}>
											<option value={96}>96%</option>
											<option value={70}>70%</option>
										</select>
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Ethanol Stock Used (L)</label>
										<input class={highlightClass} type="number" step="0.1" name="ethanol_stock_used_l" bind:value={s2StockUsed} />
									</div>
								</div>
								<input type="hidden" name="target_ethanol_pct" value="70" />
								<input type="hidden" name="water_added_l" value={s2Dilution.waterNeededL} />
								<input type="hidden" name="ethanol_70_volume_l" value={s2Dilution.resultingVolumeL} />
								<div class="grid grid-cols-3 gap-4 bg-bg-card-hover p-4 rounded-lg">
									<div class="text-center">
										<p class={labelClass}>Target 70% Volume</p>
										<p class="text-xl font-black text-primary">{s2Dilution.resultingVolumeL} <span class="text-xs font-normal text-text-muted">L</span></p>
									</div>
									<div class="text-center">
										<p class={labelClass}>Ethanol Stock Used</p>
										<p class="text-xl font-black text-text-primary">{s2StockUsed || 0} <span class="text-xs font-normal text-text-muted">L</span></p>
									</div>
									<div class="text-center">
										<p class={labelClass}>Water Added</p>
										<p class="text-xl font-black text-blue-400">{s2Dilution.waterNeededL} <span class="text-xs font-normal text-text-muted">L</span></p>
									</div>
								</div>
							</section>

							<!-- Reactor Bank -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">precision_manufacturing</span>
									Reactor Bank
								</h3>
								<div class="grid grid-cols-3 gap-4">
									{#each reactors as reactor, ri}
										<div class="border border-border-card rounded-lg p-4">
											<h4 class="text-xs font-bold text-text-secondary mb-3">Glass Reactor {reactor.reactor_number}</h4>
											<div class="space-y-3">
												<div class="space-y-1">
													<label class={labelClass}>Machine</label>
													<select class={inputClass} name="reactor_{reactor.reactor_number}_machine_id" bind:value={reactor.machine_id}>
														<option value={null}>Select...</option>
														{#each reactorMachines as m}
															<option value={m.id}>{m.name}</option>
														{/each}
													</select>
												</div>
												<div class="space-y-1">
													<label class={labelClass}>Temp (°C)</label>
													<input class={inputClass} type="number" name="reactor_{reactor.reactor_number}_temperature_c" bind:value={reactor.temperature_c} />
												</div>
												<div class="space-y-1">
													<label class={labelClass}>RPM</label>
													<input class={inputClass} type="number" name="reactor_{reactor.reactor_number}_rpm" bind:value={reactor.rpm} />
												</div>
												<div class="space-y-1">
													<label class={labelClass}>Soak Time (min)</label>
													<input class={inputClass} type="number" name="reactor_{reactor.reactor_number}_soak_time_min" bind:value={reactor.soak_time_min} />
												</div>
												<div class="space-y-1">
													<label class={labelClass}>Powder Mass (kg)</label>
													<input class={highlightClass} type="number" step="0.01" name="reactor_{reactor.reactor_number}_powder_mass_kg" bind:value={reactor.powder_mass_kg} />
												</div>
												<div class="space-y-1">
													<label class={labelClass}>Ethanol 70% Vol (L)</label>
													<input class={inputClass} type="number" step="0.1" name="reactor_{reactor.reactor_number}_ethanol_70_volume_l" bind:value={reactor.ethanol_70_volume_l} />
												</div>
												<div class="space-y-1">
													<label class={labelClass}>Solvent Ratio (L/kg)</label>
													<input class="w-full bg-primary/5 border-none rounded-lg text-sm text-primary font-bold" type="text" readonly
														name="reactor_{reactor.reactor_number}_solvent_ratio"
														value={reactor.powder_mass_kg && reactor.ethanol_70_volume_l ? calculateSolventRatio(reactor.ethanol_70_volume_l, reactor.powder_mass_kg) : '—'} />
												</div>
											</div>
										</div>
									{/each}
								</div>
							</section>

							<!-- Settle Time -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">hourglass_empty</span>
									Settling
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Settle Time (min)</label>
										<input class={inputClass} type="number" name="settle_time_min" value={data.stage2?.settle_time_min ?? ''} />
									</div>
								</div>
							</section>

							<!-- Filtration Pipeline -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">filter_alt</span>
									Filtration Pipeline
								</h3>
								<div class="flex items-center gap-2">
									<!-- Bag Filter -->
									<div class="flex-1 border border-border-card rounded-lg p-4">
										<h4 class="text-xs font-bold text-text-secondary mb-3">Bag Filter</h4>
										<div class="space-y-3">
											<div class="space-y-1">
												<label class={labelClass}>Input (L)</label>
												<input class={inputClass} type="number" step="0.1" name="bag_filter_input_l" value={data.stage2?.bag_filter_input_l ?? ''} />
											</div>
											<div class="space-y-1">
												<label class={labelClass}>Output (L)</label>
												<input class={inputClass} type="number" step="0.1" name="bag_filter_output_l" value={data.stage2?.bag_filter_output_l ?? ''} />
											</div>
										</div>
									</div>
									<span class="material-symbols-outlined text-text-muted">arrow_forward</span>
									<!-- Centrifuge -->
									<div class="flex-1 border border-border-card rounded-lg p-4">
										<h4 class="text-xs font-bold text-text-secondary mb-3">Centrifuge</h4>
										<div class="space-y-3">
											<div class="space-y-1">
												<label class={labelClass}>Input (L)</label>
												<input class={inputClass} type="number" step="0.1" name="centrifuge_input_l" value={data.stage2?.centrifuge_input_l ?? ''} />
											</div>
											<div class="space-y-1">
												<label class={labelClass}>Output (L)</label>
												<input class={inputClass} type="number" step="0.1" name="centrifuge_output_l" value={data.stage2?.centrifuge_output_l ?? ''} />
											</div>
										</div>
									</div>
									<span class="material-symbols-outlined text-text-muted">arrow_forward</span>
									<!-- Screw Press -->
									<div class="flex-1 border border-border-card rounded-lg p-4">
										<h4 class="text-xs font-bold text-text-secondary mb-3">Screw Press</h4>
										<div class="space-y-3">
											<div class="space-y-1">
												<label class={labelClass}>Input (L)</label>
												<input class={inputClass} type="number" step="0.1" name="screw_press_input_l" value={data.stage2?.screw_press_input_l ?? ''} />
											</div>
											<div class="space-y-1">
												<label class={labelClass}>Output (L)</label>
												<input class={inputClass} type="number" step="0.1" name="screw_press_output_l" value={data.stage2?.screw_press_output_l ?? ''} />
											</div>
										</div>
									</div>
								</div>
							</section>

							<!-- Rotovap Bank -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">settings</span>
									Rotovap Bank
								</h3>
								<input type="hidden" name="rotovap_day_count" value={rotovapDays.length} />
								{#each [1, 2] as rvNum}
									{@const rvDays = rotovapDays.filter((d: any) => d.rotovap_number === rvNum)}
									<div class="mb-6 border border-border-card rounded-lg p-4">
										<div class="flex items-center justify-between mb-3">
											<h4 class="text-xs font-bold text-text-secondary">Rotovap {rvNum}</h4>
											<button type="button" onclick={() => addRotovapDay(rvNum)} class="text-[10px] font-bold text-primary hover:text-primary-dark flex items-center gap-1">
												<span class="material-symbols-outlined text-sm">add</span> Add Day
											</button>
										</div>
										{#if rvDays.length > 0}
											<div class="overflow-x-auto">
												<table class="w-full text-left text-xs">
													<thead>
														<tr class="border-b border-border-card">
															<th class="py-2 pr-2 text-text-muted">Day</th>
															<th class="py-2 pr-2 text-text-muted">Bath °C</th>
															<th class="py-2 pr-2 text-text-muted">Vacuum mbar</th>
															<th class="py-2 pr-2 text-text-muted">Chiller °C</th>
															<th class="py-2 pr-2 text-text-muted">RPM</th>
															<th class="py-2 pr-2 text-text-muted">Run Time (h)</th>
															<th class="py-2 pr-2 text-text-muted">EtOH Rec (L)</th>
															<th class="py-2 text-text-muted">L/hr</th>
														</tr>
													</thead>
													<tbody>
														{#each rvDays as day, di}
															{@const globalIdx = rotovapDays.indexOf(day)}
															<input type="hidden" name="rotovap_day_{globalIdx}_rotovap_number" value={day.rotovap_number} />
															<input type="hidden" name="rotovap_day_{globalIdx}_day_number" value={day.day_number} />
															<tr class="border-b border-border-subtle">
																<td class="py-2 pr-2 font-bold text-text-primary">{day.day_number}</td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" name="rotovap_day_{globalIdx}_water_bath_temp_c" bind:value={day.water_bath_temp_c} /></td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" name="rotovap_day_{globalIdx}_vacuum_mbar" bind:value={day.vacuum_mbar} /></td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" name="rotovap_day_{globalIdx}_chiller_temp_c" bind:value={day.chiller_temp_c} /></td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" name="rotovap_day_{globalIdx}_rpm" bind:value={day.rpm} /></td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" step="0.1" name="rotovap_day_{globalIdx}_run_time_hours" bind:value={day.run_time_hours} /></td>
																<td class="py-1 pr-1"><input class="w-16 bg-bg-input border-border-card rounded text-xs text-text-primary p-1" type="number" step="0.1" name="rotovap_day_{globalIdx}_ethanol_recovered_l" bind:value={day.ethanol_recovered_l} /></td>
																<td class="py-2 text-primary font-bold">
																	{#if day.run_time_hours && day.ethanol_recovered_l}
																		{@const rph = calculateRecoveryPerHour(day.ethanol_recovered_l, day.run_time_hours)}
																		<input type="hidden" name="rotovap_day_{globalIdx}_recovery_per_hour_l" value={rph} />
																		{rph}
																	{:else}
																		<input type="hidden" name="rotovap_day_{globalIdx}_recovery_per_hour_l" value="" />
																		—
																	{/if}
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										{:else}
											<p class="text-xs text-text-muted">No daily logs yet. Click "Add Day" to start.</p>
										{/if}
									</div>
								{/each}
							</section>

							<!-- Process Totals -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">analytics</span>
									Process Totals
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Total 70% EtOH to Rotovap (L)</label>
										<input class={inputClass} type="number" step="0.1" name="total_ethanol_70_to_rotovap_l" value={data.stage2?.total_ethanol_70_to_rotovap_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Total Ethanol Distilled (L)</label>
										<input class={inputClass} type="number" step="0.1" name="total_ethanol_distilled_l" value={data.stage2?.total_ethanol_distilled_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water / Mother Liquid (L)</label>
										<input class={inputClass} type="number" step="0.1" name="water_mother_liquid_l" value={data.stage2?.water_mother_liquid_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Total Ethanol Recovered (L)</label>
										<input class={inputClass} type="number" step="0.1" name="total_ethanol_recovered_l" value={data.stage2?.total_ethanol_recovered_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Total Ethanol Loss (L)</label>
										<input class={inputClass} type="number" step="0.1" name="total_ethanol_loss_l" value={data.stage2?.total_ethanol_loss_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Recovery Rate (%)</label>
										<input class={inputClass} type="number" step="0.1" name="recovery_rate_pct" value={data.stage2?.recovery_rate_pct ?? ''} />
									</div>
								</div>
							</section>

							<!-- Extract Output -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">inventory_2</span>
									Extract Output
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Extract Weight (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="extract_weight_kg" value={data.stage2?.extract_weight_kg ?? ''} />
									</div>
								</div>
							</section>

							<!-- Operator -->
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
								</div>
							</section>

						{:else if data.stageNumber === 3}
							<!-- Stage 3: Acid/Base Extraction and Partitioning -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">input</span>
									Input
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Feed Weight (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="feed_weight_kg" value={data.stage3?.feed_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Water Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="water_volume_l" value={data.stage3?.water_volume_l ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Acid Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Acid Type</label>
										<input class={inputClass} type="text" name="acid_type" value={data.stage3?.acid_type ?? 'HCl'} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acid Concentration (%)</label>
										<input class={inputClass} type="number" step="0.1" name="acid_concentration_pct" value={data.stage3?.acid_concentration_pct ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Acid Volume (L)</label>
										<input class={inputClass} type="number" step="0.01" name="acid_volume_l" value={data.stage3?.acid_volume_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Target pH</label>
										<input class={inputClass} type="number" step="0.1" name="target_ph_acid" value={data.stage3?.target_ph_acid ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Actual pH</label>
										<input class={inputClass} type="number" step="0.1" name="actual_ph_acid" value={data.stage3?.actual_ph_acid ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">swap_vert</span>
									Base Adjustment
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Base Type</label>
										<input class={inputClass} type="text" name="base_type" value={data.stage3?.base_type ?? 'NaOH'} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Base Weight (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="base_weight_kg" value={data.stage3?.base_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Target pH</label>
										<input class={inputClass} type="number" step="0.1" name="target_ph_base" value={data.stage3?.target_ph_base ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Actual pH</label>
										<input class={inputClass} type="number" step="0.1" name="actual_ph_base" value={data.stage3?.actual_ph_base ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">layers</span>
									Partitioning / Non-Polar Phase
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Limonene Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="limonene_volume_l" value={data.stage3?.limonene_volume_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Number of Washes</label>
										<input class={inputClass} type="number" name="num_washes" value={data.stage3?.num_washes ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Aqueous Phase Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="aqueous_phase_volume_l" value={data.stage3?.aqueous_phase_volume_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Organic Phase Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="organic_phase_volume_l" value={data.stage3?.organic_phase_volume_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Limonene Recovered (L)</label>
										<input class={inputClass} type="number" step="0.1" name="limonene_recovered_l" value={data.stage3?.limonene_recovered_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Limonene Loss (L)</label>
										<input class={inputClass} type="number" step="0.1" name="limonene_loss_l" value={data.stage3?.limonene_loss_l ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">warning</span>
									Outputs
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Partition Loss (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="partition_loss_kg" value={data.stage3?.partition_loss_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Alkaloid Precipitate (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="alkaloid_precipitate_kg" value={data.stage3?.alkaloid_precipitate_kg ?? ''} />
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
								</div>
							</section>

						{:else if data.stageNumber === 4}
							<!-- Stage 4: Back Extraction, Precipitation, Drying, and Final Product -->
							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">input</span>
									Input
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Feed Weight (kg)</label>
										<input class={inputClass} type="number" step="0.01" name="feed_weight_kg" value={data.stage4?.feed_weight_kg ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">science</span>
									Back Extraction
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Solvent</label>
										<input class={inputClass} type="text" name="back_extraction_solvent" value={data.stage4?.back_extraction_solvent ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Volume (L)</label>
										<input class={inputClass} type="number" step="0.1" name="back_extraction_volume_l" value={data.stage4?.back_extraction_volume_l ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Temp (°C)</label>
										<input class={inputClass} type="number" name="back_extraction_temp_c" value={data.stage4?.back_extraction_temp_c ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Time (min)</label>
										<input class={inputClass} type="number" name="back_extraction_time_min" value={data.stage4?.back_extraction_time_min ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">eco</span>
									Limonene Accounting
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Limonene Retained in Product (kg)</label>
										<input class={inputClass} type="number" step="0.001" name="limonene_retained_product_kg" value={data.stage4?.limonene_retained_product_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Limonene Process Loss (kg)</label>
										<input class={inputClass} type="number" step="0.001" name="limonene_process_loss_kg" value={data.stage4?.limonene_process_loss_kg ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">filter_drama</span>
									Precipitation
								</h3>
								<div class="grid grid-cols-3 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Method</label>
										<input class={inputClass} type="text" name="precipitation_method" value={data.stage4?.precipitation_method ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitation pH</label>
										<input class={inputClass} type="number" step="0.1" name="precipitation_ph" value={data.stage4?.precipitation_ph ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Precipitate Weight (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="precipitate_weight_kg" value={data.stage4?.precipitate_weight_kg ?? ''} />
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
										<label class={labelClass}>Drying Temp (°C)</label>
										<input class={inputClass} type="number" name="drying_temp_c" value={data.stage4?.drying_temp_c ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Drying Time (hrs)</label>
										<input class={inputClass} type="number" step="0.1" name="drying_time_hours" value={data.stage4?.drying_time_hours ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Humidity (%)</label>
										<input class={inputClass} type="number" name="drying_humidity_pct" value={data.stage4?.drying_humidity_pct ?? ''} />
									</div>
								</div>
							</section>

							<section class={sectionClass}>
								<h3 class={headingClass}>
									<span class="material-symbols-outlined text-lg">package_2</span>
									Final Product
								</h3>
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-1">
										<label class={labelClass}>Final Product Weight (kg)</label>
										<input class={highlightClass} type="number" step="0.01" name="final_product_weight_kg" value={data.stage4?.final_product_weight_kg ?? ''} />
									</div>
									<div class="space-y-1">
										<label class={labelClass}>Product Appearance</label>
										<input class={inputClass} type="text" name="product_appearance" value={data.stage4?.product_appearance ?? ''} />
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
												<p class="text-[10px] uppercase text-text-muted font-bold">Total Input</p>
												<p class="text-2xl font-black">{data.stage1.net_weight_kg?.toFixed(2)} <span class="text-xs font-normal text-text-muted">kg</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">trending_down</span>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Total Output</p>
												<p class="text-2xl font-black">{data.stage1.powder_weight_kg?.toFixed(2)} <span class="text-xs font-normal text-text-muted">kg</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">inventory</span>
										</div>
										<div class="flex justify-between items-end bg-primary/10 -mx-4 px-4 py-4 rounded-lg">
											<div>
												<p class="text-[10px] uppercase text-primary font-black">Process Loss</p>
												<p class="text-3xl font-black text-primary">{(100 - (data.stage1.powder_yield_pct ?? 0)).toFixed(1)} <span class="text-sm font-normal">%</span></p>
											</div>
											<div class="text-right">
												<p class="text-[10px] uppercase text-text-muted font-bold">{data.stage1.dust_loss_kg?.toFixed(2)} kg</p>
												<span class="material-symbols-outlined text-amber-400">warning</span>
											</div>
										</div>
										<div class="pt-4">
											<div class="flex justify-between mb-2">
												<span class="text-[10px] uppercase font-bold text-text-muted">Stage Yield Efficiency</span>
												<span class="text-[10px] font-bold text-primary">{data.stage1.powder_yield_pct}%</span>
											</div>
											<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
												<div class="bg-primary h-full rounded-full" style="width: {data.stage1.powder_yield_pct}%"></div>
											</div>
										</div>
										<div class="pt-4 border-t border-border-card">
											<div class="flex justify-between mb-2">
												<span class="text-[10px] uppercase font-bold text-text-muted">Mass Balance Error</span>
												<span class="text-[10px] font-bold {(data.stage1.mass_balance_error_pct ?? 0) <= 2 ? 'text-primary' : 'text-amber-400'}">{data.stage1.mass_balance_error_pct ?? 0}%</span>
											</div>
											<div class="w-full bg-border-card h-2 rounded-full overflow-hidden">
												<div class="{(data.stage1.mass_balance_error_pct ?? 0) <= 2 ? 'bg-primary' : 'bg-amber-400'} h-full rounded-full" style="width: {Math.min((data.stage1.mass_balance_error_pct ?? 0) * 20, 100)}%"></div>
											</div>
											<p class="text-[9px] {(data.stage1.mass_balance_error_pct ?? 0) <= 2 ? 'text-primary' : 'text-amber-400'} mt-1">{(data.stage1.mass_balance_error_pct ?? 0) <= 2 ? 'Within tolerance' : 'Above 2% threshold'}</p>
										</div>
									</div>
								</div>

							{:else if data.stageNumber === 2 && data.stage2}
								<div class="bg-bg-card text-text-primary p-8 rounded-xl border border-primary/40 shadow-xl relative overflow-hidden">
									<div class="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
									<h3 class="text-xs font-black uppercase tracking-widest text-primary mb-8">Extraction Metrics</h3>
									<div class="space-y-6 relative z-10">
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Recovery Rate</p>
												<p class="text-2xl font-black">{data.stage2.recovery_rate_pct ?? '—'} <span class="text-xs font-normal text-text-muted">%</span></p>
											</div>
											<span class="material-symbols-outlined text-primary mb-1">restart_alt</span>
										</div>
										<div class="flex justify-between items-end border-b border-border-card pb-4">
											<div>
												<p class="text-[10px] uppercase text-text-muted font-bold">Ethanol Loss</p>
												<p class="text-2xl font-black">{data.stage2.total_ethanol_loss_l ?? '—'} <span class="text-xs font-normal text-text-muted">L</span></p>
											</div>
											<span class="material-symbols-outlined text-amber-400 mb-1">water_drop</span>
										</div>
										<div class="flex justify-between items-end bg-primary/10 -mx-4 px-4 py-4 rounded-lg">
											<div>
												<p class="text-[10px] uppercase text-primary font-black">Extract Output</p>
												<p class="text-3xl font-black text-primary">{data.stage2.extract_weight_kg ?? '—'} <span class="text-sm font-normal">kg</span></p>
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
											<p class="text-2xl font-black text-text-primary">{data.stage3.actual_ph_acid}</p>
										</div>
										<span class="material-symbols-outlined text-text-muted">arrow_forward</span>
										<div class="text-center">
											<p class="text-[10px] uppercase text-primary font-bold">Current</p>
											<p class="text-2xl font-black text-primary">{data.stage3.actual_ph_base}</p>
										</div>
									</div>
								</div>
								<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
									<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Limonene Recovery</h4>
									<div class="grid grid-cols-3 gap-2 text-center">
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Added</p>
											<p class="text-sm font-black text-text-primary">{data.stage3.limonene_volume_l}L</p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-primary font-bold">Recov.</p>
											<p class="text-sm font-black text-primary">{data.stage3.limonene_recovered_l}L</p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-red-500 font-bold">Lost</p>
											<p class="text-sm font-black text-red-500">{data.stage3.limonene_loss_l}L</p>
										</div>
									</div>
								</div>
								{#if data.stage3.feed_weight_kg && data.stage3.alkaloid_precipitate_kg}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-xs font-black uppercase tracking-widest text-text-muted mb-4">Partition Transfer Efficiency</h4>
										<div class="text-center">
											<p class="text-3xl font-black text-primary">{((data.stage3.alkaloid_precipitate_kg / data.stage3.feed_weight_kg) * 100).toFixed(1)}%</p>
											<p class="text-[10px] text-text-muted mt-1">Precipitate / Feed Weight</p>
										</div>
									</div>
								{/if}

							{:else if data.stageNumber === 4 && data.stage4}
								<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm">
									<h4 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Batch Summary</h4>
									<div class="space-y-4">
										<div class="bg-primary/5 p-4 rounded-lg">
											<p class="text-[10px] uppercase text-primary font-bold">Final Product Weight</p>
											<p class="text-2xl font-black text-text-primary">{data.stage4.final_product_weight_kg ? (data.stage4.final_product_weight_kg * 1000).toFixed(0) : '—'} <span class="text-xs font-normal text-text-muted">grams</span></p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Precipitate Weight</p>
											<p class="text-xl font-black text-text-primary">{data.stage4.precipitate_weight_kg ? (data.stage4.precipitate_weight_kg * 1000).toFixed(0) : '—'} <span class="text-xs font-normal text-text-muted">grams</span></p>
										</div>
										<div class="bg-primary/10 p-4 rounded-lg border border-primary/30">
											<p class="text-[10px] uppercase text-primary font-bold">Final Yield Percentage</p>
											<p class="text-3xl font-black text-primary">{data.stage4.cumulative_yield_pct ?? '—'} <span class="text-sm font-normal">%</span></p>
										</div>
									</div>
								</div>
								{#if data.stage4.precipitate_weight_kg && data.stage4.final_product_weight_kg}
									<div class="bg-bg-card p-6 rounded-xl border border-border-card shadow-sm mt-4">
										<h4 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Detailed Metrics</h4>
										<div class="space-y-3">
											<div class="flex justify-between items-center text-xs">
												<span class="text-text-muted">Precipitation Yield</span>
												<span class="font-bold text-text-primary">{data.stage4.stage_yield_pct ?? '—'}%</span>
											</div>
											<div class="flex justify-between items-center text-xs">
												<span class="text-text-muted">Drying Loss</span>
												<span class="font-bold text-text-primary">{((data.stage4.precipitate_weight_kg - data.stage4.final_product_weight_kg) * 1000).toFixed(0)} g</span>
											</div>
											{#if data.totalCost && data.stage4.final_product_weight_kg}
												<div class="flex justify-between items-center text-xs border-t border-border-card pt-2 mt-2">
													<span class="text-text-secondary font-bold">Cost per kg</span>
													<span class="font-black text-primary">${(data.totalCost / data.stage4.final_product_weight_kg).toFixed(2)}</span>
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
