<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const hasData = data.batchTable.length > 0;

	// Best/worst batch by overall_yield_pct
	const validBatches = data.batchTable.filter(b => b.overall_yield_pct != null);
	const bestBatch = validBatches.length > 0
		? validBatches.reduce((a, b) => (a.overall_yield_pct ?? 0) > (b.overall_yield_pct ?? 0) ? a : b)
		: null;
	const worstBatch = validBatches.length > 0
		? validBatches.reduce((a, b) => (a.overall_yield_pct ?? 0) < (b.overall_yield_pct ?? 0) ? a : b)
		: null;

	// Bar chart: most recent 20 batches
	const chartBatches = data.batchTable.slice(-20);
	const maxYield = Math.max(...chartBatches.map(b => b.overall_yield_pct ?? 0), 1);
</script>

<div class="min-h-screen bg-[#0d0d0d] text-white p-4">
	{#if !hasData}
		<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
	{:else}
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<div class="size-8 bg-[#ec5b13] flex items-center justify-center rounded">
				<span class="material-symbols-outlined text-[#0d0d0d] font-bold text-sm">science</span>
			</div>
			<div>
				<h1 class="text-sm font-black tracking-tighter uppercase leading-none">Yield & Quality Intelligence</h1>
				<p class="text-[10px] text-[#ec5b13] font-bold tracking-[0.2em] uppercase">{data.batchCount} Batches Analyzed</p>
			</div>
		</div>
	</div>

	<!-- KPI Strip -->
	<div class="flex gap-2 mb-4 overflow-x-auto">
		<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Avg Yield</span>
			<div class="text-xl font-black text-white">{data.overallYieldPct.toFixed(2)}%</div>
		</div>
		<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Extract Rate</span>
			<div class="text-xl font-black text-white">{data.extractRatePct}%</div>
		</div>
		<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Total Batches</span>
			<div class="text-xl font-black text-white">{data.batchCount}</div>
		</div>
		<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Best Recovery</span>
			<div class="text-xl font-black text-[#bef264]">{bestBatch ? bestBatch.overall_yield_pct.toFixed(2) + '%' : '—'}</div>
			{#if bestBatch}
				<span class="text-[10px] font-bold text-[#666666]">{bestBatch.batch_number}</span>
			{/if}
		</div>
		<div class="flex-1 min-w-[140px] bg-gray-900 border border-white/10 rounded-lg p-3">
			<span class="text-[9px] font-bold text-[#666666] uppercase tracking-widest">Worst Recovery</span>
			<div class="text-xl font-black text-[#ef4444]">{worstBatch ? worstBatch.overall_yield_pct.toFixed(2) + '%' : '—'}</div>
			{#if worstBatch}
				<span class="text-[10px] font-bold text-[#666666]">{worstBatch.batch_number}</span>
			{/if}
		</div>
	</div>

	<!-- Main Grid -->
	<div class="grid grid-cols-12 gap-4">
		<!-- Left column (8 cols) -->
		<div class="col-span-8 flex flex-col gap-4">
			<!-- Mass Conversion Cascade -->
			<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
				<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Mass Conversion Cascade</h2>
				<div class="flex items-center justify-between gap-2">
					<!-- Leaf -->
					<div class="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] p-3 rounded text-center">
						<p class="text-[10px] text-[#666666] font-bold uppercase">Raw Leaf</p>
						<p class="text-xl font-black">{data.cascade.leaf.toLocaleString()}<span class="text-xs">kg</span></p>
					</div>
					<div class="flex flex-col items-center min-w-[40px]">
						<span class="material-symbols-outlined text-[#4b5563]">arrow_forward</span>
						<span class="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">-{data.cascadeLosses.leafToPowder}kg</span>
					</div>
					<!-- Powder -->
					<div class="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] p-3 rounded text-center">
						<p class="text-[10px] text-[#666666] font-bold uppercase">Powder</p>
						<p class="text-xl font-black">{data.cascade.powder.toLocaleString()}<span class="text-xs">kg</span></p>
					</div>
					<div class="flex flex-col items-center min-w-[40px]">
						<span class="material-symbols-outlined text-[#4b5563]">arrow_forward</span>
						<span class="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">-{data.cascadeLosses.powderToCrude}kg</span>
					</div>
					<!-- Crude -->
					<div class="flex-1 bg-[#bef264]/10 border border-[#bef264]/30 p-3 rounded text-center">
						<p class="text-[10px] text-[#bef264] font-bold uppercase">Crude</p>
						<p class="text-xl font-black">{data.cascade.crude}<span class="text-xs">kg</span></p>
					</div>
					<div class="flex flex-col items-center min-w-[40px]">
						<span class="material-symbols-outlined text-[#4b5563]">arrow_forward</span>
						<span class="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">-{data.cascadeLosses.crudeToWet}kg</span>
					</div>
					<!-- Final -->
					<div class="flex-1 bg-[#ec5b13] text-white p-3 rounded text-center">
						<p class="text-[10px] opacity-80 font-bold uppercase">Final Dried</p>
						<p class="text-xl font-black">{data.cascade.finalProduct}<span class="text-xs">kg</span></p>
					</div>
				</div>
			</div>

			<!-- Yield Comparison Chart -->
			<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
				<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Yield Comparison (Recent 20 Batches)</h2>
				<div class="space-y-1.5 relative">
					{#each chartBatches as batch}
						<div class="flex items-center gap-2">
							<span class="text-[9px] font-mono text-[#a0a0a0] w-24 truncate shrink-0">{batch.batch_number}</span>
							<div class="flex-1 h-3 bg-[#0d0d0d] rounded relative overflow-hidden">
								<div
									class="h-full rounded {(batch.overall_yield_pct ?? 0) >= data.avgYield ? 'bg-[#bef264]' : 'bg-[#ef4444]'}"
									style="width: {((batch.overall_yield_pct ?? 0) / maxYield) * 100}%"
								></div>
							</div>
							<span class="text-[9px] font-mono font-bold text-white w-12 text-right">{batch.overall_yield_pct != null ? batch.overall_yield_pct.toFixed(2) + '%' : '—'}</span>
						</div>
					{/each}
					<!-- Average line indicator -->
					{#if maxYield > 0}
						<div class="mt-2 flex items-center gap-2 text-[9px] text-[#666666]">
							<span class="w-2 h-0.5 bg-[#666666]"></span> Avg: {data.avgYield.toFixed(2)}%
						</div>
					{/if}
				</div>
			</div>

			<!-- Stage Yield Breakdown -->
			<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
				<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Stage Yield Breakdown</h2>
				<div class="space-y-3">
					{#each data.stageYields as sy}
						<div>
							<div class="flex justify-between mb-1">
								<span class="text-[10px] text-[#a0a0a0]">{sy.stage}</span>
								<span class="text-[10px] font-bold text-white">{sy.pct}%</span>
							</div>
							<div class="w-full bg-[#0d0d0d] rounded-full h-2.5">
								<div class="h-full rounded-full {sy.pct >= 80 ? 'bg-[#bef264]' : sy.pct >= 50 ? 'bg-[#ec5b13]' : 'bg-[#ef4444]'}" style="width: {sy.pct}%"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right column (4 cols) -->
		<div class="col-span-4 flex flex-col gap-4">
			<!-- Quality Specs Panel -->
			<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
				<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Quality Specs</h2>
				<div class="space-y-4">
					<!-- Purity -->
					<div>
						<div class="flex justify-between items-center mb-1">
							<span class="text-[10px] text-[#a0a0a0] uppercase">Purity</span>
							{#if data.qualitySpecs.purity != null}
								{#if data.qualitySpecs.purity >= 90}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#bef264]/20 text-[#bef264]">PASS</span>
								{:else}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444]">FAIL</span>
								{/if}
							{:else}
								<span class="text-[10px] text-[#666666]">N/A</span>
							{/if}
						</div>
						<p class="text-lg font-black">{data.qualitySpecs.purity != null ? data.qualitySpecs.purity + '%' : 'No Data'}</p>
						<div class="mt-1 h-1.5 w-full bg-[#0d0d0d] rounded-full overflow-hidden">
							<div class="h-full rounded-full {data.qualitySpecs.purity != null && data.qualitySpecs.purity >= 90 ? 'bg-[#bef264]' : 'bg-[#ef4444]'}" style="width: {data.qualitySpecs.purity != null ? Math.min(data.qualitySpecs.purity, 100) : 0}%"></div>
						</div>
						<p class="text-[9px] text-[#666666] mt-1">Target: &ge;90%</p>
					</div>

					<!-- Mitragynine -->
					<div>
						<div class="flex justify-between items-center mb-1">
							<span class="text-[10px] text-[#a0a0a0] uppercase">Mitragynine %</span>
							{#if data.qualitySpecs.mitragynine != null}
								{#if data.qualitySpecs.mitragynine >= 1.0}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#bef264]/20 text-[#bef264]">PASS</span>
								{:else}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444]">FAIL</span>
								{/if}
							{:else}
								<span class="text-[10px] text-[#666666]">N/A</span>
							{/if}
						</div>
						<p class="text-lg font-black">{data.qualitySpecs.mitragynine != null ? data.qualitySpecs.mitragynine + '%' : 'No Data'}</p>
						<div class="mt-1 h-1.5 w-full bg-[#0d0d0d] rounded-full overflow-hidden">
							<div class="h-full rounded-full {data.qualitySpecs.mitragynine != null && data.qualitySpecs.mitragynine >= 1.0 ? 'bg-[#bef264]' : 'bg-[#ef4444]'}" style="width: {data.qualitySpecs.mitragynine != null ? Math.min(data.qualitySpecs.mitragynine * 10, 100) : 0}%"></div>
						</div>
						<p class="text-[9px] text-[#666666] mt-1">Target: &ge;1.0%</p>
					</div>

					<!-- Moisture -->
					<div>
						<div class="flex justify-between items-center mb-1">
							<span class="text-[10px] text-[#a0a0a0] uppercase">Moisture %</span>
							{#if data.qualitySpecs.moisture != null}
								{#if data.qualitySpecs.moisture <= 6}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#bef264]/20 text-[#bef264]">PASS</span>
								{:else}
									<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444]">FAIL</span>
								{/if}
							{:else}
								<span class="text-[10px] text-[#666666]">N/A</span>
							{/if}
						</div>
						<p class="text-lg font-black">{data.qualitySpecs.moisture != null ? data.qualitySpecs.moisture + '%' : 'No Data'}</p>
						<div class="mt-1 h-1.5 w-full bg-[#0d0d0d] rounded-full overflow-hidden">
							<div class="h-full rounded-full {data.qualitySpecs.moisture != null && data.qualitySpecs.moisture <= 6 ? 'bg-[#bef264]' : 'bg-[#ef4444]'}" style="width: {data.qualitySpecs.moisture != null ? Math.min((data.qualitySpecs.moisture / 12) * 100, 100) : 0}%"></div>
						</div>
						<p class="text-[9px] text-[#666666] mt-1">Target: &le;6%</p>
					</div>
				</div>
			</div>

			<!-- Alkaloid Composition -->
			{#if data.alkaloids.length > 0}
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Alkaloid Composition</h2>
					<div class="space-y-2">
						{#each data.alkaloids as alk}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="w-2 h-2 rounded-full" style="background-color: {alk.color}"></span>
									<span class="text-[10px] text-[#a0a0a0]">{alk.name}</span>
								</div>
								<span class="text-[10px] font-bold text-white">{alk.pct}%</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="bg-[#161616] border border-[#1e1e1e] rounded-lg p-4">
					<h2 class="text-[10px] font-bold text-[#666666] uppercase tracking-widest mb-3">Alkaloid Composition</h2>
					<p class="text-[10px] text-[#666666]">No HPLC data available</p>
				</div>
			{/if}
		</div>
	</div>
	{/if}
</div>
