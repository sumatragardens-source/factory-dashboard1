<script lang="ts">
	import { fmt, TARGETS } from '$lib/config/costs';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Derived KPI values
	const materialCost = (data.avgPerBatch * data.materialPct) / 100;
	const overheadCost = data.avgPerBatch * (1 - data.materialPct / 100);

	// Cost/KG delta vs target
	const costDelta =
		data.overallCostPerKg > 0
			? Number((((data.overallCostPerKg - TARGETS.costPerKg) / TARGETS.costPerKg) * 100).toFixed(1))
			: 0;

	// Max stage total for bar scaling
	const maxStageTotal = Math.max(...data.stageAccumulation.map((s) => s.total), 1);

	// Segment color override
	function segColor(label: string): string {
		if (label === 'Material') return '#bef264';
		if (label === 'Labor') return '#9ca3af';
		return '#4b5563';
	}
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
					<p class="text-[10px] text-[#ec5b13] font-bold tracking-[0.2em] uppercase">
						Run Summary &bull; {data.batchCount} Batches
					</p>
				</div>
			</div>
		</div>

		<!-- KPI Strip -->
		<div class="flex gap-2 mb-4 overflow-x-auto">
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Total Batch Cost</span>
				<div class="text-xl font-black text-white">{fmt(data.avgPerBatch)}</div>
				<span class="text-[10px] font-bold text-[#666666]">avg per batch</span>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Cost/KG</span>
				<div class="text-xl font-black text-white">{fmt(data.overallCostPerKg)}</div>
				<span class="text-[10px] font-bold {costDelta <= 0 ? 'text-[#bef264]' : 'text-[#ef4444]'}"
					>{costDelta <= 0 ? '' : '+'}{costDelta}% vs target</span
				>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Material Cost</span>
				<div class="text-xl font-black text-[#bef264]">{fmt(materialCost)}</div>
				<span class="text-[10px] font-bold text-[#666666]">{data.materialPct}% of total</span>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Overhead</span>
				<div class="text-xl font-black text-[#a0a0a0]">{fmt(overheadCost)}</div>
				<span class="text-[10px] font-bold text-[#666666]">{(100 - data.materialPct).toFixed(1)}% of total</span>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">GP per KG</span>
				<div class="text-xl font-black {data.margin >= 0 ? 'text-[#bef264]' : 'text-[#ef4444]'}">
					{fmt(data.margin)}
				</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="grid grid-cols-12 gap-4">
			<!-- Left column (8 cols) -->
			<div class="col-span-8 flex flex-col gap-4">
				<!-- Stage Cost Accumulation -->
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<div class="flex justify-between items-center mb-4">
						<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest">Stage Cost Accumulation</h2>
						<div class="flex gap-4">
							<div class="flex items-center gap-2">
								<span class="size-2 bg-[#bef264] rounded-full"></span><span
									class="text-[9px] uppercase font-bold text-[#666666]">Material</span
								>
							</div>
							<div class="flex items-center gap-2">
								<span class="size-2 bg-[#9ca3af] rounded-full"></span><span
									class="text-[9px] uppercase font-bold text-[#666666]">Labor</span
								>
							</div>
							<div class="flex items-center gap-2">
								<span class="size-2 bg-[#4b5563] rounded-full"></span><span
									class="text-[9px] uppercase font-bold text-[#666666]">Other</span
								>
							</div>
						</div>
					</div>
					<div class="space-y-4">
						{#each data.stageAccumulation as stage}
							<div>
								<div class="flex justify-between items-end mb-1">
									<span class="text-[10px] font-bold text-[#a0a0a0]">{stage.stage.toUpperCase()}</span>
									<span class="text-[10px] font-mono font-bold text-[#ec5b13]">{fmt(stage.cumulative)}</span>
								</div>
								<div
									class="h-7 bg-[#0d0d0d]/50 rounded-sm overflow-hidden"
									style="width: {(stage.total / maxStageTotal) * 100}%"
								>
									<div class="h-full flex">
										{#each stage.segments as seg}
											{@const pct = stage.total > 0 ? (seg.value / stage.total) * 100 : 0}
											{#if pct > 0}
												<div
													class="h-full border-r border-[#0d0d0d] flex items-center justify-center"
													style="width: {pct}%; background-color: {segColor(seg.label)}"
												>
													{#if pct > 12}
														<span class="text-[8px] font-extrabold text-black/70 whitespace-nowrap pointer-events-none"
															>{fmt(seg.value)} &bull; {pct.toFixed(0)}%</span
														>
													{/if}
												</div>
											{/if}
										{/each}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Batch Cost Table -->
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg overflow-hidden">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest px-4 pt-4 pb-2">
						Batch Cost Table
					</h2>
					<div class="max-h-[360px] overflow-y-auto">
						<table class="w-full text-[11px]">
							<thead class="bg-[#0d0d0d] sticky top-0 z-10">
								<tr class="text-[9px] text-[#666666] uppercase font-bold tracking-widest">
									<th class="px-4 py-2.5 text-left">Batch #</th>
									<th class="px-4 py-2.5 text-right">Total Cost</th>
									<th class="px-4 py-2.5 text-right">Cost/KG</th>
									<th class="px-4 py-2.5 text-right">vs Target</th>
									<th class="px-4 py-2.5 text-right">vs Avg</th>
									<th class="px-4 py-2.5 text-right">Status</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[#1e1e1e]/50 font-mono">
								{#each data.batches.slice(0, 15) as batch}
									<tr class="hover:bg-white/5">
										<td class="px-4 py-2 text-[#a0a0a0]">{batch.batchNumber}</td>
										<td class="px-4 py-2 text-right text-white">{fmt(batch.totalCost)}</td>
										<td class="px-4 py-2 text-right text-white"
											>{batch.costPerKg != null ? fmt(batch.costPerKg) : '—'}</td
										>
										<td
											class="px-4 py-2 text-right {batch.vsTarget != null && batch.vsTarget <= 0
												? 'text-[#bef264]'
												: batch.vsTarget != null
													? 'text-[#ef4444]'
													: 'text-[#666666]'}"
										>
											{batch.vsTarget != null ? (batch.vsTarget > 0 ? '+' : '') + batch.vsTarget + '%' : '—'}
										</td>
										<td
											class="px-4 py-2 text-right {batch.vsAvg != null && batch.vsAvg <= 0
												? 'text-[#bef264]'
												: batch.vsAvg != null
													? 'text-[#ef4444]'
													: 'text-[#666666]'}"
										>
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

			<!-- Right column (4 cols) -->
			<div class="col-span-4">
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Cost Pareto Drivers</h2>
					<div class="space-y-4">
						{#each data.paretoDrivers.slice(0, 5) as driver, i}
							<div class="bg-[#161616] rounded">
								<div class="flex items-center justify-between mb-1">
									<div class="flex items-center gap-2">
										<span class="text-[10px] font-bold text-[#ec5b13] w-5">#{i + 1}</span>
										<span class="text-[11px] font-bold text-[#a0a0a0]">{driver.name}</span>
									</div>
									<span class="text-[11px] font-mono font-bold text-white">{fmt(driver.total)}</span>
								</div>
								<div class="h-2 w-full bg-[#0d0d0d] rounded overflow-hidden">
									<div
										class="h-full rounded {i < 3 ? 'bg-[#ec5b13]' : 'bg-[#4b5563]'}"
										style="width: {driver.pct}%"
									></div>
								</div>
								<span class="text-[9px] text-[#666666]">{driver.pct}% of total</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="text-center py-12 text-[#666666]">
			<p class="text-sm">No data available</p>
			<p class="text-xs mt-1">Import data via the Admin page to get started.</p>
		</div>
	{/if}
</div>
