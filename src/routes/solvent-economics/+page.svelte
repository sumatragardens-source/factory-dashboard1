<script lang="ts">
	import { fmt } from '$lib/config/costs';
	let { data } = $props();

	// Waterfall positioning logic
	const maxHeight = 320;
	const wf = data.waterfall;
	const scale = wf.issued > 0 ? maxHeight / wf.issued : 1;

	// Cumulative losses for positioning
	const losses = [
		{ label: 'CAKE', value: wf.cakeRetention, color: 'bg-[#ef4444]', textColor: 'text-[#ef4444]' },
		{ label: 'EVAP', value: wf.evaporationLoss, color: 'bg-[#f59e0b]', textColor: 'text-[#f59e0b]' },
		{ label: 'OTHER', value: wf.otherLoss, color: 'bg-[#6b7280]', textColor: 'text-[#a0a0a0]' },
	];

	let cumLoss = 0;
	const lossPositions = losses.map(loss => {
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
</script>

<div class="min-h-screen bg-[#0d0d0d] text-white p-4">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<div class="size-8 bg-[#bef264] flex items-center justify-center rounded">
				<span class="material-symbols-outlined text-[#0d0d0d] font-bold text-sm">water_drop</span>
			</div>
			<div>
				<h1 class="text-sm font-black tracking-tighter uppercase leading-none">Solvent Intelligence</h1>
				<p class="text-[10px] text-[#bef264] font-bold tracking-[0.2em] uppercase">Run Summary &bull; {data.batchCount} Batches</p>
			</div>
		</div>
	</div>

	<!-- KPI Strip -->
	<div class="flex gap-2 mb-4 overflow-x-auto">
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Recovery %</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-[#bef264]">{data.recoveryPct}%</span>
			</div>
			<div class="h-0.5 w-full bg-[#bef264]/20 mt-1"><div class="h-full bg-[#bef264]" style="width: {data.recoveryPct}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Issued (L)</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-white">{data.totalIssued.toLocaleString()}L</span>
			</div>
			<div class="h-0.5 w-full bg-white/5 mt-1"></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Recovered (L)</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-[#bef264]">{data.totalRecovered.toLocaleString()}L</span>
			</div>
			<div class="h-0.5 w-full bg-[#bef264]/20 mt-1"><div class="h-full bg-[#bef264]" style="width: {(data.totalRecovered / Math.max(data.totalIssued, 1)) * 100}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Lost (L)</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-[#ef4444]">{data.totalLost.toLocaleString()}L</span>
			</div>
			<div class="h-0.5 w-full bg-[#ef4444]/20 mt-1"><div class="h-full bg-[#ef4444]" style="width: {(data.totalLost / Math.max(data.totalIssued, 1)) * 100}%"></div></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">SSR Ratio</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-[#bef264]">{data.ssrRatio}</span>
			</div>
			<div class="h-0.5 w-full bg-white/5 mt-1"></div>
		</div>
		<div class="flex-1 min-w-[120px] bg-[#161616] border border-[#1e1e1e] p-2.5 flex flex-col justify-between">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Loss Value</span>
			<div class="flex items-baseline gap-2">
				<span class="text-xl font-black text-[#ef4444]">{fmt(data.totalLossValue)}</span>
			</div>
			<div class="h-0.5 w-full bg-[#ef4444]/20 mt-1"><div class="h-full bg-[#ef4444] w-full"></div></div>
		</div>
	</div>

	<!-- Main Grid -->
	<div class="grid grid-cols-12 gap-4 mb-4">
		<!-- Diagnostic Waterfall (8 cols) -->
		<div class="col-span-8 bg-[#161616] border border-[#1e1e1e] p-4 flex flex-col">
			<div class="flex justify-between items-center mb-6">
				<h2 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0] flex items-center gap-2">
					<span class="w-2 h-2 bg-[#bef264]"></span> Diagnostic Waterfall: Loss Bridge (Liters)
				</h2>
			</div>
			<div class="flex-1 flex items-end justify-between px-6" style="min-height: {maxHeight + 60}px">
				<!-- Bar 1: Issued -->
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

				<!-- Bar 6: Recovered -->
				<div class="relative w-20 flex flex-col items-center">
					<div class="w-full relative overflow-hidden" style="height: {recoveredHeight}px">
						<div class="absolute bottom-0 w-full h-full bg-[#bef264]/80"></div>
					</div>
					<span class="mt-2 text-[10px] font-bold text-[#bef264] uppercase">Recovered</span>
					<span class="text-[10px] text-[#666666]">{wf.recovered.toLocaleString()}L</span>
				</div>
			</div>
		</div>

		<!-- Right sidebar (4 cols) -->
		<div class="col-span-4 flex flex-col gap-4">
			<!-- Comparative Recovery Bullet Chart -->
			<div class="bg-[#161616] border border-[#1e1e1e] p-4 flex flex-col">
				<h2 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0] mb-4">Comparative Recovery</h2>
				<div class="space-y-4 pt-2">
					<div class="relative h-16 flex flex-col justify-center">
						<!-- Scale labels -->
						<div class="flex justify-between text-[8px] text-[#666666] mb-1">
							<span>75%</span><span>80%</span><span>85%</span><span>90%</span><span>95%</span>
						</div>
						<!-- Track -->
						<div class="w-full h-4 bg-[#0d0d0d] relative overflow-hidden">
							<!-- Target range (85-95) -->
							<div class="absolute h-full bg-[#1e1e1e] border-x border-[#2a2a2a]" style="left: {bulletScale(85)}%; width: {bulletScale(95) - bulletScale(85)}%"></div>
							<!-- Best marker -->
							<div class="absolute h-full w-0.5 bg-cyan-400 z-10" style="left: {bulletScale(data.bulletChart.best)}%"></div>
							<!-- 10-batch avg marker -->
							<div class="absolute h-full w-0.5 bg-[#a0a0a0] z-10" style="left: {bulletScale(data.bulletChart.rolling10)}%"></div>
							<!-- Current bar -->
							<div class="absolute left-0 h-full bg-[#bef264]" style="width: {bulletScale(data.bulletChart.current)}%"></div>
						</div>
						<div class="flex justify-between mt-2 text-[9px]">
							<span class="text-[#bef264]">CURRENT: {data.bulletChart.current}%</span>
							<span class="text-[#a0a0a0]">10-AVG: {data.bulletChart.rolling10}%</span>
							<span class="text-cyan-400">BEST: {data.bulletChart.best}%</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Loss Sources Ranking -->
			<div class="bg-[#161616] border border-[#1e1e1e] p-4 flex-1">
				<h2 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0] mb-3">Loss Sources Ranking</h2>
				<div class="space-y-3">
					{#each data.lossSources as source}
						<div class="flex items-center gap-3">
							<span class="w-16 text-[9px] text-[#666666] uppercase">{source.name}</span>
							<div class="flex-1 h-2 bg-[#0d0d0d]">
								<div class="h-full" style="width: {(source.value / data.maxLoss) * 100}%; background-color: {source.color}"></div>
							</div>
							<span class="text-[9px] font-bold w-14 text-right">{source.value.toLocaleString()}L</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Sub-Batch Performance Matrix -->
	<div class="bg-[#161616] border border-[#1e1e1e] flex flex-col">
		<div class="px-4 py-3 border-b border-[#1e1e1e] flex justify-between items-center">
			<h2 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0]">Sub-Batch Performance Matrix</h2>
			<div class="flex gap-4 text-[9px] font-bold">
				<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-[#bef264] rounded-full"></span> Optimal</span>
				<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-[#f59e0b] rounded-full"></span> Warning</span>
				<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span> Critical</span>
			</div>
		</div>
		<div class="max-h-[400px] overflow-y-auto">
			<table class="w-full text-left border-collapse text-[12px]">
				<thead class="sticky top-0 bg-[#161616] z-10 border-b border-[#1e1e1e]">
					<tr class="text-[9px] text-[#666666] uppercase font-black tracking-widest">
						<th class="px-4 py-2.5">Batch</th>
						<th class="px-4 py-2.5 text-right">Issued (L)</th>
						<th class="px-4 py-2.5 text-right">Recovered (L)</th>
						<th class="px-4 py-2.5 text-right">Lost (L)</th>
						<th class="px-4 py-2.5 text-right">Recovery %</th>
						<th class="px-4 py-2.5 text-right">vs Avg</th>
						<th class="px-4 py-2.5 text-right">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#1e1e1e]/50 font-mono">
					{#each data.batchPerformance as row}
						<tr class="hover:bg-white/5 {row.status === 'Critical' ? 'bg-[#ef4444]/5' : ''}">
							<td class="px-4 py-2 font-bold text-white">{row.batch_number}</td>
							<td class="px-4 py-2 text-right text-[#a0a0a0]">{row.issued}</td>
							<td class="px-4 py-2 text-right text-[#bef264]">{row.recovered}</td>
							<td class="px-4 py-2 text-right text-[#ef4444]">{row.lost}</td>
							<td class="px-4 py-2 text-right font-bold {row.status === 'Optimal' ? 'text-[#bef264]' : row.status === 'Warning' ? 'text-[#f59e0b]' : 'text-[#ef4444]'}">{row.recovery_pct}%</td>
							<td class="px-4 py-2 text-right {row.vsAvg != null && row.vsAvg >= 0 ? 'text-[#bef264]' : 'text-[#ef4444]'}">
								{row.vsAvg != null ? (row.vsAvg >= 0 ? '+' : '') + row.vsAvg + '%' : '—'}
							</td>
							<td class="px-4 py-2 text-right">
								{#if row.status === 'Optimal'}
									<span class="text-[9px] font-bold text-[#bef264] uppercase">{row.status}</span>
								{:else if row.status === 'Warning'}
									<span class="text-[9px] font-bold text-[#f59e0b] uppercase">{row.status}</span>
								{:else}
									<span class="text-[9px] font-bold text-[#ef4444] uppercase">{row.status}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
