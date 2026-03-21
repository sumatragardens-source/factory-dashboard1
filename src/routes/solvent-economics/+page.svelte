<script lang="ts">
	import { fmt } from '$lib/config/costs';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Waterfall positioning logic
	const maxHeight = 320;
	const wf = data.waterfall;
	const scale = wf.issued > 0 ? maxHeight / wf.issued : 1;

	// Cumulative losses for positioning
	const losses = [
		{ label: 'CAKE', value: wf.cakeRetention, color: 'bg-[#ef4444]', textColor: 'text-[#ef4444]' },
		{ label: 'EVAP', value: wf.evaporationLoss, color: 'bg-[#f59e0b]', textColor: 'text-[#f59e0b]' },
		{ label: 'OTHER', value: wf.otherLoss, color: 'bg-[#6b7280]', textColor: 'text-[#a0a0a0]' }
	];

	let cumLoss = 0;
	const lossPositions = losses.map((loss) => {
		const h = Math.max(loss.value * scale, 4);
		const translateY = -(maxHeight - cumLoss * scale);
		cumLoss += loss.value;
		return { ...loss, height: h, translateY };
	});

	const recoveredHeight = wf.recovered * scale;

	// Bullet chart scaling (range 75-100)
	const bulletMin = 75;
	const bulletMax = 100;
	const bulletScale = (v: number) => Math.max(0, Math.min(100, ((v - bulletMin) / (bulletMax - bulletMin)) * 100));

	// Recovery delta
	const recoveryDelta = Number((data.bulletChart.current - data.bulletChart.rolling10).toFixed(1));

	// Worst batches: sort by lost descending, take top 5
	const worstBatches = [...data.batchPerformance].sort((a, b) => b.lost - a.lost).slice(0, 5);
	const maxBatchLoss = worstBatches.length > 0 ? worstBatches[0].lost : 1;
</script>

