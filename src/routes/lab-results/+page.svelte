<script lang="ts">
	let { data } = $props();

	let selectedId = $state(data.selected?.id ?? null);

	let selected = $derived(data.labResults.find((r: any) => r.id === selectedId) ?? data.labResults[0] ?? null);

	const statusBadge: Record<string, string> = {
		Completed: 'text-primary bg-primary/10',
		Pending: 'text-amber-600 bg-amber-50',
		'In Progress': 'text-blue-600 bg-blue-50',
		Failed: 'text-red-600 bg-red-50'
	};

	function getSpecStatus(pct: number | null): string {
		if (pct === null) return 'PENDING';
		if (pct > 1) return 'IN SPEC';
		return 'NORMAL';
	}
	function getSpecClass(pct: number | null): string {
		if (pct === null) return 'text-slate-400';
		if (pct > 1) return 'text-primary font-bold';
		return 'text-slate-500';
	}

	const alkaloids = $derived(selected ? [
		{ name: 'Mitragynine', pct: selected.mitragynine_pct, loq: 0.01 },
		{ name: '7-hydroxymitragynine', pct: selected.hydroxy_mitragynine_pct, loq: 0.01 },
		{ name: 'Paynantheine', pct: selected.paynantheine_pct, loq: 0.01 },
		{ name: 'Speciogynine', pct: selected.speciogynine_pct, loq: 0.01 },
		{ name: 'Speciociliatine', pct: selected.speciociliatine_pct, loq: 0.01 }
	] : []);

	const totalAlkaloids = $derived(alkaloids.reduce((s, a) => s + (a.pct ?? 0), 0));
</script>

