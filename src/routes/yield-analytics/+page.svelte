<script lang="ts">
	let { data } = $props();

	const purity = data.hplc?.hplc_purity_pct ?? 0;
	const alkaloids = [
		{ name: 'Mitragynine', pct: data.hplc?.mitragynine_pct ?? 0, color: '#4a7c59' },
		{ name: '7-Hydroxymitragynine', pct: data.hplc?.hydroxy_mitragynine_pct ?? 0, color: '#6b9e78' },
		{ name: 'Paynantheine', pct: data.hplc?.paynantheine_pct ?? 0, color: '#93bf8d' },
		{ name: 'Speciogynine', pct: data.hplc?.speciogynine_pct ?? 0, color: '#b5d4b0' },
		{ name: 'Speciociliatine', pct: data.hplc?.speciociliatine_pct ?? 0, color: '#d4e8d1' },
		{ name: 'Non-alkaloids', pct: data.hplc?.non_alkaloids_pct ?? 0, color: '#94a3b8' }
	];

	// SVG donut math
	const radius = 60;
	const circumference = 2 * Math.PI * radius;
	function getDonutSegments(items: typeof alkaloids) {
		let offset = 0;
		return items.map((item) => {
			const length = (item.pct / 100) * circumference;
			const segment = { ...item, dasharray: `${length} ${circumference - length}`, dashoffset: -offset };
			offset += length;
			return segment;
		});
	}
	const segments = getDonutSegments(alkaloids);

	// Max bar values
	const maxYield = Math.max(...data.batchYields.map((b: any) => b.cumulative_yield_pct ?? 0), 15);
	const maxCycleTime = Math.max(...data.cycleTimes.map((c: any) => c.hours ?? 0), 1);
</script>

