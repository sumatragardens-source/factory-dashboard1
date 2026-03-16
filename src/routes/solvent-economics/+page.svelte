<script lang="ts">
	let { data } = $props();
</script>

<div class="p-6">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-slate-900">Solvent Economic Analysis</h1>
			<p class="text-sm text-slate-500">Solvent material balance and recovery accounting</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">download</span>
			Export Ledger
		</button>
	</div>

	<!-- KPI Cards -->
	<div class="grid grid-cols-4 gap-4 mb-6">
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Total Loss Value</p>
			<p class="text-2xl font-black text-slate-900">${data.totalLossValue.toLocaleString()}</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Current Recovery</p>
			<p class="text-2xl font-black text-slate-900">{data.ethanol.avg_recovery}%</p>
			<p class="text-[10px] text-primary font-bold">Ethanol avg</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Net Ethanol Cost</p>
			<p class="text-2xl font-black text-slate-900">${data.netEthanolCost.toLocaleString()}</p>
			<p class="text-[10px] text-slate-400">Lost solvent value</p>
		</div>
		<div class="bg-white border border-slate-200 p-4 rounded">
			<p class="text-[10px] uppercase tracking-wider text-primary font-bold">Limonene Efficiency</p>
			<p class="text-2xl font-black text-slate-900">{data.limoneneEfficiency}%</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-6 mb-6">
		<!-- Ethanol Balance -->
		<div class="bg-white border border-slate-200 rounded p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
					<span class="material-symbols-outlined text-primary">water_drop</span>
					Ethanol Material Balance
				</h3>
				<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">LITERS (L)</span>
			</div>
			<div class="space-y-3">
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material In (Total Issued)</span><span class="text-sm font-bold font-mono">{data.ethanol.total_issued.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material Recovered</span><span class="text-sm font-bold font-mono text-primary">{data.ethanol.total_recovered.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material Lost</span><span class="text-sm font-bold font-mono text-red-500">{data.ethanol.total_lost.toFixed(2)}</span></div>
				<div class="border-t border-slate-200 pt-3 flex justify-between">
					<span class="text-sm font-black text-slate-900 uppercase">Ethanol Recovery Rate</span>
					<span class="text-sm font-black text-primary font-mono">{data.ethanol.avg_recovery}%</span>
				</div>
			</div>
		</div>

		<!-- Limonene Balance -->
		<div class="bg-white border border-slate-200 rounded p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
					<span class="material-symbols-outlined text-amber-500">opacity</span>
					Limonene Material Balance
				</h3>
				<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">LITERS (L)</span>
			</div>
			<div class="space-y-3">
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material In (Total Issued)</span><span class="text-sm font-bold font-mono">{data.limonene.total_issued.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material Recovered</span><span class="text-sm font-bold font-mono text-primary">{data.limonene.total_recovered.toFixed(2)}</span></div>
				<div class="flex justify-between"><span class="text-sm text-slate-600">Material Lost</span><span class="text-sm font-bold font-mono text-red-500">{data.limonene.total_lost.toFixed(2)}</span></div>
				<div class="border-t border-slate-200 pt-3 flex justify-between">
					<span class="text-sm font-black text-slate-900 uppercase">Limonene Efficiency</span>
					<span class="text-sm font-black text-primary font-mono">{data.limoneneEfficiency}%</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Ethanol Ledger by Batch -->
	<div class="bg-white border border-slate-200 rounded p-6">
		<h3 class="text-sm font-bold text-slate-900 mb-4">Ethanol Ledger by Batch</h3>
		<table class="w-full text-left">
			<thead>
				<tr class="border-b border-slate-200">
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Batch</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Issued (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Recovered (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Lost (L)</th>
					<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Recovery %</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ethanolByBatch as row}
					<tr class="border-b border-slate-100">
						<td class="py-3 text-sm font-bold text-slate-900">{row.batch_number}</td>
						<td class="py-3 text-sm text-slate-600 text-right font-mono">{row.ethanol_volume_l}</td>
						<td class="py-3 text-sm text-primary text-right font-mono font-bold">{row.recovered_ethanol_l}</td>
						<td class="py-3 text-sm text-red-500 text-right font-mono">{row.ethanol_loss_l}</td>
						<td class="py-3 text-sm font-bold text-right font-mono {row.recovery_rate_pct >= 95 ? 'text-primary' : 'text-amber-600'}">{row.recovery_rate_pct}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
