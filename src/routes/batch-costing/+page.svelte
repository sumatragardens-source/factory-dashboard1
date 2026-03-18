<script lang="ts">
	import { fmt, TARGETS } from '$lib/config/costs';
	let { data } = $props();
</script>

<div class="min-h-screen bg-[#0d0d0d] text-white p-4">
{#if data.batchCount > 0}
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<div class="size-8 bg-[#ec5b13] flex items-center justify-center rounded">
				<span class="material-symbols-outlined text-[#0d0d0d] font-bold text-sm">payments</span>
			</div>
			<div>
				<h1 class="text-sm font-black tracking-tighter uppercase leading-none">Cost Intelligence</h1>
				<p class="text-[10px] text-[#ec5b13] font-bold tracking-[0.2em] uppercase">Run Summary &bull; {data.batchCount} Batches</p>
			</div>
		</div>
	</div>

	<!-- KPI Strip -->
	<div class="flex gap-2 mb-4 overflow-x-auto">
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Total Op-Ex</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{fmt(data.totalOpEx)}</span>
			</div>
			<div class="h-0.5 w-full bg-[#ec5b13]/20 mt-1"><div class="h-full bg-[#ec5b13]" style="width: 75%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Avg/Batch</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{fmt(data.avgPerBatch)}</span>
			</div>
			<div class="h-0.5 w-full bg-white/5 mt-1"></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Cost/KG</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{fmt(data.overallCostPerKg)}</span>
				{#if data.overallCostPerKg <= TARGETS.costPerKg}
					<span class="text-[10px] font-bold text-[#bef264]">&#9650; On Target</span>
				{:else}
					<span class="text-[10px] font-bold text-[#ef4444]">&#9660; Over</span>
				{/if}
			</div>
			<div class="h-0.5 w-full bg-[#bef264]/20 mt-1"><div class="h-full bg-[#bef264]" style="width: {Math.min((TARGETS.costPerKg / Math.max(data.overallCostPerKg, 1)) * 100, 100)}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Proj. Daily</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{fmt(data.projectedDaily)}</span>
			</div>
			<div class="h-0.5 w-full bg-white/5 mt-1"></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Material %</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{data.materialPct}%</span>
			</div>
			<div class="h-0.5 w-full bg-[#bef264]/20 mt-1"><div class="h-full bg-[#bef264]" style="width: {data.materialPct}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Labor %</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{data.laborPct}%</span>
			</div>
			<div class="h-0.5 w-full bg-[#9ca3af]/20 mt-1"><div class="h-full bg-[#9ca3af]" style="width: {data.laborPct}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Energy %</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{data.energyPct}%</span>
			</div>
			<div class="h-0.5 w-full bg-white/5 mt-1"></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Margin/KG</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{fmt(data.margin)}</span>
				<span class="text-[10px] font-bold text-[#bef264]">&#9650;</span>
			</div>
			<div class="h-0.5 w-full bg-[#bef264]/20 mt-1"><div class="h-full bg-[#bef264]" style="width: {Math.min((data.margin / TARGETS.sellingPricePerKg) * 100, 100)}%"></div></div>
		</div>
	</div>

	<!-- Main Grid -->
	<div class="grid grid-cols-12 gap-4">
		<!-- Stage Cost Accumulation (8 cols) -->
		<div class="col-span-8 bg-[#161616] border border-[#1e1e1e] p-5 flex flex-col">
			<div class="flex justify-between items-center mb-6">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0]">Stage Cost Accumulation <span class="text-[#ec5b13] font-mono ml-2">// USD</span></h3>
				<div class="flex gap-4">
					<div class="flex items-center gap-2"><span class="size-2 bg-[#bef264] rounded-full"></span><span class="text-[9px] uppercase font-bold text-[#666666]">Material</span></div>
					<div class="flex items-center gap-2"><span class="size-2 bg-[#9ca3af] rounded-full"></span><span class="text-[9px] uppercase font-bold text-[#666666]">Labor</span></div>
					<div class="flex items-center gap-2"><span class="size-2 bg-[#4b5563] rounded-full"></span><span class="text-[9px] uppercase font-bold text-[#666666]">Other</span></div>
				</div>
			</div>
			<div class="flex-1 flex flex-col justify-around gap-4">
				{#each data.stageAccumulation as stage}
					<div class="relative">
						<div class="flex justify-between items-end mb-1">
							<span class="text-[10px] font-black text-[#a0a0a0]">{stage.stage.toUpperCase()}</span>
							<span class="text-[10px] font-mono font-bold text-[#ec5b13]">{fmt(stage.cumulative)}</span>
						</div>
						<div class="h-7 w-full flex rounded-sm overflow-hidden bg-[#0d0d0d]/50">
							{#each stage.segments as seg}
								{@const pct = stage.total > 0 ? (seg.value / stage.total) * 100 : 0}
								{#if pct > 0}
									<div
										class="h-full border-r border-[#0d0d0d] flex items-center justify-center"
										style="width: {pct}%; background-color: {seg.color}"
									>
										{#if pct > 12}
											<span class="text-[8px] font-extrabold text-black/70 whitespace-nowrap pointer-events-none">{fmt(seg.value)} &bull; {pct.toFixed(0)}%</span>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Cost Pareto Drivers (4 cols) -->
		<div class="col-span-4 bg-[#161616] border border-[#1e1e1e] flex flex-col">
			<div class="px-4 py-3 border-b border-[#1e1e1e]">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0]">Cost Pareto Drivers</h3>
			</div>
			<div class="p-4 space-y-4 flex-1">
				{#each data.paretoDrivers as driver, i}
					<div class="flex items-center justify-between">
						<div class="flex flex-col">
							<span class="text-[11px] font-bold text-[#a0a0a0]">{driver.name}</span>
							<span class="text-[9px] text-[#666666] font-mono">RANK #{i + 1}</span>
						</div>
						<div class="text-right">
							<div class="text-[12px] font-mono font-bold text-white">{driver.pct}%</div>
							<div class="text-[9px] font-bold text-[#a0a0a0]">{fmt(driver.total)}</div>
						</div>
					</div>
					<div class="h-1 w-full bg-[#0d0d0d]">
						<div class="h-full {i < 3 ? 'bg-[#ec5b13]' : 'bg-[#4b5563]'}" style="width: {driver.pct}%"></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Sub-Batch Cost Deviation Matrix (12 cols) -->
		<div class="col-span-12 bg-[#161616] border border-[#1e1e1e] flex flex-col">
			<div class="px-4 py-3 border-b border-[#1e1e1e] flex justify-between items-center">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0]">Sub-Batch Cost Deviation Matrix</h3>
				<div class="flex gap-4 text-[9px] font-bold uppercase tracking-tighter">
					<span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-[#bef264]"></span> High Eff</span>
					<span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-[#a0a0a0]"></span> On Target</span>
					<span class="flex items-center gap-1.5"><span class="size-1.5 rounded-full bg-[#ef4444]"></span> Critical</span>
				</div>
			</div>
			<div class="max-h-[400px] overflow-y-auto">
				<table class="w-full text-left border-collapse">
					<thead class="bg-[#0d0d0d]/50 sticky top-0 z-10">
						<tr class="text-[9px] font-black text-[#666666] uppercase tracking-widest">
							<th class="px-4 py-2.5 border-b border-[#1e1e1e]">Batch</th>
							<th class="px-4 py-2.5 border-b border-[#1e1e1e] text-right">Total Cost</th>
							<th class="px-4 py-2.5 border-b border-[#1e1e1e] text-right">Cost/KG</th>
							<th class="px-4 py-2.5 border-b border-[#1e1e1e] text-right">vs Target</th>
							<th class="px-4 py-2.5 border-b border-[#1e1e1e] text-right">vs Avg</th>
							<th class="px-4 py-2.5 border-b border-[#1e1e1e] text-right">Status</th>
						</tr>
					</thead>
					<tbody class="text-[12px] font-mono">
						{#each data.batches as batch}
							<tr class="hover:bg-white/5 border-b border-[#1e1e1e]">
								<td class="px-4 py-2 text-[#a0a0a0]">{batch.batchNumber}</td>
								<td class="px-4 py-2 text-right text-white">{fmt(batch.totalCost)}</td>
								<td class="px-4 py-2 text-right text-white">{batch.costPerKg != null ? fmt(batch.costPerKg) : '—'}</td>
								<td class="px-4 py-2 text-right {batch.vsTarget != null && batch.vsTarget <= 0 ? 'text-[#bef264]' : batch.vsTarget != null ? 'text-[#ef4444]' : 'text-[#666666]'}">
									{batch.vsTarget != null ? (batch.vsTarget > 0 ? '+' : '') + batch.vsTarget + '%' : '—'}
								</td>
								<td class="px-4 py-2 text-right {batch.vsAvg != null && batch.vsAvg <= 0 ? 'text-[#bef264]' : batch.vsAvg != null ? 'text-[#ef4444]' : 'text-[#666666]'}">
									{batch.vsAvg != null ? (batch.vsAvg > 0 ? '+' : '') + batch.vsAvg + '%' : '—'}
								</td>
								<td class="px-4 py-2 text-right">
									{#if batch.status === 'High Eff'}
										<span class="text-[9px] font-bold text-[#bef264] uppercase">{batch.status}</span>
									{:else if batch.status === 'Critical'}
										<span class="text-[9px] font-bold text-[#ef4444] uppercase">{batch.status}</span>
									{:else}
										<span class="text-[9px] font-bold text-[#a0a0a0] uppercase">{batch.status}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
{:else}
	<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
{/if}
</div>
