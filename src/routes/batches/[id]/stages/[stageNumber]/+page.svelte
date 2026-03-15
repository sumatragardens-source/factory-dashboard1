<script lang="ts">
	import { getStageName, STAGE_KEYS } from '$lib/constants/stageNames';

	let { data } = $props();

	const stageIcons = ['energy_savings_leaf', 'biotech', 'science', 'package_2'];
</script>

<div class="flex h-full overflow-hidden">
	<!-- Stage Sidebar -->
	<aside class="w-72 flex-shrink-0 border-r border-primary/20 bg-bg-light flex flex-col h-full">
		<div class="p-6">
			<p class="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Current Batch</p>
			<p class="text-sm font-bold text-slate-900">{data.batch.batch_number}</p>
			<p class="text-xs text-slate-500 mt-1">{data.batch.strain}</p>
		</div>
		<nav class="flex flex-col gap-1 px-4">
			{#each STAGE_KEYS as sn, i}
				{@const isActive = sn === data.stageNumber}
				{@const stage = data.stages.find((s: any) => s.stage_number === sn)}
				<a
					href="/batches/{data.batch.id}/stages/{sn}"
					class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors
						{isActive ? 'bg-primary text-slate-900 font-semibold shadow-sm' : 'hover:bg-primary/10 cursor-pointer'}"
				>
					<span class="material-symbols-outlined">{stageIcons[i]}</span>
					<span class="leading-tight">{sn}. {getStageName(sn)}</span>
				</a>
			{/each}
		</nav>
		<div class="mt-auto p-6 border-t border-primary/10">
			<div class="flex items-center gap-3 px-3 py-2">
				<span class="material-symbols-outlined text-primary">account_circle</span>
				<div>
					<p class="text-sm font-bold">{data.batch.operator_name ?? 'Unassigned'}</p>
					<p class="text-xs opacity-60">Operator</p>
				</div>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="flex-1 flex flex-col h-full overflow-hidden">
		<header class="h-16 border-b border-primary/20 px-8 flex items-center justify-between bg-white/50 backdrop-blur-md shrink-0">
			<div class="flex items-center gap-4">
				<span class="material-symbols-outlined text-primary">{stageIcons[data.stageNumber - 1]}</span>
				<h2 class="text-lg font-bold">{getStageName(data.stageNumber)}</h2>
				<div class="flex items-center gap-2 text-xs font-medium text-slate-500 ml-4">
					<a href="/batches/{data.batch.id}" class="hover:text-primary">Batch {data.batch.batch_number}</a>
					<span class="material-symbols-outlined text-xs">chevron_right</span>
					<span class="text-slate-900">Stage {data.stageNumber}</span>
				</div>
			</div>
			<div class="flex gap-3">
				<button class="px-4 py-2 bg-primary/20 text-slate-900 rounded text-sm font-bold flex items-center gap-2">
					<span class="material-symbols-outlined text-sm">save</span>
					Save Progress
				</button>
			</div>
		</header>

		<div class="flex-1 overflow-y-auto p-8 no-scrollbar">
			<div class="grid grid-cols-12 gap-8 max-w-7xl mx-auto">
				<!-- Form Content -->
				<div class="col-span-8 flex flex-col gap-8">
					{#if data.stageNumber === 1}
						<!-- Stage 1: Raw Leaf to Powder -->
						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">fingerprint</span>
								Batch Identification
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Batch Number</label>
									<input class="w-full bg-primary/5 border-none rounded-lg text-sm font-bold focus:ring-primary" readonly type="text" value={data.batch.batch_number} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Supplier</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="text" value={data.batch.supplier ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">scale</span>
								Raw Leaf Measurements
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Gross Weight (kg)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.gross_weight_kg ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Tare Weight (kg)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.tare_weight_kg ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Moisture Content (%)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.moisture_content_pct ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">precision_manufacturing</span>
								Grinder Machine Data
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Machine Temp (°C)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.machine_temp_c ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">RPM</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.rpm ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Run Duration (min)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.run_duration_min ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">inventory_2</span>
								Outputs
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Final Powder Weight (kg)</label>
									<input class="w-full bg-primary/10 border-primary/30 border-2 rounded-lg text-sm font-black focus:ring-primary" type="number" value={data.stage1?.powder_weight_kg ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Dust Loss (kg)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage1?.dust_loss_kg ?? ''} />
								</div>
							</div>
						</section>

					{:else if data.stageNumber === 2}
						<!-- Stage 2: Ethanol Extraction -->
						{#if data.stage2}
							<div class="grid grid-cols-5 gap-4">
								<div class="bg-white border border-slate-200 p-3 rounded">
									<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ethanol In</p>
									<p class="text-xl font-black text-slate-900">{data.stage2.ethanol_volume_l} <span class="text-xs font-normal text-slate-400">L</span></p>
								</div>
								<div class="bg-white border border-slate-200 p-3 rounded">
									<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ethanol Recovered</p>
									<p class="text-xl font-black text-slate-900">{data.stage2.recovered_ethanol_l} <span class="text-xs font-normal text-slate-400">L</span></p>
									<p class="text-[10px] text-primary font-bold">+{((data.stage2.recovery_rate_pct ?? 0) - 93).toFixed(1)}% vs avg</p>
								</div>
								<div class="bg-white border border-slate-200 p-3 rounded">
									<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Remaining</p>
									<p class="text-xl font-black text-slate-900">{((data.stage2.ethanol_volume_l ?? 0) - (data.stage2.recovered_ethanol_l ?? 0) - (data.stage2.ethanol_loss_l ?? 0)).toFixed(1)} <span class="text-xs font-normal text-slate-400">L</span></p>
								</div>
								<div class="bg-white border border-slate-200 p-3 rounded">
									<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ethanol Loss</p>
									<p class="text-xl font-black text-slate-900">{data.stage2.ethanol_loss_l} <span class="text-xs font-normal text-slate-400">L</span></p>
								</div>
								<div class="bg-white border border-slate-200 p-3 rounded border-l-4 border-l-primary">
									<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Recovery %</p>
									<p class="text-xl font-black text-slate-900">{data.stage2.recovery_rate_pct} <span class="text-xs font-normal text-slate-400">%</span></p>
								</div>
							</div>

							<!-- Solvent Balance Verification -->
							<div class="bg-slate-900 text-white p-6 rounded-xl">
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
										<span class="material-symbols-outlined">water_drop</span>
										Solvent Balance Verification
									</h3>
									<span class="bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded">VALIDATED</span>
								</div>
								<div class="grid grid-cols-3 gap-6">
									<div>
										<p class="text-[10px] uppercase text-white/40 font-bold">Input Volume</p>
										<p class="text-xl font-black">{data.stage2.ethanol_volume_l?.toFixed(2)} L</p>
									</div>
									<div>
										<p class="text-[10px] uppercase text-white/40 font-bold">Output (Rec + Rem)</p>
										<p class="text-xl font-black">{((data.stage2.recovered_ethanol_l ?? 0)).toFixed(2)} L</p>
									</div>
									<div>
										<p class="text-[10px] uppercase text-white/40 font-bold">Unaccounted Variance</p>
										<p class="text-xl font-black text-primary">{(100 - (data.stage2.recovery_rate_pct ?? 0)).toFixed(2)}%</p>
									</div>
								</div>
							</div>
						{/if}

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">precision_manufacturing</span>
								Reactor Setup
							</h3>
							<div class="grid grid-cols-4 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Set Temperature (°C)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.set_temperature_c ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Agitation RPM</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.agitation_rpm ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Soak Time (min)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.soak_time_min ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Solvent Ratio (L/kg)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.solvent_ratio ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">settings</span>
								Rotovap Stage
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Bath Temp (°C)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.rotovap_bath_temp_c ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Vacuum (mbar)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage2?.rotovap_vacuum_mbar ?? ''} />
								</div>
							</div>
						</section>

					{:else if data.stageNumber === 3}
						<!-- Stage 3: Acid/Base Extraction and Partitioning -->
						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">science</span>
								Acid Extraction
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="bg-slate-50 border border-slate-200 p-4 rounded-lg">
									<p class="text-[10px] uppercase text-slate-500 font-bold">Acid Type</p>
									<p class="text-lg font-black">{data.stage3?.acid_type ?? 'HCl'} {data.stage3?.acid_concentration_pct ?? ''}%</p>
								</div>
								<div class="bg-slate-50 border border-slate-200 p-4 rounded-lg">
									<p class="text-[10px] uppercase text-slate-500 font-bold">Target pH Range</p>
									<p class="text-lg font-black">{data.stage3?.target_ph_acid ?? '2.0'}</p>
								</div>
								<div class="bg-slate-50 border border-slate-200 p-4 rounded-lg">
									<p class="text-[10px] uppercase text-slate-500 font-bold">Actual pH</p>
									<p class="text-lg font-black">{data.stage3?.actual_ph_acid ?? '—'}</p>
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">swap_vert</span>
								Base Adjustment
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Base Type</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="text" value={data.stage3?.base_type ?? 'NaOH'} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Target pH</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage3?.target_ph_base ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Actual pH</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage3?.actual_ph_base ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">layers</span>
								Partitioning / Non-Polar Phase
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Limonene Volume (L)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage3?.limonene_volume_l ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Number of Washes</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage3?.num_washes ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">warning</span>
								Transfer / Partition Loss
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Partition Loss (kg)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage3?.partition_loss_kg ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Alkaloid Precipitate (kg)</label>
									<input class="w-full bg-primary/10 border-primary/30 border-2 rounded-lg text-sm font-black focus:ring-primary" type="number" value={data.stage3?.alkaloid_precipitate_kg ?? ''} />
								</div>
							</div>
						</section>

					{:else if data.stageNumber === 4}
						<!-- Stage 4: Back Extraction, Precipitation, Drying, and Final Product -->
						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">science</span>
								Back Extraction
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Solvent</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="text" value={data.stage4?.back_extraction_solvent ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Volume (L)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage4?.back_extraction_volume_l ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Temp (°C)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage4?.back_extraction_temp_c ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">thermostat</span>
								Drying Parameters
							</h3>
							<div class="grid grid-cols-3 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Drying Temp (°C)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage4?.drying_temp_c ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Drying Time (hrs)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage4?.drying_time_hours ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Humidity (%)</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="number" value={data.stage4?.drying_humidity_pct ?? ''} />
								</div>
							</div>
						</section>

						<section class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
							<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
								<span class="material-symbols-outlined text-lg">package_2</span>
								Final Product
							</h3>
							<div class="grid grid-cols-2 gap-6">
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Final Product Weight (kg)</label>
									<input class="w-full bg-primary/10 border-primary/30 border-2 rounded-lg text-sm font-black focus:ring-primary" type="number" value={data.stage4?.final_product_weight_kg ?? ''} />
								</div>
								<div class="space-y-1">
									<label class="text-[10px] font-bold uppercase text-slate-500">Product Appearance</label>
									<input class="w-full bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-primary" type="text" value={data.stage4?.product_appearance ?? ''} />
								</div>
							</div>
						</section>
					{/if}
				</div>

				<!-- Right Column: Calculated Results -->
				<div class="col-span-4 flex flex-col gap-6">
					<div class="sticky top-0">
						{#if data.stageNumber === 1 && data.stage1}
							<div class="bg-slate-900 text-white p-8 rounded-xl border border-primary/40 shadow-xl relative overflow-hidden">
								<div class="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
								<h3 class="text-xs font-black uppercase tracking-widest text-primary mb-8">Mass Balance Verification</h3>
								<div class="space-y-6 relative z-10">
									<div class="flex justify-between items-end border-b border-white/10 pb-4">
										<div>
											<p class="text-[10px] uppercase text-white/40 font-bold">Total Input</p>
											<p class="text-2xl font-black">{data.stage1.net_weight_kg?.toFixed(2)} <span class="text-xs font-normal text-white/40">kg</span></p>
										</div>
										<span class="material-symbols-outlined text-primary mb-1">trending_down</span>
									</div>
									<div class="flex justify-between items-end border-b border-white/10 pb-4">
										<div>
											<p class="text-[10px] uppercase text-white/40 font-bold">Total Output</p>
											<p class="text-2xl font-black">{data.stage1.powder_weight_kg?.toFixed(2)} <span class="text-xs font-normal text-white/40">kg</span></p>
										</div>
										<span class="material-symbols-outlined text-primary mb-1">inventory</span>
									</div>
									<div class="flex justify-between items-end bg-primary/10 -mx-4 px-4 py-4 rounded-lg">
										<div>
											<p class="text-[10px] uppercase text-primary font-black">Process Loss</p>
											<p class="text-3xl font-black text-primary">{(100 - (data.stage1.powder_yield_pct ?? 0)).toFixed(1)} <span class="text-sm font-normal">%</span></p>
										</div>
										<div class="text-right">
											<p class="text-[10px] uppercase text-white/40 font-bold">{data.stage1.dust_loss_kg?.toFixed(2)} kg</p>
											<span class="material-symbols-outlined text-amber-400">warning</span>
										</div>
									</div>
									<div class="pt-4">
										<div class="flex justify-between mb-2">
											<span class="text-[10px] uppercase font-bold text-white/60">Stage Yield Efficiency</span>
											<span class="text-[10px] font-bold text-primary">{data.stage1.powder_yield_pct}%</span>
										</div>
										<div class="w-full bg-white/10 h-2 rounded-full overflow-hidden">
											<div class="bg-primary h-full rounded-full" style="width: {data.stage1.powder_yield_pct}%"></div>
										</div>
									</div>
								</div>
							</div>

						{:else if data.stageNumber === 3 && data.stage3}
							<div class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
								<h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">pH Progression</h4>
								<div class="flex items-center justify-between">
									<div class="text-center">
										<p class="text-[10px] uppercase text-slate-400 font-bold">Initial</p>
										<p class="text-2xl font-black">{data.stage3.actual_ph_acid}</p>
									</div>
									<span class="material-symbols-outlined text-slate-300">arrow_forward</span>
									<div class="text-center">
										<p class="text-[10px] uppercase text-primary font-bold">Current</p>
										<p class="text-2xl font-black text-primary">{data.stage3.actual_ph_base}</p>
									</div>
								</div>
							</div>
							<div class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm mt-4">
								<h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Phase Volumes</h4>
								<div class="space-y-3">
									<div class="flex justify-between items-center">
										<span class="text-[10px] uppercase font-bold text-slate-500">Organic Phase</span>
										<span class="text-sm font-bold">{data.stage3.organic_phase_volume_l} L</span>
									</div>
									<div class="w-full bg-primary/20 h-2 rounded-full">
										<div class="bg-primary h-full rounded-full" style="width: {(data.stage3.organic_phase_volume_l ?? 0) / ((data.stage3.organic_phase_volume_l ?? 0) + (data.stage3.aqueous_phase_volume_l ?? 0)) * 100}%"></div>
									</div>
									<div class="flex justify-between items-center">
										<span class="text-[10px] uppercase font-bold text-slate-500">Aqueous Phase</span>
										<span class="text-sm font-bold">{data.stage3.aqueous_phase_volume_l} L</span>
									</div>
								</div>
							</div>
							<div class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm mt-4">
								<h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Limonene Recovery</h4>
								<div class="grid grid-cols-3 gap-2 text-center">
									<div>
										<p class="text-[10px] uppercase text-slate-400 font-bold">Added</p>
										<p class="text-sm font-black">{data.stage3.limonene_volume_l}L</p>
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

						{:else if data.stageNumber === 4 && data.stage4}
							<div class="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
								<h4 class="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Batch Summary</h4>
								<div class="space-y-4">
									<div class="bg-primary/5 p-4 rounded-lg">
										<p class="text-[10px] uppercase text-primary font-bold">Final Product Weight</p>
										<p class="text-2xl font-black">{data.stage4.final_product_weight_kg ? (data.stage4.final_product_weight_kg * 1000).toFixed(0) : '—'} <span class="text-xs font-normal text-slate-400">grams</span></p>
									</div>
									<div>
										<p class="text-[10px] uppercase text-slate-500 font-bold">Precipitate Weight</p>
										<p class="text-xl font-black">{data.stage4.precipitate_weight_kg ? (data.stage4.precipitate_weight_kg * 1000).toFixed(0) : '—'} <span class="text-xs font-normal text-slate-400">grams</span></p>
									</div>
									<div class="bg-primary/10 p-4 rounded-lg border border-primary/30">
										<p class="text-[10px] uppercase text-primary font-bold">Final Yield Percentage</p>
										<p class="text-3xl font-black text-primary">{data.stage4.cumulative_yield_pct ?? '—'} <span class="text-sm font-normal">%</span></p>
									</div>
								</div>
							</div>

						{:else}
							<div class="bg-slate-100 p-8 rounded-xl text-center">
								<span class="material-symbols-outlined text-4xl text-slate-300">analytics</span>
								<p class="text-sm text-slate-400 mt-2">No data recorded for this stage yet.</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Footer Action Bar -->
		<footer class="h-14 border-t border-primary/20 px-8 flex items-center justify-between bg-white shrink-0">
			<div class="flex items-center gap-4 text-xs font-bold text-slate-400">
				<span class="flex items-center gap-1"><span class="w-2 h-2 bg-primary rounded-full"></span> SYSTEM ONLINE</span>
			</div>
			<div class="flex gap-4">
				<button class="text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">Discard</button>
				<button class="bg-slate-900 text-white px-8 py-2 rounded-lg text-sm font-black uppercase tracking-widest shadow-lg">Finalize Stage</button>
			</div>
		</footer>
	</main>
</div>
