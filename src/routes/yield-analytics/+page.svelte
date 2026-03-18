<script lang="ts">
	let { data } = $props();

	let activeTab = $state('production');

	const hasData = data.batchTable.length > 0;

	const maxYield = Math.max(...data.batchTable.map((b: any) => b.overall_yield_pct ?? 0), 1);

	// Scatter plot scaling
	const yieldRange = data.qualityCorrelation.length > 0
		? { min: Math.min(...data.qualityCorrelation.map((p: any) => p.yield_pct ?? 0)), max: Math.max(...data.qualityCorrelation.map((p: any) => p.yield_pct ?? 0)) }
		: { min: 0, max: 1 };
	const purityRange = data.qualityCorrelation.length > 0
		? {
			min: Math.min(...data.qualityCorrelation.filter((p: any) => p.purity_pct != null).map((p: any) => p.purity_pct)),
			max: Math.max(...data.qualityCorrelation.filter((p: any) => p.purity_pct != null).map((p: any) => p.purity_pct))
		}
		: { min: 0, max: 100 };

	function scaleX(v: number): number {
		const range = yieldRange.max - yieldRange.min || 1;
		return 20 + ((v - yieldRange.min) / range) * 360;
	}
	function scaleY(v: number): number {
		const range = purityRange.max - purityRange.min || 1;
		return 270 - ((v - purityRange.min) / range) * 250;
	}
	function dotColor(purity: number | null): string {
		if (purity == null) return '#ec5b13';
		if (purity >= 90) return '#bef264';
		if (purity >= 85) return '#ec5b13';
		return '#ef4444';
	}

	// Solvent trend line
	const maxCycleTime = Math.max(...data.cycleTimes.map((c: any) => c.hours ?? 0), 1);
</script>