<div class="min-h-screen bg-[#0d0d0d] text-white p-4">
	{#if data.batchCount > 0}
		<!-- Header -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-3">
				<div class="size-8 bg-[#bef264] flex items-center justify-center rounded">
					<span class="material-symbols-outlined text-[#0d0d0d] font-bold text-sm">water_drop</span>
				</div>
				<div>
					<h1 class="text-sm font-black tracking-tighter uppercase leading-none">Solvent Intelligence</h1>
					<p class="text-[10px] text-[#bef264] font-bold tracking-[0.2em] uppercase">
						Run Summary &bull; {data.batchCount} Batches
					</p>
				</div>
			</div>
		</div>

		<!-- KPI Strip -->
		<div class="flex gap-2 mb-4 overflow-x-auto">
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Recovery %</span>
				<div class="text-xl font-black text-white">{data.recoveryPct}%</div>
				<span class="text-[10px] font-bold {recoveryDelta >= 0 ? 'text-[#bef264]' : 'text-[#ef4444]'}"
					>{recoveryDelta >= 0 ? '+' : ''}{recoveryDelta}% vs avg</span
				>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Liters Issued</span>
				<div class="text-xl font-black text-white">{data.totalIssued.toLocaleString()} L</div>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Liters Lost</span>
				<div class="text-xl font-black text-[#ef4444]">{data.totalLost.toLocaleString()} L</div>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Cost Impact</span>
				<div class="text-xl font-black text-[#ef4444]">{fmt(data.totalLossValue)}</div>
			</div>
			<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
				<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">SSR Ratio</span>
				<div class="text-xl font-black text-white">{data.ssrRatio} L/kg</div>
			</div>
		</div>

		<!-- Main Grid -->
		<div class="grid grid-cols-12 gap-4">
			<!-- Left column (8 cols) -->
			<div class="col-span-8 flex flex-col gap-4">
				<!-- Diagnostic Waterfall -->
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3 flex items-center gap-2">
						<span class="w-2 h-2 bg-[#bef264]"></span> Diagnostic Waterfall: Loss Bridge (Liters)
					</h2>
					<div class="flex items-end justify-between px-6" style="min-height: {maxHeight + 60}px">
						<!-- Issued -->
						<div class="relative w-20 flex flex-col items-center">
							<div class="w-full relative overflow-hidden" style="height: {maxHeight}px">
								<div class="absolute bottom-0 w-full h-full bg-white/80"></div>
							</div>
							<span class="mt-2 text-[10px] font-bold">ISSUED</span>
							<span class="text-[10px] text-[#666666]">{wf.issued.toLocaleString()}L</span>
						</div>

						<!-- Loss bars -->
						{#each lossPositions as lp}
							<div class="relative w-20 flex flex-col items-center" style="transform: translateY({lp.translateY}px)">
								<div class="{lp.color}/80 w-full relative overflow-hidden" style="height: {lp.height}px">
									<div class="absolute bottom-0 w-full h-full {lp.color} opacity-80"></div>
								</div>
								<div class="absolute text-center" style="top: {lp.height + 4}px">
									<span class="block text-[10px] font-bold {lp.textColor}">{lp.label}</span>
									<span class="text-[10px] text-[#666666]">-{lp.value.toLocaleString()}L</span>
								</div>
							</div>
						{/each}

						<!-- Recovered -->
						<div class="relative w-20 flex flex-col items-center">
							<div class="w-full relative overflow-hidden" style="height: {recoveredHeight}px">
								<div class="absolute bottom-0 w-full h-full bg-[#bef264]/80"></div>
							</div>
							<span class="mt-2 text-[10px] font-bold text-[#bef264] uppercase">Recovered</span>
							<span class="text-[10px] text-[#666666]">{wf.recovered.toLocaleString()}L</span>
						</div>
					</div>
				</div>

				<!-- Comparative Recovery Bullet Chart -->
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Comparative Recovery</h2>
					<div class="relative h-16 flex flex-col justify-center">
						<div class="flex justify-between text-[8px] text-[#666666] mb-1">
							<span>75%</span><span>80%</span><span>85%</span><span>90%</span><span>95%</span>
						</div>
						<div class="w-full h-4 bg-[#1e1e1e] relative overflow-hidden">
							<!-- Current bar -->
							<div
								class="absolute left-0 h-full bg-[#bef264]"
								style="width: {bulletScale(data.bulletChart.current)}%"
							></div>
							<!-- 10-batch avg marker -->
							<div
								class="absolute h-full w-0.5 bg-[#a0a0a0] z-10"
								style="left: {bulletScale(data.bulletChart.rolling10)}%"
							></div>
							<!-- Best marker -->
							<div
								class="absolute h-full w-0.5 bg-cyan-400 z-10"
								style="left: {bulletScale(data.bulletChart.best)}%"
							></div>
						</div>
						<div class="flex justify-between mt-2 text-[9px]">
							<span class="text-[#bef264]">CURRENT: {data.bulletChart.current}%</span>
							<span class="text-[#a0a0a0]">10-AVG: {data.bulletChart.rolling10}%</span>
							<span class="text-cyan-400">BEST: {data.bulletChart.best}%</span>
						</div>
					</div>
				</div>

				<!-- Batch Performance Table -->
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg overflow-hidden">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest px-4 pt-4 pb-2">
						Batch Performance Matrix
					</h2>
					<div class="max-h-[360px] overflow-y-auto">
						<table class="w-full text-[11px]">
							<thead class="bg-[#0d0d0d] sticky top-0 z-10">
								<tr class="text-[9px] text-[#666666] uppercase font-bold tracking-widest">
									<th class="px-4 py-2.5 text-left">Batch ID</th>
									<th class="px-4 py-2.5 text-right">Issued (L)</th>
									<th class="px-4 py-2.5 text-right">Recovered (L)</th>
									<th class="px-4 py-2.5 text-right">Lost (L)</th>
									<th class="px-4 py-2.5 text-right">Recovery %</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-[#1e1e1e]/50 font-mono">
								{#each data.batchPerformance.slice(0, 15) as row}
									<tr class="hover:bg-white/5">
										<td class="px-4 py-2 font-bold text-white">{row.batch_number}</td>
										<td class="px-4 py-2 text-right text-[#a0a0a0]">{row.issued}</td>
										<td class="px-4 py-2 text-right text-[#bef264]">{row.recovered}</td>
										<td class="px-4 py-2 text-right text-[#ef4444]">{row.lost}</td>
										<td
											class="px-4 py-2 text-right font-bold {row.recovery_pct >= 86
												? 'text-[#bef264]'
												: row.recovery_pct >= 83
													? 'text-[#f59e0b]'
													: 'text-[#ef4444]'}">{row.recovery_pct}%</td
										>
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
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">
						Loss Sources: Worst Batches
					</h2>
					<div class="space-y-3">
						{#each worstBatches as batch}
							<div class="flex items-center gap-3">
								<span class="w-20 text-[10px] font-mono text-[#a0a0a0] truncate">{batch.batch_number}</span>
								<div class="flex-1 h-3 bg-[#0d0d0d] rounded overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-[#ef4444] to-[#ec5b13] rounded"
										style="width: {(batch.lost / maxBatchLoss) * 100}%"
									></div>
								</div>
								<span class="text-[10px] font-bold text-white w-14 text-right">{batch.lost}L</span>
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
