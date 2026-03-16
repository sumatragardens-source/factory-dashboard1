<script lang="ts">
	import { getStageName } from '$lib/constants/stageNames';
	let { data } = $props();
	const filterOptions = [
		{ value: 'all', label: 'All Time' },
		{ value: '3months', label: '3 Months' },
		{ value: '1month', label: '1 Month' },
		{ value: '1week', label: '1 Week' },
		{ value: 'today', label: 'Today' }
	];
</script>

<div class="min-h-screen bg-bg-page p-6">
	<!-- Back link -->
	<a href="/operations" class="inline-flex items-center gap-1 text-text-muted hover:text-text-secondary mb-4 text-sm">
		&larr; Back to Operations
	</a>

	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
		<h1 class="text-2xl font-semibold text-text-primary">
			Stage {data.stageNumber}: {getStageName(data.stageNumber)}
		</h1>
		<div class="flex gap-2">
			{#each filterOptions as opt}
				<a
					href="?filter={opt.value}"
					class="px-3 py-1.5 rounded text-sm transition-colors {data.filter === opt.value
						? 'bg-primary text-bg-page font-medium'
						: 'bg-bg-card border border-border-card text-text-secondary hover:bg-bg-card-hover'}"
				>
					{opt.label}
				</a>
			{/each}
		</div>
	</div>

	<!-- Batch count -->
	<p class="text-text-muted text-sm mb-6">
		{data.performance.batchCount} finalized batch{data.performance.batchCount !== 1 ? 'es' : ''}
	</p>

	<!-- KPI Cards -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
		{#if data.stageNumber === 1}
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Powder Yield</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgPowderYieldPct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Mass Balance Error</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgMassBalanceErrorPct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Total Input</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalInputKg} kg</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Total Output</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalOutputKg} kg</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Cycle Time</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgCycleTimeHours} hrs</p>
			</div>
		{:else if data.stageNumber === 2}
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Recovery Rate</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgRecoveryRatePct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Ethanol Used</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalEthanolUsedL} L</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Ethanol Recovered</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalEthanolRecoveredL} L</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Ethanol Lost</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalEthanolLostL} L</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Solvent Ratio</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgSolventRatio}</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Cycle Time</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgCycleTimeHours} hrs</p>
			</div>
		{:else if data.stageNumber === 3}
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Partition Yield</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgPartitionYieldPct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Limonene Recovery</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgLimoneneRecoveryPct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Cycle Time</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgCycleTimeHours} hrs</p>
			</div>
		{:else if data.stageNumber === 4}
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Cumulative Yield</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgCumulativeYieldPct}%</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Total Final Product</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.totalFinalProductKg} kg</p>
			</div>
			<div class="bg-bg-card border border-border-card rounded-lg p-4">
				<p class="text-text-muted text-xs uppercase tracking-wide mb-1">Avg Cycle Time</p>
				<p class="text-2xl font-semibold text-text-primary">{data.performance.avgCycleTimeHours} hrs</p>
			</div>
		{/if}
	</div>

	<!-- Batch Table -->
	<div class="bg-bg-card border border-border-card rounded-lg overflow-hidden">
		<div class="px-4 py-3 border-b border-border-subtle">
			<h2 class="text-lg font-medium text-text-primary">Finalized Batches</h2>
		</div>
		<div class="overflow-x-auto">
			{#if data.stageNumber === 1}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border-subtle">
							<th class="text-left px-4 py-3 text-text-muted font-medium">Batch</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Powder Weight (kg)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Yield (%)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">MBE (%)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Finalized</th>
						</tr>
					</thead>
					<tbody>
						{#each data.performance.batches as batch}
							<tr class="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
								<td class="px-4 py-3 text-text-primary">
									<a href="/batches/{batch.batch_id}" class="text-primary hover:underline">{batch.batch_number}</a>
								</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.powder_weight_kg ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.powder_yield_pct ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.mass_balance_error_pct ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-muted">{batch.finalized_at ? new Date(batch.finalized_at).toLocaleDateString() : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if data.stageNumber === 2}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border-subtle">
							<th class="text-left px-4 py-3 text-text-muted font-medium">Batch</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Extract Weight (kg)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Recovery (%)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Ethanol (L)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Finalized</th>
						</tr>
					</thead>
					<tbody>
						{#each data.performance.batches as batch}
							<tr class="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
								<td class="px-4 py-3 text-text-primary">
									<a href="/batches/{batch.batch_id}" class="text-primary hover:underline">{batch.batch_number}</a>
								</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.extract_weight_kg ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.recovery_rate_pct ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.ethanol_stock_used_l ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-muted">{batch.finalized_at ? new Date(batch.finalized_at).toLocaleDateString() : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if data.stageNumber === 3}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border-subtle">
							<th class="text-left px-4 py-3 text-text-muted font-medium">Batch</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Precipitate (kg)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Feed Weight (kg)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Limonene Used (L)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Limonene Recovered (L)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Finalized</th>
						</tr>
					</thead>
					<tbody>
						{#each data.performance.batches as batch}
							<tr class="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
								<td class="px-4 py-3 text-text-primary">
									<a href="/batches/{batch.batch_id}" class="text-primary hover:underline">{batch.batch_number}</a>
								</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.alkaloid_precipitate_kg ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.feed_weight_kg ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.limonene_volume_l ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.limonene_recovered_l ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-muted">{batch.finalized_at ? new Date(batch.finalized_at).toLocaleDateString() : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if data.stageNumber === 4}
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-border-subtle">
							<th class="text-left px-4 py-3 text-text-muted font-medium">Batch</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Final Product (kg)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Cumulative Yield (%)</th>
							<th class="text-right px-4 py-3 text-text-muted font-medium">Finalized</th>
						</tr>
					</thead>
					<tbody>
						{#each data.performance.batches as batch}
							<tr class="border-b border-border-subtle hover:bg-bg-card-hover transition-colors">
								<td class="px-4 py-3 text-text-primary">
									<a href="/batches/{batch.batch_id}" class="text-primary hover:underline">{batch.batch_number}</a>
								</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.final_product_weight_kg ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-secondary">{batch.cumulative_yield_pct ?? '-'}</td>
								<td class="text-right px-4 py-3 text-text-muted">{batch.finalized_at ? new Date(batch.finalized_at).toLocaleDateString() : '-'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		{#if data.performance.batches.length === 0}
			<div class="px-4 py-8 text-center text-text-muted">
				No finalized batches found for this time period.
			</div>
		{/if}
	</div>
</div>
