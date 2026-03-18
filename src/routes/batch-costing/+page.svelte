<script lang="ts">
	import { fmt, TARGETS } from '$lib/config/costs';
	let { data } = $props();
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<p class="text-xs text-text-muted">Operations &gt; <span class="text-primary font-bold">Batch Costing</span></p>
			<h1 class="text-2xl font-black text-text-primary">Batch Costing</h1>
			<p class="text-sm text-text-muted">Stage cost accumulation and batch cost analysis.</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary/10 text-text-primary border border-primary/30 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">download</span>
			Export Report
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-3 gap-4 mb-6">
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Cumulative Cost</p>
			<p class="text-2xl font-black text-text-primary">{fmt(data.totalCost)}</p>
			<div class="w-full bg-primary/20 h-1 rounded-full mt-2">
				<div class="bg-primary h-full rounded-full" style="width: 65%"></div>
			</div>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Cost Per KG</p>
			<p class="text-2xl font-black text-text-primary">{data.costPerKg ? fmt(data.costPerKg) : '—'}</p>
			<p class="text-[10px] text-text-muted">Based on final product output</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Profit Analysis</p>
			<div class="grid grid-cols-2 gap-4 mt-2">
				<div>
					<p class="text-[10px] uppercase text-text-muted font-bold">GP per KG</p>
					<p class="text-sm font-black text-primary">{data.costPerKg ? fmt(TARGETS.sellingPricePerKg - data.costPerKg) : '—'}</p>
				</div>
				<div>
					<p class="text-[10px] uppercase text-text-muted font-bold">Min Profitable</p>
					<p class="text-sm font-black">{data.costPerKg ? fmt(data.costPerKg) : '—'}</p>
				</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-12 gap-6">
		<!-- Stage Cost Table -->
		<div class="col-span-8 bg-bg-card border border-border-card rounded p-6">
			<h3 class="text-sm font-black text-text-primary mb-4 flex items-center gap-2">
				<span class="material-symbols-outlined text-primary">payments</span>
				Cost Line Items
			</h3>
			<table class="w-full text-left">
				<thead>
					<tr class="border-b border-border-card">
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Category</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Item</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Qty</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Unit Rate</th>
						<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Total</th>
					</tr>
				</thead>
				<tbody>
					{#each data.batch1Costs as cost, i}
						<tr class="border-b border-border-subtle">
							<td class="py-2 text-xs text-text-muted">{cost.cost_category}</td>
							<td class="py-2 text-sm text-text-primary">{cost.item_name}</td>
							<td class="py-2 text-sm text-text-secondary text-right font-mono">{cost.quantity != null ? cost.quantity.toFixed(1) : '—'}</td>
							<td class="py-2 text-sm text-text-secondary text-right font-mono">{cost.unit_rate != null ? fmt(cost.unit_rate) : '—'}</td>
							<td class="py-2 text-sm font-bold text-right font-mono text-text-primary">{fmt(cost.total_cost)}</td>
						</tr>
					{/each}
					<tr class="border-t-2 border-border-card bg-primary/5">
						<td colspan="4" class="py-3 text-sm font-bold text-text-primary">Total</td>
						<td class="py-3 text-sm font-bold text-right font-mono text-primary">{fmt(data.totalCost)}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Right Sidebar -->
		<div class="col-span-4 flex flex-col gap-6">
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-sm font-bold text-text-primary mb-4">Direct Category Costs</h3>
				<div class="space-y-3">
					{#each Object.entries(data.costBreakdown) as [cat, amount]}
						<div class="flex justify-between items-center">
							<span class="text-sm text-text-secondary">{cat}</span>
							<span class="text-sm font-bold text-text-primary font-mono">{fmt(amount as number)}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Unit Rates Reference -->
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-sm font-bold text-text-primary mb-4">Unit Rates</h3>
				<div class="space-y-2">
					{#each data.unitRates as rate}
						<div class="flex justify-between items-center py-1 border-b border-border-subtle">
							<span class="text-xs text-text-secondary">{rate.item_name}</span>
							<span class="text-xs font-bold text-text-primary font-mono">{fmt(rate.rate_per_unit)}/{rate.unit}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
