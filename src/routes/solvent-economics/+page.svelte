<script lang="ts">
	let { data } = $props();
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-text-primary">Solvent Economic Analysis</h1>
			<p class="text-sm text-text-muted">Solvent material balance and recovery accounting</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary text-text-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">download</span>
			Export Ledger
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Total Loss Value</p>
			<p class="text-2xl font-black text-text-primary">${data.totalLossValue.toLocaleString()}</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Current Recovery</p>
			<p class="text-2xl font-black text-text-primary">{data.ethanol.avg_recovery}%</p>
			<p class="text-[10px] text-primary font-bold">Ethanol avg</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Net Ethanol Cost</p>
			<p class="text-2xl font-black text-text-primary">${data.netEthanolCost.toLocaleString()}</p>
			<p class="text-[10px] text-text-muted">Lost solvent value</p>
		</div>
		<div class="bg-bg-card border border-border-card p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Limonene Efficiency</p>
			<p class="text-2xl font-black text-text-primary">{data.limoneneEfficiency}%</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-6 mb-6">
		<!-- Ethanol Balance -->
		<div class="bg-bg-card border border-border-card rounded p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-bold text-text-primary flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">water_drop</span>
					Ethanol Material Balance
				</h3>
				<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">LITERS (L)</span>
			</div>
			<div class="space-y-3">
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material In (Total Issued)</span><span class="text-sm font-bold font-mono">{data.ethanol.total_issued.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material Recovered</span><span class="text-sm font-bold font-mono text-primary">{data.ethanol.total_recovered.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material Lost</span><span class="text-sm font-bold font-mono text-red-500">{data.ethanol.total_lost.toFixed(2)}</span></div>
				<div class="border-t border-border-card pt-3 flex justify-between">
					<span class="text-sm font-black text-text-primary uppercase">Ethanol Recovery Rate</span>
					<span class="text-sm font-black text-primary font-mono">{data.ethanol.avg_recovery}%</span>
				</div>
			</div>
		</div>

		<!-- Limonene Balance -->
		<div class="bg-bg-card border border-border-card rounded p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-bold text-text-primary flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-500">opacity</span>
					Limonene Material Balance
				</h3>
				<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">LITERS (L)</span>
			</div>
			<div class="space-y-3">
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material In (Total Issued)</span><span class="text-sm font-bold font-mono">{data.limonene.total_issued.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material Recovered</span><span class="text-sm font-bold font-mono text-primary">{data.limonene.total_recovered.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-text-secondary">Material Lost</span><span class="text-sm font-bold font-mono text-red-500">{data.limonene.total_lost.toFixed(2)}</span></div>
				<div class="border-t border-border-card pt-3 flex justify-between">
					<span class="text-sm font-black text-text-primary uppercase">Limonene Efficiency</span>
					<span class="text-sm font-black text-primary font-mono">{data.limoneneEfficiency}%</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Ethanol Ledger by Batch -->
	<div class="bg-bg-card border border-border-card rounded p-6">
		<h3 class="text-sm font-bold text-text-primary mb-4">Ethanol Ledger by Batch</h3>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-border-card">
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Batch</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Issued (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Recovered (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Lost (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Recovery %</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ethanolByBatch as row}
					<tr class="border-b border-border-subtle">
						<td class="py-3 text-sm font-bold text-text-primary">{row.batch_number}</td>
						<td class="py-3 text-sm text-text-secondary text-right font-mono">{row.ethanol_stock_used_l}</td>
						<td class="py-3 text-sm text-primary text-right font-mono font-bold">{row.total_ethanol_recovered_l}</td>
						<td class="py-3 text-sm text-red-500 text-right font-mono">{row.total_ethanol_loss_l}</td>
						<td class="py-3 text-sm font-bold text-right font-mono {row.recovery_rate_pct >= 95 ? 'text-primary' : 'text-amber-400'}">{row.recovery_rate_pct}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