<div class="p-6">
	<div class="grid grid-cols-12 gap-6">
		<!-- Left Sidebar: Sample List -->
		<div class="col-span-3">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Samples</h3>
				<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{data.totalSamples}</span>
			</div>
			<div class="space-y-2">
				{#each data.labResults as result}
					<button
						class="w-full text-left p-3 rounded border transition-colors {selectedId === result.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'}"
						onclick={() => selectedId = result.id}
					>
						<div class="flex items-center justify-between">
							<span class="text-sm font-bold text-slate-900">{result.batch_number}</span>
							<span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded {statusBadge[result.status] ?? statusBadge['Pending']}">
								{selectedId === result.id ? 'CURRENT' : result.status.toUpperCase()}
							</span>
						</div>
						<p class="text-[10px] text-slate-500 mt-1">{result.strain} · {result.test_type}</p>
						<p class="text-[10px] text-slate-400">Received: {result.test_date ? new Date(result.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
					</button>
				{/each}
			</div>
		</div>

		<!-- Main Content -->
		<div class="col-span-9">
			{#if selected}
				<!-- Header -->
				<div class="flex items-start justify-between mb-6">
					<div>
						<div class="flex items-center gap-3 mb-1">
							<p class="text-[10px] font-black uppercase tracking-widest text-primary">QA Analysis</p>
							<span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded {statusBadge[selected.status]}">
								{selected.status}
							</span>
						</div>
						<h1 class="text-2xl font-black text-slate-900">Sample Analysis: {selected.batch_number}</h1>
						<p class="text-sm text-slate-500 mt-1">{selected.strain}. {selected.test_type} alkaloid profile and purity verification.</p>
					</div>
					<button class="bg-primary text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2">
						<span class="material-symbols-outlined text-sm">download</span>
						Export PDF
					</button>
				</div>

				<div class="grid grid-cols-12 gap-6">
					<!-- HPLC Results Table -->
					<div class="col-span-8">
						{#if selected.test_type === 'HPLC'}
							<div class="bg-white border border-slate-200 rounded p-6 mb-6">
								<div class="flex items-center justify-between mb-4">
									<h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
										<span class="material-symbols-outlined text-primary">bar_chart</span>
										HPLC Quantitative Results
									</h3>
									<span class="text-[10px] text-slate-400 font-mono">METHOD: ISO-17025 HPLC-DAD</span>
								</div>
								<table class="w-full text-left">
									<thead>
										<tr class="border-b border-slate-200">
											<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Analyte</th>
											<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Concentration (%)</th>
											<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">LOQ (%)</th>
											<th class="py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Status</th>
										</tr>
									</thead>
									<tbody>
										{#each alkaloids as alk}
											<tr class="border-b border-slate-100">
												<td class="py-3 text-sm text-slate-900">{alk.name}</td>
												<td class="py-3 text-sm font-bold text-slate-900 text-center font-mono">{alk.pct !== null ? `${alk.pct}%` : '< 0.02%'}</td>
												<td class="py-3 text-sm text-slate-500 text-center font-mono">{alk.loq}%</td>
												<td class="py-3 text-right">
													<span class="text-[10px] font-bold uppercase {getSpecClass(alk.pct)}">{getSpecStatus(alk.pct)}</span>
												</td>
											</tr>
										{/each}
										<tr class="border-t-2 border-slate-200">
											<td class="py-3 text-sm font-bold text-slate-900">Total Alkaloids</td>
											<td class="py-3 text-sm font-bold text-primary text-center font-mono">{totalAlkaloids.toFixed(2)}%</td>
											<td class="py-3 text-sm text-slate-500 text-center">-</td>
											<td class="py-3 text-right">
												<span class="text-[10px] font-bold uppercase text-primary">VERIFIED</span>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						{/if}

						{#if selected.test_type === 'TLC'}
							<div class="bg-white border border-slate-200 rounded p-6 mb-6">
								<h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
									<span class="material-symbols-outlined text-primary">science</span>
									TLC Analysis
								</h3>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<p class="text-[10px] uppercase text-slate-400 font-bold">Spots Observed</p>
										<p class="text-xl font-black text-slate-900">{selected.tlc_spots_observed ?? '—'}</p>
									</div>
									<div>
										<p class="text-[10px] uppercase text-slate-400 font-bold">Rf Values</p>
										<p class="text-sm font-mono text-slate-900">{selected.tlc_rf_values ?? '—'}</p>
									</div>
								</div>
							</div>
						{/if}

						<!-- Bottom Cards: Metadata + Notes -->
						<div class="grid grid-cols-2 gap-6">
							<div class="bg-white border border-slate-200 rounded p-6">
								<h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
									<span class="material-symbols-outlined text-primary text-sm">info</span>
									Metadata Info
								</h3>
								<div class="space-y-2">
									<div class="flex justify-between">
										<span class="text-xs text-slate-500">Lab Reference</span>
										<span class="text-xs font-bold text-slate-900">{selected.lab_reference ?? '—'}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-xs text-slate-500">Test Date</span>
										<span class="text-xs font-bold text-slate-900">{selected.test_date ? new Date(selected.test_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
									</div>
									{#if selected.hplc_purity_pct}
										<div class="flex justify-between">
											<span class="text-xs text-slate-500">Purity Rating</span>
											<span class="text-xs font-bold text-primary">{selected.hplc_purity_pct}%</span>
										</div>
									{/if}
								</div>
							</div>
							<div class="bg-white border border-slate-200 rounded p-6">
								<h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
									<span class="material-symbols-outlined text-primary text-sm">edit_note</span>
									Internal Notes
								</h3>
								{#if selected.notes}
									<p class="text-xs text-slate-600 italic">"{selected.notes}"</p>
									{#if selected.reviewed_by}
										<p class="text-[10px] text-slate-400 mt-2">— {selected.reviewed_by}</p>
									{/if}
								{:else}
									<p class="text-xs text-slate-400 italic">No notes recorded.</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- Right Sidebar -->
					<div class="col-span-4 flex flex-col gap-6">
						<!-- TLC Fingerprint -->
						{#if selected.test_type === 'HPLC'}
							<div class="bg-slate-800 rounded p-4 text-center">
								<div class="h-40 bg-slate-900/50 rounded mb-2 flex items-center justify-center">
									<span class="material-symbols-outlined text-4xl text-slate-600">image</span>
								</div>
								<p class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">TLC Fingerprint Scan</p>
								<p class="text-[10px] text-primary font-mono mt-1">SCAN ID: TLC-{selected.batch_number}-UV254</p>
							</div>
						{/if}

						<!-- Sample Status Timeline -->
						<div class="bg-white border border-slate-200 rounded p-6">
							<h3 class="text-sm font-bold text-slate-900 mb-4">Sample Status Timeline</h3>
							<div class="space-y-4">
								{#if selected.status === 'Completed'}
									<div class="flex items-start gap-3">
										<div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
											<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
										</div>
										<div>
											<p class="text-xs font-bold text-slate-900">Approved</p>
											<p class="text-[10px] text-slate-400">{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'}</p>
										</div>
									</div>
								{/if}
								<div class="flex items-start gap-3">
									<div class="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
										<span class="material-symbols-outlined text-blue-500 text-sm">receipt_long</span>
									</div>
									<div>
										<p class="text-xs font-bold text-slate-900">Received</p>
										<p class="text-[10px] text-slate-400">{selected.test_date ? new Date(selected.test_date).toLocaleString() : '—'}</p>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center mt-0.5">
										<span class="material-symbols-outlined text-amber-500 text-sm">science</span>
									</div>
									<div>
										<p class="text-xs font-bold text-slate-900">Submitted</p>
										<p class="text-[10px] text-slate-400">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</p>
									</div>
								</div>
								<div class="flex items-start gap-3">
									<div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
										<span class="material-symbols-outlined text-slate-400 text-sm">pending</span>
									</div>
									<div>
										<p class="text-xs font-bold text-slate-900">Pending</p>
										<p class="text-[10px] text-slate-400">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Performed By -->
						<div class="bg-white border border-slate-200 rounded p-6">
							<h3 class="text-sm font-bold text-slate-900 mb-3">Analysis Team</h3>
							<div class="space-y-2">
								<div class="flex justify-between">
									<span class="text-xs text-slate-500">Performed by</span>
									<span class="text-xs font-bold text-slate-900">{selected.performed_by ?? '—'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-xs text-slate-500">Reviewed by</span>
									<span class="text-xs font-bold text-slate-900">{selected.reviewed_by ?? '—'}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-white border border-slate-200 rounded p-12 text-center">
					<span class="material-symbols-outlined text-4xl text-slate-300">science</span>
					<p class="text-sm text-slate-500 mt-2">No lab results available.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