<div class="min-h-screen bg-[#0d0d0d] text-white p-4">
	{#if !hasData}
		<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
	{:else}
	<!-- Header -->
	<div class="flex items-center justify-between mb-2">
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
	<div class="grid grid-cols-8 gap-px bg-[#1e1e1e] border border-[#1e1e1e] mb-3">
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Produced</p>
			<p class="text-lg font-black">{data.cascade.finalProduct} <span class="text-xs font-normal text-[#666666]">kg</span></p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Yield %</p>
			<p class="text-lg font-black text-[#bef264]">{data.overallYieldPct}%</p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Extract Rate</p>
			<p class="text-lg font-black">{data.extractRatePct}%</p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Proj. Daily</p>
			<p class="text-lg font-black">{data.projectedDaily} <span class="text-xs font-normal text-[#666666]">kg</span></p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Purity</p>
			<p class="text-lg font-black {data.qualitySpecs.purity != null && data.qualitySpecs.purity >= 90 ? 'text-[#bef264]' : ''}">{data.qualitySpecs.purity != null ? data.qualitySpecs.purity + '%' : 'N/A'}</p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Alkaloid %</p>
			<p class="text-lg font-black">{data.qualitySpecs.mitragynine != null ? data.qualitySpecs.mitragynine + '%' : 'N/A'}</p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Moisture</p>
			<p class="text-lg font-black {data.qualitySpecs.moisture != null && data.qualitySpecs.moisture <= 6 ? 'text-[#bef264]' : 'text-[#ef4444]'}">{data.qualitySpecs.moisture != null ? data.qualitySpecs.moisture + '%' : 'N/A'}</p>
		</div>
		<div class="bg-[#0d0d0d] p-3">
			<p class="text-[10px] text-[#666666] uppercase font-bold">Batch Count</p>
			<p class="text-lg font-black">{data.batchCount}</p>
		</div>
	</div>

	<!-- Tab Navigation -->
	<div class="flex gap-2 mb-4 bg-[#0d0d0d]/50 p-1">
		<button
			class="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest {activeTab === 'production' ? 'bg-[#bef264] text-[#0d0d0d]' : 'text-[#666666] hover:text-white'}"
			onclick={() => activeTab = 'production'}
		>Production</button>
		<button
			class="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest {activeTab === 'quality' ? 'bg-[#bef264] text-[#0d0d0d]' : 'text-[#666666] hover:text-white'}"
			onclick={() => activeTab = 'quality'}
		>Quality</button>
		<button
			class="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest {activeTab === 'trends' ? 'bg-[#bef264] text-[#0d0d0d]' : 'text-[#666666] hover:text-white'}"
			onclick={() => activeTab = 'trends'}
		>Trends</button>
	</div>

	<!-- Main Grid: 8-col main + 4-col sidebar -->
	<div class="grid grid-cols-12 gap-4">
		<!-- Main Content (8 cols) -->
		<div class="col-span-8 flex flex-col gap-4">
			{#if activeTab === 'production'}
				<!-- Mass Conversion Cascade -->
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-4">Mass Conversion Cascade</h3>
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
							<span class="text-[8px] text-[#666666] text-center leading-tight">spent cake</span>
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
						<!-- Wet Precip -->
						<div class="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] p-3 rounded text-center">
							<p class="text-[10px] text-[#666666] font-bold uppercase">Wet Precip</p>
							<p class="text-xl font-black">{data.cascade.wetPrecip}<span class="text-xs">kg</span></p>
						</div>
						<div class="flex flex-col items-center min-w-[40px]">
							<span class="material-symbols-outlined text-[#4b5563]">arrow_forward</span>
							<span class="text-[9px] bg-[#ef4444]/20 text-[#ef4444] px-1 rounded font-bold">-{data.cascadeLosses.wetToFinal}kg</span>
						</div>
						<!-- Final -->
						<div class="flex-1 bg-[#ec5b13] text-white p-3 rounded text-center">
							<p class="text-[10px] opacity-80 font-bold uppercase">Final Dried</p>
							<p class="text-xl font-black">{data.cascade.finalProduct}<span class="text-xs">kg</span></p>
						</div>
					</div>
				</div>

				<!-- Batch Performance Table -->
				<div class="bg-[#161616] border border-[#1e1e1e] flex flex-col">
					<div class="px-4 py-3 border-b border-[#1e1e1e]">
						<h3 class="text-[10px] font-black uppercase tracking-widest text-[#a0a0a0]">Batch Performance</h3>
					</div>
					<div class="max-h-[360px] overflow-y-auto">
						<table class="w-full text-left border-collapse">
							<thead class="sticky top-0 bg-[#161616] z-10">
								<tr class="text-[9px] font-black text-[#666666] uppercase tracking-widest border-b border-[#1e1e1e]">
									<th class="px-3 py-2">Batch</th>
									<th class="px-3 py-2 text-right">Input (kg)</th>
									<th class="px-3 py-2 text-right">Output (kg)</th>
									<th class="px-3 py-2 text-right">Yield %</th>
									<th class="px-3 py-2">Yield Bar</th>
									<th class="px-3 py-2 text-right">vs Avg</th>
								</tr>
							</thead>
							<tbody class="text-xs divide-y divide-[#1e1e1e]/50">
								{#each data.batchTable as batch}
									<tr class="hover:bg-white/5">
										<td class="px-3 py-1.5 font-mono font-bold text-white">{batch.batch_number}</td>
										<td class="px-3 py-1.5 text-right font-mono text-[#a0a0a0]">{batch.leaf_input_kg}</td>
										<td class="px-3 py-1.5 text-right font-mono text-[#bef264]">{batch.final_product_kg}</td>
										<td class="px-3 py-1.5 text-right font-mono font-bold">{batch.overall_yield_pct != null ? batch.overall_yield_pct.toFixed(2) + '%' : '—'}</td>
										<td class="px-3 py-1.5">
											<div class="h-1.5 w-full bg-[#0d0d0d] rounded-full overflow-hidden">
												<div class="h-full bg-[#ec5b13]" style="width: {((batch.overall_yield_pct ?? 0) / maxYield) * 100}%"></div>
											</div>
										</td>
										<td class="px-3 py-1.5 text-right font-mono {batch.vsAvg != null && batch.vsAvg >= 0 ? 'text-[#bef264]' : 'text-[#ef4444]'}">
											{batch.vsAvg != null ? (batch.vsAvg >= 0 ? '+' : '') + batch.vsAvg.toFixed(2) + '%' : '—'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

			{:else if activeTab === 'quality'}
				<!-- Yield Loss Waterfall -->
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-4">Yield Loss Waterfall</h3>
					<div class="space-y-4">
						{#each data.yieldLossWaterfall as stage}
							<div>
								<div class="flex items-center justify-between mb-1">
									<span class="text-[10px] uppercase text-[#a0a0a0]">{stage.stage}</span>
									<span class="text-[10px] font-mono font-bold">{stage.loss}{stage.unit}</span>
								</div>
								<div class="h-6 w-full bg-[#0d0d0d] overflow-hidden rounded">
									<div class="h-full bg-[#ef4444]/50" style="width: {(stage.loss / data.maxStageLoss) * 100}%"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Correlation Scatter (Yield vs Purity) -->
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-4">Correlation Scatter (Yield % vs Purity %)</h3>
					{#if data.qualityCorrelation.filter((p: any) => p.purity_pct != null).length > 0}
						<svg viewBox="0 0 400 300" class="w-full" style="max-height: 280px">
							<!-- Grid lines -->
							{#each [0, 1, 2, 3, 4] as i}
								<line x1="20" y1={20 + i * 62.5} x2="390" y2={20 + i * 62.5} stroke="#2a2a2a" stroke-width="0.5" />
								<line x1={20 + i * 92.5} y1="20" x2={20 + i * 92.5} y2="280" stroke="#2a2a2a" stroke-width="0.5" />
							{/each}
							<!-- Axis labels -->
							<text x="200" y="298" text-anchor="middle" fill="#666666" font-size="9">Yield %</text>
							<text x="8" y="150" text-anchor="middle" fill="#666666" font-size="9" transform="rotate(-90,8,150)">Purity %</text>
							<!-- Data points -->
							{#each data.qualityCorrelation.filter((p: any) => p.purity_pct != null) as point}
								<circle
									cx={scaleX(point.yield_pct)}
									cy={scaleY(point.purity_pct)}
									r="4"
									fill={dotColor(point.purity_pct)}
									opacity="0.8"
								/>
							{/each}
						</svg>
					{:else}
						<div class="h-48 flex items-center justify-center text-[#666666] text-sm">
							No HPLC purity data available yet
						</div>
					{/if}
				</div>

			{:else if activeTab === 'trends'}
				<!-- Solvent Performance Trend -->
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-2">Solvent Recovery Trend</h3>
					<p class="text-[10px] text-[#666666] mb-4">EtOH Recovery % per batch</p>
					<div class="h-40 flex items-end">
						<svg viewBox="0 0 400 160" class="w-full h-full" preserveAspectRatio="none">
							{#if data.solventTrend.length > 1}
								<path
									d="M {data.solventTrend.map((p: any, i: number) => `${(i / (data.solventTrend.length - 1)) * 380 + 10},${160 - ((p.etoh_recovery_pct ?? 0) / 100) * 150}`).join(' L ')}"
									fill="none"
									stroke="#bef264"
									stroke-width="2"
								/>
								<path
									d="M {data.solventTrend.map((p: any, i: number) => `${(i / (data.solventTrend.length - 1)) * 380 + 10},${160 - ((p.etoh_recovery_pct ?? 0) / 100) * 150}`).join(' L ')} L {380 + 10},160 L 10,160 Z"
									fill="#bef264"
									opacity="0.1"
								/>
							{/if}
						</svg>
					</div>
				</div>

				<!-- Batch Cycle Times -->
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-4">Batch Cycle Time (Hours)</h3>
					<div class="max-h-[300px] overflow-y-auto space-y-2">
						{#each data.cycleTimes as ct}
							<div class="flex items-center gap-2">
								<span class="text-xs text-[#a0a0a0] w-20 shrink-0 font-mono">{ct.batch_number.replace('SG-2026-', 'B-')}</span>
								<div class="flex-1 bg-[#0d0d0d] rounded-full h-3 relative">
									<div class="bg-[#ec5b13]/70 h-full rounded-full" style="width: {(ct.hours / maxCycleTime) * 100}%"></div>
								</div>
								<span class="text-xs font-bold text-white w-10 text-right">{ct.hours}h</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Sidebar (4 cols) — persistent -->
		<div class="col-span-4 flex flex-col gap-4">
			<!-- Quality Specs -->
			<div class="bg-[#161616] border border-[#1e1e1e] p-4">
				<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-3">Quality Specs</h3>
				<div class="space-y-4">
					<!-- Purity -->
					<div class="bg-[#0d0d0d] p-3 rounded border border-[#2a2a2a]">
						<div class="flex justify-between items-center mb-1">
							<span class="text-[10px] text-[#666666] uppercase">Purity</span>
							{#if data.qualitySpecs.purity != null}
								<div class="flex items-center gap-1">
									<div class="size-2 rounded-full {data.qualitySpecs.purity >= data.qualitySpecs.purityTarget ? 'bg-[#bef264]' : 'bg-[#ef4444]'}"></div>
									<span class="text-[10px] font-bold {data.qualitySpecs.purity >= data.qualitySpecs.purityTarget ? 'text-[#bef264]' : 'text-[#ef4444]'} uppercase">
										{data.qualitySpecs.purity >= data.qualitySpecs.purityTarget ? 'Pass' : 'Fail'}
									</span>
								</div>
							{:else}
								<span class="text-[10px] text-[#666666]">N/A</span>
							{/if}
						</div>
						<p class="text-xl font-black">{data.qualitySpecs.purity != null ? data.qualitySpecs.purity + '%' : 'No Data'}</p>
						<div class="mt-2 h-1 w-full bg-[#1e1e1e] rounded-full overflow-hidden">
							<div class="h-full bg-[#bef264]" style="width: {data.qualitySpecs.purity != null ? Math.min(data.qualitySpecs.purity, 100) : 0}%"></div>
						</div>
						<p class="text-[9px] text-[#666666] mt-1">Target: &ge;{data.qualitySpecs.purityTarget}%</p>
					</div>
					<!-- Moisture & Alkaloid -->
					<div class="grid grid-cols-2 gap-2">
						<div class="bg-[#0d0d0d] p-2 rounded border border-[#2a2a2a]">
							<p class="text-[9px] text-[#666666] uppercase">Moisture</p>
							<p class="text-sm font-black {data.qualitySpecs.moisture != null && data.qualitySpecs.moisture <= data.qualitySpecs.moistureTarget ? 'text-[#bef264]' : 'text-[#ef4444]'}">{data.qualitySpecs.moisture != null ? data.qualitySpecs.moisture + '%' : 'N/A'}</p>
							<p class="text-[8px] text-[#666666]">Target: &le;{data.qualitySpecs.moistureTarget}%</p>
						</div>
						<div class="bg-[#0d0d0d] p-2 rounded border border-[#2a2a2a]">
							<p class="text-[9px] text-[#666666] uppercase">Mitragynine</p>
							<p class="text-sm font-black">{data.qualitySpecs.mitragynine != null ? data.qualitySpecs.mitragynine + '%' : 'N/A'}</p>
							<p class="text-[8px] text-[#666666]">Target: &ge;{data.qualitySpecs.mitragynineTarget}%</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Stage Yield Breakdown -->
			<div class="bg-[#161616] border border-[#1e1e1e] p-4">
				<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-4">Stage Yield Breakdown</h3>
				<div class="space-y-3">
					{#each data.stageYields as sy}
						<div>
							<div class="flex justify-between mb-1">
								<span class="text-[10px] text-[#a0a0a0]">{sy.stage}</span>
								<span class="text-[10px] font-bold text-white">{sy.pct}%</span>
							</div>
							<div class="w-full bg-[#0d0d0d] rounded-full h-2">
								<div class="bg-[#ec5b13] h-2 rounded-full" style="width: {sy.pct}%"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Alkaloid Composition -->
			{#if data.alkaloids.length > 0}
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-3">Alkaloid Composition</h3>
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
				<div class="bg-[#161616] border border-[#1e1e1e] p-4">
					<h3 class="text-[10px] uppercase font-black tracking-widest text-[#a0a0a0] mb-3">Alkaloid Composition</h3>
					<p class="text-[10px] text-[#666666]">No HPLC data available</p>
				</div>
			{/if}
		</div>
	</div>
	{/if}
</div>
