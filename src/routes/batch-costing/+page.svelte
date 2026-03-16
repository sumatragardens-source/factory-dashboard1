<script lang="ts">
	let { data } = $props();
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<p class="text-xs text-slate-500">Operations &gt; <span class="text-primary font-bold">Batch Costing</span></p>
			<h1 class="text-2xl font-black text-slate-900">Batch Costing</h1>
			<p class="text-sm text-slate-500">Stage cost accumulation and batch cost analysis.</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary/10 text-slate-900 border border-primary/30 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">download</span>
			Export Report
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-3 gap-4 mb-6">
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Cumulative Cost</p>
			<p class="text-2xl font-black text-slate-900">${data.totalCost.toFixed(2)}</p>
			<div class="w-full bg-primary/20 h-1 rounded-full mt-2">
				<div class="bg-primary h-full rounded-full" style="width: 65%"></div>
			</div>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Cost Per KG</p>
			<p class="text-2xl font-black text-slate-900">{data.costPerKg ? `$${data.costPerKg.toFixed(2)}` : '—'}</p>
			<p class="text-[10px] text-slate-400">Based on final product output</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Profit Analysis</p>
			<div class="grid grid-cols-2 gap-4 mt-2">
				<div>
					<p class="text-[10px] uppercase text-slate-400 font-bold">GP per KG</p>
					<p class="text-sm font-black text-primary">{data.costPerKg ? `$${(4800 - data.costPerKg).toFixed(2)}` : '—'}</p>
				</div>
				<div>
					<p class="text-[10px] uppercase text-slate-400 font-bold">Min Profitable</p>
					<p class="text-sm font-black">{data.costPerKg ? `$${data.costPerKg.toFixed(0)}` : '—'}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-12 gap-6">
		<!-- Stage Cost Table -->
		<div class="col-span-8 bg-white border border-slate-200 rounded p-6">
			<h3 class="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">payments</span>
				Stage-by-Stage Cost Accumulation
			</h3>
			<table class="w-full text-left">
				<thead>
					<tr class="border-b border-slate-200">
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Production Stage</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Labor</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Materials</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Utility</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Running Total</th>
					</tr>
				</thead>
				<tbody>
					{#each data.stageCosts as sc, i}
						<tr class="border-b border-slate-100 {i === data.stageCosts.length - 1 ? 'bg-primary/5' : ''}">
							<td class="py-3 text-sm text-slate-900">{sc.stageNumber}. {sc.stageName}</td>
							<td class="py-3 text-sm text-slate-600 text-right font-mono">${sc.labor.toFixed(2)}</td>
							<td class="py-3 text-sm text-slate-600 text-right font-mono">${sc.materials.toFixed(2)}</td>
							<td class="py-3 text-sm text-slate-600 text-right font-mono">${sc.utility.toFixed(2)}</td>
							<td class="py-3 text-sm font-bold text-right font-mono {i === data.stageCosts.length - 1 ? 'text-primary' : 'text-slate-900'}">${(sc as any).runningTotal.toFixed(2)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Right Sidebar -->
		<div class="col-span-4 flex flex-col gap-6">
			<div class="bg-white border border-slate-200 rounded p-6">
				<h3 class="text-sm font-bold text-slate-900 mb-4">Direct Category Costs</h3>
				<div class="space-y-3">
					{#each Object.entries(data.costBreakdown) as [cat, amount]}
						<div class="flex justify-between items-center">
							<span class="text-sm text-slate-600">{cat}</span>
							<span class="text-sm font-bold text-slate-900 font-mono">${(amount as number).toFixed(2)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Unit Rates Reference -->
			<div class="bg-white border border-slate-200 rounded p-6">
				<h3 class="text-sm font-bold text-slate-900 mb-4">Unit Rates</h3>
				<div class="space-y-2">
					{#each data.unitRates as rate}
						<div class="flex justify-between items-center py-1 border-b border-slate-100">
							<span class="text-xs text-slate-600">{rate.item_name}</span>
							<span class="text-xs font-bold text-slate-900 font-mono">${rate.rate_per_unit.toFixed(2)}/{rate.unit}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
