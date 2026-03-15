<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';

	let { data } = $props();
	let activeTab = $state('overview');

	const stageIcons = ['check', 'sync', 'science', 'package_2'];
	const progress = $derived((data.stages.filter((s: any) => s.status === 'Finalized').length / 4) * 100);
	const activityEvents = $derived([
		...data.deviations.map((d: any) => ({ type: 'deviation', icon: 'warning', desc: `${d.deviation_type}: ${d.parameter} (${d.severity})`, ts: d.created_at })),
		...data.approvals.map((a: any) => ({ type: 'approval', icon: 'verified', desc: `${a.approval_type.replace(/_/g, ' ')} — ${a.status}`, ts: a.requested_at })),
		...data.machineEvents.map((m: any) => ({ type: 'machine', icon: 'precision_manufacturing', desc: `${m.machine_name}: ${m.previous_status} → ${m.new_status}`, ts: m.created_at }))
	].sort((a: any, b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime()));
</script>

<div class="flex flex-col h-full overflow-hidden">
	<!-- Batch Header -->
	<div class="bg-white border-b border-slate-200 px-8 py-4 shrink-0">
		<div class="flex items-start justify-between mb-6">
			<div>
				<div class="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest mb-1">
					<span class="material-symbols-outlined text-xs">label</span>
					Extraction Process
				</div>
				<h1 class="text-3xl font-black text-slate-900">Batch #{data.batch.batch_number}</h1>
				<div class="flex items-center gap-4 mt-1 text-sm text-slate-500">
					<span class="flex items-center gap-1.5 font-medium text-primary">
						<span class="w-2 h-2 rounded-full bg-primary {data.batch.status === 'In Progress' ? 'animate-pulse' : ''}"></span>
						Status: {data.batch.status}
					</span>
					<span class="text-slate-300">|</span>
					<span class="flex items-center gap-1.5">
						<span class="material-symbols-outlined text-lg">person</span>
						Operator: {data.batch.operator_name ?? '—'}
					</span>
					{#if data.batch.started_at}
						<span class="text-slate-300">|</span>
						<span class="flex items-center gap-1.5">
							<span class="material-symbols-outlined text-lg">schedule</span>
							Started: {new Date(data.batch.started_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
						</span>
					{/if}
				</div>
			</div>
			<div class="flex gap-2">
				<button class="flex items-center gap-2 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 px-4 py-2 rounded font-bold text-sm transition-all">
					<span class="material-symbols-outlined text-lg">download</span>
					Export Report
				</button>
			</div>
		</div>

		<!-- Stage Workflow Tracker -->
		<div class="grid grid-cols-4 gap-4 relative">
			<div class="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10 mx-10"></div>
			{#each data.stages as stage, i}
				{@const isCurrent = stage.stage_number === data.batch.current_stage}
				{@const isFinalized = stage.status === 'Finalized'}
				{@const isPending = stage.status === 'Pending'}
				<div class="flex flex-col items-center text-center {isPending && !isCurrent ? 'opacity-50' : ''}">
					<div class="w-8 h-8 rounded-full flex items-center justify-center mb-2 ring-4 ring-white
						{isFinalized ? 'bg-primary text-white shadow-lg shadow-primary/30' :
						 isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/30' :
						 'bg-slate-200 text-slate-500'}">
						{#if isFinalized}
							<span class="material-symbols-outlined text-lg font-bold">check</span>
						{:else if isCurrent}
							<span class="material-symbols-outlined text-lg font-bold">sync</span>
						{:else}
							<span class="material-symbols-outlined text-sm">lock</span>
						{/if}
					</div>
					<p class="text-[11px] font-bold uppercase tracking-wider {isFinalized ? 'text-primary' : isCurrent ? 'text-primary' : 'text-slate-500'}">
						{isFinalized ? 'Completed' : isCurrent ? 'Active' : 'Pending'}
					</p>
					<p class="text-sm font-bold mt-1 {isCurrent ? 'text-slate-900' : isFinalized ? 'text-slate-700' : 'text-slate-500'}">
						{getStageName(stage.stage_number)}
					</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- Tabs -->
	<div class="flex items-center bg-white px-8 border-b border-slate-200 shrink-0 overflow-x-auto no-scrollbar">
		<button class="px-6 py-4 text-sm {activeTab === 'overview' ? 'font-bold text-primary border-b-2 border-primary' : 'font-medium text-slate-500 hover:text-slate-700'} whitespace-nowrap" onclick={() => activeTab = 'overview'}>Overview</button>
		<button class="px-6 py-4 text-sm {activeTab === 'stages' ? 'font-bold text-primary border-b-2 border-primary' : 'font-medium text-slate-500 hover:text-slate-700'} whitespace-nowrap" onclick={() => activeTab = 'stages'}>Stage Data</button>
		<button class="px-6 py-4 text-sm {activeTab === 'solvent' ? 'font-bold text-primary border-b-2 border-primary' : 'font-medium text-slate-500 hover:text-slate-700'} whitespace-nowrap" onclick={() => activeTab = 'solvent'}>Solvent Economics</button>
		<button class="px-6 py-4 text-sm {activeTab === 'lab' ? 'font-bold text-primary border-b-2 border-primary' : 'font-medium text-slate-500 hover:text-slate-700'} whitespace-nowrap" onclick={() => activeTab = 'lab'}>Lab Results</button>
		<button class="px-6 py-4 text-sm {activeTab === 'export' ? 'font-bold text-primary border-b-2 border-primary' : 'font-medium text-slate-500 hover:text-slate-700'} whitespace-nowrap" onclick={() => activeTab = 'export'}>Export</button>
	</div>

	<!-- Main Content -->
	<div class="flex-1 overflow-y-auto p-6">
		{#if activeTab === 'overview'}
			<div class="grid grid-cols-12 gap-6">
				<!-- Left Column: Summary Cards -->
				<div class="col-span-3 flex flex-col gap-4">
					<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
						<div class="flex justify-between items-start mb-2">
							<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Input Mass</span>
							<span class="material-symbols-outlined text-primary/40">scale</span>
						</div>
						<p class="text-2xl font-black text-slate-900">{data.batch.leaf_input_kg} <span class="text-base font-medium text-slate-400">kg</span></p>
						<p class="text-xs text-slate-400 mt-1">{data.batch.strain}</p>
					</div>

					{#if data.stage4?.final_product_weight_kg}
						<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Final Product</span>
								<span class="material-symbols-outlined text-primary/40">inventory_2</span>
							</div>
							<p class="text-2xl font-black text-slate-900">{data.stage4.final_product_weight_kg} <span class="text-base font-medium text-slate-400">kg</span></p>
							<p class="text-xs text-primary font-bold mt-1">{data.stage4.cumulative_yield_pct}% cumulative yield</p>
						</div>
					{:else if data.stage1}
						<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Powder Output</span>
								<span class="material-symbols-outlined text-primary/40">inventory_2</span>
							</div>
							<p class="text-2xl font-black text-slate-900">{data.stage1.powder_weight_kg} <span class="text-base font-medium text-slate-400">kg</span></p>
							<p class="text-xs text-primary font-bold mt-1">{data.stage1.powder_yield_pct}% stage yield</p>
						</div>
					{/if}

					{#if data.stage2}
						<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Solvent Recovery %</span>
								<span class="material-symbols-outlined text-primary/40">restart_alt</span>
							</div>
							<p class="text-2xl font-black text-slate-900">{data.stage2.recovery_rate_pct} <span class="text-base font-medium text-slate-400">%</span></p>
							<div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
								<div class="bg-primary h-full" style="width: {data.stage2.recovery_rate_pct}%"></div>
							</div>
						</div>
					{/if}

					{#if data.totalCost > 0}
						<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
							<div class="flex justify-between items-start mb-2">
								<span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Cumulative Cost</span>
								<span class="material-symbols-outlined text-primary/40">payments</span>
							</div>
							<p class="text-2xl font-black text-slate-900">${data.totalCost.toFixed(2)}</p>
							{#if data.costPerKg}
								<p class="text-xs text-slate-400 mt-1">${data.costPerKg.toFixed(2)} per kg</p>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Center Column: Current Stage -->
				<div class="col-span-6">
					<div class="bg-white rounded-xl shadow-sm border border-primary/10 flex flex-col">
						<div class="p-6 border-b border-primary/5 flex justify-between items-center">
							<div>
								<h3 class="text-xl font-bold text-slate-900">{data.batch.status === 'Completed' ? 'All Stages Complete' : `Active Stage: ${getStageName(data.batch.current_stage)}`}</h3>
								<p class="text-sm text-slate-500">{data.stages.filter((s: any) => s.status === 'Finalized').length} of 4 stages complete</p>
							</div>
							<div class="bg-primary/10 px-3 py-1 rounded-full text-primary font-bold text-xs uppercase tracking-widest">
								{data.batch.status}
							</div>
						</div>
						<div class="p-6 flex flex-col items-center text-center">
							<!-- Progress Ring -->
							<div class="relative w-48 h-48 flex items-center justify-center mb-6">
								<svg class="w-full h-full transform -rotate-90">
									<circle class="text-slate-100" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" stroke-width="8" />
									<circle class="text-primary" cx="96" cy="96" r="88" fill="transparent" stroke="currentColor" stroke-width="8"
										stroke-dasharray="552.92" stroke-dashoffset={552.92 - (552.92 * progress / 100)} />
								</svg>
								<div class="absolute inset-0 flex flex-col items-center justify-center">
									<span class="text-4xl font-black text-slate-900">{Math.round(progress)}%</span>
									<span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
								</div>
							</div>

							<!-- Next Action -->
							{#if data.batch.status === 'In Progress'}
								{@const nextStage = data.batch.current_stage < 4 ? data.batch.current_stage + 1 : null}
								<a href="/batches/{data.batch.id}/stages/{data.batch.current_stage}"
									class="w-full bg-primary text-white font-black py-4 rounded-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 mb-3">
									<span>Enter {getStageName(data.batch.current_stage)}</span>
									<span class="material-symbols-outlined">arrow_forward</span>
								</a>
							{/if}
						</div>
					</div>
				</div>

				<!-- Right Column: Identity & Alerts -->
				<div class="col-span-3 flex flex-col gap-6">
					<div class="bg-white p-4 rounded-xl shadow-sm border border-primary/5">
						<div class="flex items-center gap-4 mb-4">
							<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
								<span class="material-symbols-outlined text-2xl text-slate-400">qr_code_2</span>
							</div>
							<div>
								<h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Strain</h4>
								<p class="text-sm font-bold text-slate-900">{data.batch.strain ?? '—'}</p>
							</div>
						</div>
						<div class="flex flex-col gap-2">
							<div class="flex justify-between items-center py-2 border-t border-slate-100">
								<span class="text-xs text-slate-500">Supplier</span>
								<span class="text-xs font-bold">{data.batch.supplier ?? '—'}</span>
							</div>
							<div class="flex justify-between items-center py-2 border-t border-slate-100">
								<span class="text-xs text-slate-500">Leaf Input</span>
								<span class="text-xs font-bold">{data.batch.leaf_input_kg} kg</span>
							</div>
						</div>
					</div>

					{#if data.deviations.length > 0}
						<div class="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
							<div class="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center gap-2">
								<span class="material-symbols-outlined text-red-500 text-sm">error</span>
								<span class="text-xs font-bold text-red-600 uppercase tracking-wider">Deviations ({data.deviations.length})</span>
							</div>
							<div class="p-3 flex flex-col gap-2">
								{#each data.deviations as dev}
									<div class="p-2 rounded border-l-2 {dev.severity === 'Critical' ? 'bg-red-50/50 border-red-500' : dev.severity === 'Medium' ? 'bg-amber-50/50 border-amber-500' : 'bg-slate-50 border-slate-300'}">
										<p class="text-[11px] font-bold text-slate-800 leading-tight">{dev.parameter}: {dev.actual_value} (expected {dev.expected_value})</p>
										<p class="text-[10px] text-slate-500 mt-1">{dev.status} · {getStageName(dev.stage_number)}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Stage Progress -->
					<div class="bg-white rounded-xl shadow-sm border border-primary/5 flex flex-col overflow-hidden">
						<div class="p-4 border-b border-slate-100 flex items-center justify-between">
							<h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Stage Progress</h4>
						</div>
						<div class="p-4 flex flex-col gap-3">
							{#each data.stages as stage}
								<div class="flex gap-3">
									<div class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 {stage.status === 'Finalized' ? 'bg-primary' : stage.status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-300'}"></div>
									<div>
										<p class="text-[11px] font-bold text-slate-800 leading-tight">{getStageName(stage.stage_number)}</p>
										<p class="text-[10px] text-slate-400 mt-0.5">
											{stage.status}
											{#if stage.finalized_at} · {new Date(stage.finalized_at).toLocaleDateString()}{/if}
											{#if stage.finalized_by} · {stage.finalized_by}{/if}
										</p>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Activity Log -->
					{#if activityEvents.length > 0}
						<div class="bg-white rounded-xl shadow-sm border border-primary/5 flex flex-col overflow-hidden">
							<div class="p-4 border-b border-slate-100">
								<h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Activity Log</h4>
							</div>
							<div class="p-4 flex flex-col gap-3 max-h-48 overflow-y-auto">
								{#each activityEvents as event}
									<div class="flex gap-3">
										<span class="material-symbols-outlined text-sm text-slate-400 mt-0.5 shrink-0">{event.icon}</span>
										<div>
											<p class="text-[11px] font-bold text-slate-800 leading-tight">{event.desc}</p>
											<p class="text-[10px] text-slate-400 mt-0.5">{new Date(event.ts).toLocaleDateString()} {new Date(event.ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

		{:else if activeTab === 'stages'}
			<div class="space-y-4">
				{#each data.stages as stage}
					<a href="/batches/{data.batch.id}/stages/{stage.stage_number}"
						class="block bg-white rounded-xl border border-slate-200 p-6 hover:border-primary/30 transition-colors">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<div class="w-10 h-10 rounded-full flex items-center justify-center
									{stage.status === 'Finalized' ? 'bg-primary text-white' : stage.status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}">
									{#if stage.status === 'Finalized'}
										<span class="material-symbols-outlined">check</span>
									{:else}
										<span class="text-sm font-bold">{stage.stage_number}</span>
									{/if}
								</div>
								<div>
									<h3 class="text-sm font-bold text-slate-900">{getStageName(stage.stage_number)}</h3>
									<p class="text-xs text-slate-500">{stage.status}{#if stage.finalized_by} · Finalized by {stage.finalized_by}{/if}</p>
								</div>
							</div>
							<span class="material-symbols-outlined text-slate-400">chevron_right</span>
						</div>
					</a>
				{/each}
			</div>

		{:else if activeTab === 'solvent'}
			<div class="grid grid-cols-2 gap-6">
				<!-- Ethanol Balance -->
				<div class="bg-white rounded-xl border border-slate-200 p-6">
					<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
						<span class="material-symbols-outlined">water_drop</span>
						Ethanol Balance
					</h3>
					{#if data.stage2}
						<div class="space-y-4">
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Issued</span>
								<span class="text-sm font-bold font-mono">{data.stage2.ethanol_volume_l} L</span>
							</div>
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Recovered</span>
								<span class="text-sm font-bold font-mono text-primary">{data.stage2.recovered_ethanol_l} L</span>
							</div>
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Lost</span>
								<span class="text-sm font-bold font-mono text-red-600">{data.stage2.ethanol_loss_l} L</span>
							</div>
							<div class="flex justify-between items-center py-2 bg-primary/5 px-3 rounded-lg">
								<span class="text-xs font-bold text-slate-700">Recovery Rate</span>
								<span class="text-lg font-black text-primary">{data.stage2.recovery_rate_pct}%</span>
							</div>
						</div>
					{:else}
						<p class="text-sm text-slate-400">No ethanol data recorded yet.</p>
					{/if}
				</div>

				<!-- Limonene Balance -->
				<div class="bg-white rounded-xl border border-slate-200 p-6">
					<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
						<span class="material-symbols-outlined">eco</span>
						Limonene Balance
					</h3>
					{#if data.stage3}
						<div class="space-y-4">
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Issued</span>
								<span class="text-sm font-bold font-mono">{data.stage3.limonene_volume_l} L</span>
							</div>
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Recovered</span>
								<span class="text-sm font-bold font-mono text-primary">{data.stage3.limonene_recovered_l} L</span>
							</div>
							<div class="flex justify-between items-center py-2 border-b border-slate-100">
								<span class="text-xs text-slate-500">Volume Lost</span>
								<span class="text-sm font-bold font-mono text-red-600">{data.stage3.limonene_loss_l} L</span>
							</div>
							{#if true}
								{@const limRecovery = data.stage3.limonene_volume_l ? ((data.stage3.limonene_recovered_l ?? 0) / data.stage3.limonene_volume_l * 100) : 0}
								<div class="flex justify-between items-center py-2 bg-primary/5 px-3 rounded-lg">
									<span class="text-xs font-bold text-slate-700">Recovery Rate</span>
									<span class="text-lg font-black text-primary">{limRecovery.toFixed(1)}%</span>
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-slate-400">No limonene data recorded yet.</p>
					{/if}
				</div>
			</div>

			<!-- Cost Build-up Table -->
			{#if data.costs.length > 0}
				<div class="bg-white rounded-xl border border-slate-200 p-6 mt-6">
					<h3 class="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
						<span class="material-symbols-outlined">payments</span>
						Stage-by-Stage Cost Accumulation
					</h3>
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-slate-200">
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Stage</th>
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</th>
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Item</th>
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Qty</th>
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Rate</th>
								<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Total</th>
							</tr>
						</thead>
						<tbody>
							{#each data.costs as cost}
								<tr class="border-b border-slate-100">
									<td class="py-3 text-xs text-slate-600">{getStageName(cost.stage_number)}</td>
									<td class="py-3 text-xs text-slate-600">{cost.cost_category}</td>
									<td class="py-3 text-xs text-slate-900 font-medium">{cost.item_name}</td>
									<td class="py-3 text-xs text-slate-600 text-right font-mono">{cost.quantity}</td>
									<td class="py-3 text-xs text-slate-600 text-right font-mono">${cost.unit_rate.toFixed(2)}</td>
									<td class="py-3 text-xs font-bold text-slate-900 text-right font-mono">${cost.total_cost.toFixed(2)}</td>
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr class="border-t-2 border-slate-300">
								<td colspan="5" class="py-3 text-sm font-black text-slate-900">Total</td>
								<td class="py-3 text-sm font-black text-primary text-right font-mono">${data.totalCost.toFixed(2)}</td>
							</tr>
						</tfoot>
					</table>
				</div>
			{/if}

		{:else if activeTab === 'lab'}
			{#if data.labResults.length > 0}
				<div class="space-y-4">
					{#each data.labResults as result}
						<div class="bg-white rounded-xl border border-slate-200 p-6">
							<div class="flex items-center justify-between mb-4">
								<h3 class="text-sm font-bold text-slate-900">{result.test_type} Analysis — {result.lab_reference ?? 'No Ref'}</h3>
								<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded
									{result.status === 'Completed' ? 'bg-primary/20 text-primary' : result.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}">
									{result.status}
								</span>
							</div>
							{#if result.test_type === 'HPLC' && result.status === 'Completed'}
								<table class="w-full text-left">
									<thead>
										<tr class="border-b border-slate-200">
											<th class="py-2 text-[10px] font-black uppercase text-slate-500">Analyte</th>
											<th class="py-2 text-[10px] font-black uppercase text-slate-500 text-right">Concentration (%)</th>
										</tr>
									</thead>
									<tbody>
										<tr class="border-b border-slate-100"><td class="py-2 text-sm">Mitragynine</td><td class="py-2 text-sm font-bold text-right">{result.mitragynine_pct}%</td></tr>
										<tr class="border-b border-slate-100"><td class="py-2 text-sm">7-Hydroxymitragynine</td><td class="py-2 text-sm font-bold text-right">{result.hydroxy_mitragynine_pct}%</td></tr>
										<tr class="border-b border-slate-100"><td class="py-2 text-sm">Paynantheine</td><td class="py-2 text-sm font-bold text-right">{result.paynantheine_pct}%</td></tr>
										<tr class="border-b border-slate-100"><td class="py-2 text-sm">Speciogynine</td><td class="py-2 text-sm font-bold text-right">{result.speciogynine_pct}%</td></tr>
										<tr class="border-b border-slate-100"><td class="py-2 text-sm">Speciociliatine</td><td class="py-2 text-sm font-bold text-right">{result.speciociliatine_pct}%</td></tr>
										<tr><td class="py-2 text-sm text-primary font-bold">Total Purity</td><td class="py-2 text-sm font-black text-primary text-right">{result.hplc_purity_pct}%</td></tr>
									</tbody>
								</table>
							{:else if result.test_type === 'TLC' && result.status === 'Completed'}
								<div class="text-sm text-slate-600">
									<p>{result.tlc_spots_observed} spots observed</p>
									<p class="text-xs text-slate-400 mt-1">Rf values: {result.tlc_rf_values}</p>
								</div>
							{:else}
								<p class="text-sm text-slate-400">{result.notes ?? 'Awaiting analysis'}</p>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
					<p class="text-slate-400">No lab results recorded for this batch.</p>
				</div>
			{/if}
		{:else if activeTab === 'export'}
			<div class="bg-white rounded-xl border border-slate-200 p-8 text-center">
				<span class="material-symbols-outlined text-5xl text-slate-300 mb-4">picture_as_pdf</span>
				<h3 class="text-lg font-bold text-slate-900 mb-2">Export Batch Report</h3>
				<p class="text-sm text-slate-500 mb-6">Generate a comprehensive PDF report for this batch including all stage data, lab results, and cost breakdown.</p>
				<button class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 mx-auto hover:brightness-105 transition-all">
					<span class="material-symbols-outlined">picture_as_pdf</span>
					Generate PDF
				</button>
			</div>
		{/if}
	</div>
</div>