<div class="p-6">
	<div class="grid grid-cols-12 gap-6">
		<!-- Left Column: KPIs + Alkaloid Composition -->
		<div class="col-span-3 flex flex-col gap-4">
			<!-- Avg Annual Yield -->
			<div class="bg-bg-card border border-border-card rounded p-4">
				<p class="text-[10px] uppercase tracking-widest text-text-muted font-black">Avg. Annual Yield</p>
				<div class="flex items-baseline gap-2 mt-1">
					<p class="text-3xl font-black text-text-primary">{data.avgYield}%</p>
				</div>
			</div>

			<!-- Solvent Efficiency -->
			<div class="bg-bg-card border border-border-card rounded p-4">
				<p class="text-[10px] uppercase tracking-widest text-text-muted font-black">Solvent Efficiency</p>
				<div class="flex items-baseline gap-2 mt-1">
					<p class="text-3xl font-black text-text-primary">{data.solventEfficiency}%</p>
				</div>
			</div>

			<!-- Alkaloid Composition -->
			<div class="bg-bg-card border border-border-card rounded p-4">
				<p class="text-[10px] uppercase tracking-widest text-text-muted font-black mb-4">Alkaloid Composition</p>

				<div class="flex justify-center mb-4">
					<svg width="160" height="160" viewBox="0 0 160 160">
						{#each segments as seg}
							<circle
								cx="80" cy="80" r={radius}
								fill="none"
								stroke={seg.color}
								stroke-width="16"
								stroke-dasharray={seg.dasharray}
								stroke-dashoffset={seg.dashoffset}
								transform="rotate(-90 80 80)"
							/>
						{/each}
						<text x="80" y="75" text-anchor="middle" class="text-2xl font-black" fill="#3b4252">{purity}%</text>
						<text x="80" y="92" text-anchor="middle" class="text-[10px] uppercase" fill="#a3be8c">PURITY</text>
					</svg>
				</div>

				<div class="space-y-2">
					{#each alkaloids as alk}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="w-2 h-2 rounded-full" style="background-color: {alk.color}"></span>
								<span class="text-xs text-text-secondary">{alk.name}</span>
							</div>
							<span class="text-xs font-bold text-text-primary">{alk.pct}%</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Center Column -->
		<div class="col-span-6 flex flex-col gap-6">
			<!-- Yield Comparison by Batch -->
			<div class="bg-bg-card border border-border-card rounded p-6">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Yield Comparison by Batch</h3>
					<span class="text-xs font-bold text-primary">Target: 15.0%</span>
				</div>
				<div class="flex items-end gap-3 h-48">
					{#each data.batchYields as batch}
						<div class="flex-1 flex flex-col items-center gap-1">
							<div class="w-full bg-primary/20 rounded-t relative" style="height: {((batch.cumulative_yield_pct ?? 0) / maxYield) * 100}%">
								<div class="absolute inset-0 bg-primary/40 rounded-t"></div>
							</div>
							<span class="text-[10px] text-text-muted font-mono">{batch.batch_number.replace('SG-2026-', 'B-')}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Solvent Performance Trend -->
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Solvent Performance Trend</h3>
				<p class="text-[10px] text-text-muted mb-4">Recovery Rate (%)</p>
				<div class="h-40 flex items-end">
					<svg viewBox="0 0 400 160" class="w-full h-full" preserveAspectRatio="none">
						{#if data.solventTrend.length > 1}
							<path
								d="M {data.solventTrend.map((p: any, i: number) => `${(i / (data.solventTrend.length - 1)) * 380 + 10},${160 - ((p.recovery_rate_pct ?? 0) / 100) * 150}`).join(' L ')}"
								fill="none"
								stroke="#93bf8d"
								stroke-width="2.5"
							/>
							<path
								d="M {data.solventTrend.map((p: any, i: number) => `${(i / (data.solventTrend.length - 1)) * 380 + 10},${160 - ((p.recovery_rate_pct ?? 0) / 100) * 150}`).join(' L ')} L {380 + 10},160 L 10,160 Z"
								fill="url(#solventGradient)"
								opacity="0.2"
							/>
							<defs>
								<linearGradient id="solventGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="#93bf8d" />
									<stop offset="100%" stop-color="#93bf8d" stop-opacity="0" />
								</linearGradient>
							</defs>
						{/if}
					</svg>
				</div>
			</div>

			<!-- Stage Yield Analysis -->
			<div class="bg-bg-card border border-border-card rounded p-6">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Stage Yield Analysis</h3>
				<div class="space-y-4">
					{#each data.stageYields as sy}
						<div>
							<div class="flex justify-between mb-1">
								<span class="text-sm text-text-secondary">{sy.stage}</span>
								<span class="text-sm font-bold text-text-primary">{sy.pct}%</span>
							</div>
							<div class="w-full bg-bg-input rounded-full h-2.5">
								<div class="bg-primary h-2.5 rounded-full" style="width: {sy.pct}%"></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column -->
		<div class="col-span-3 flex flex-col gap-6">
			<!-- Cost Per KG Trend -->
			<div class="bg-bg-card border border-border-card rounded p-4">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Cost Per KG Trend</h3>
					<span class="text-sm font-black text-text-primary">${data.latestCostPerKg.toLocaleString()}</span>
				</div>
				<div class="h-24 flex items-end gap-1">
					{#each data.costPerKgData as cpk}
						<div class="flex-1 bg-border-card rounded-t" style="height: {Math.max((cpk.costPerKg / (Math.max(...data.costPerKgData.map((c: any) => c.costPerKg)) || 1)) * 100, 5)}%"></div>
					{/each}
				</div>
				<div class="flex justify-between mt-1">
					{#if data.costPerKgData.length > 0}
						<span class="text-[10px] text-text-muted">{data.costPerKgData[0].batch.replace('SG-2026-', 'B-')}</span>
						<span class="text-[10px] text-text-muted">{data.costPerKgData[data.costPerKgData.length - 1].batch.replace('SG-2026-', 'B-')}</span>
					{/if}
				</div>
			</div>

			<!-- Batch Cycle Time -->
			<div class="bg-bg-card border border-border-card rounded p-4">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-4">Batch Cycle Time (HRS)</h3>
				<div class="space-y-3">
					{#each data.cycleTimes as ct}
						<div class="flex items-center gap-2">
							<span class="text-xs text-text-secondary w-12 shrink-0 font-mono">{ct.batch_number.replace('SG-2026-', 'B-')}</span>
							<div class="flex-1 bg-bg-input rounded-full h-4 relative">
								<div class="bg-primary/70 h-full rounded-full" style="width: {(ct.hours / maxCycleTime) * 100}%"></div>
							</div>
							<span class="text-xs font-bold text-text-primary w-10 text-right">{ct.hours}h</span>
						</div>
					{/each}
				</div>
			</div>

			</div>
	</div>
</div>
