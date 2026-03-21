<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedId = $state(data.selected?.id ?? null);

	let selected = $derived(data.labResults.find((r) => r.id === selectedId) ?? data.labResults[0] ?? null);

	const statusBadge: Record<string, string> = {
		Completed: 'text-primary bg-primary/10',
		Pending: 'text-amber-400 bg-amber-900/20',
		'In Progress': 'text-blue-400 bg-blue-900/20',
		Failed: 'text-red-400 bg-red-900/20'
	};

	function getSpecStatus(pct: number | null): string {
		if (pct === null) return 'PENDING';
		if (pct > 1) return 'IN SPEC';
		return 'NORMAL';
	}
	function getSpecClass(pct: number | null): string {
		if (pct === null) return 'text-text-muted';
		if (pct > 1) return 'text-primary font-bold';
		return 'text-text-muted';
	}

	const alkaloids = $derived(
		selected
			? [
					{ name: 'Mitragynine', pct: selected.mitragynine_pct, loq: 0.01 },
					{ name: '7-hydroxymitragynine', pct: selected.hydroxy_mitragynine_pct, loq: 0.01 },
					{ name: 'Paynantheine', pct: selected.paynantheine_pct, loq: 0.01 },
					{ name: 'Speciogynine', pct: selected.speciogynine_pct, loq: 0.01 },
					{ name: 'Speciociliatine', pct: selected.speciociliatine_pct, loq: 0.01 }
				]
			: []
	);

	const totalAlkaloids = $derived(alkaloids.reduce((s, a) => s + (a.pct ?? 0), 0));
</script>

<div class="p-6">
	{#if data.labResults.length === 0}
		<div class="text-center py-12 text-[#666666]">
			<p class="text-sm">No data available</p>
			<p class="text-xs mt-1">Import data via the Admin page to get started.</p>
		</div>
	{:else}
		<div class="grid grid-cols-12 gap-6">
			<!-- Left Sidebar: Sample List -->
			<div class="col-span-3">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Active Samples</h3>
					<span class="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{data.totalSamples}</span>
				</div>
				<div class="space-y-2">
					{#each data.labResults as result}
						<button
							class="w-full text-left p-3 rounded border transition-colors {selectedId === result.id
								? 'border-primary bg-primary/5'
								: 'border-border-card bg-bg-card hover:border-border-card'}"
							onclick={() => (selectedId = result.id)}
						>
							<div class="flex items-center justify-between">
								<span class="text-sm font-bold text-text-primary">{result.batch_number}</span>
								<span
									class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded {statusBadge[result.status] ??
										statusBadge['Pending']}"
								>
									{selectedId === result.id ? 'CURRENT' : result.status.toUpperCase()}
								</span>
							</div>
							<p class="text-[10px] text-text-muted mt-1">{result.supplier} · {result.test_type}</p>
							<p class="text-[10px] text-text-muted">
								Received: {result.test_date
									? new Date(result.test_date).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})
									: '—'}
							</p>
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
							<h1 class="text-2xl font-black text-text-primary">Sample Analysis: {selected.batch_number}</h1>
							<p class="text-sm text-text-muted mt-1">
								{selected.supplier}. {selected.test_type} alkaloid profile and purity verification.
							</p>
						</div>
						<button
							disabled
							title="Coming soon"
							class="bg-primary text-text-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed"
						>
							<span class="material-symbols-outlined text-sm">download</span>
							Export PDF
						</button>
					</div>

					<div class="grid grid-cols-12 gap-6">
						<!-- HPLC Results Table -->
						<div class="col-span-8">
							{#if selected.test_type === 'HPLC'}
								<div class="bg-bg-card border border-border-card rounded p-6 mb-6">
									<div class="flex items-center justify-between mb-4">
										<h3 class="text-sm font-bold text-text-primary flex items-center gap-2">
											<span class="material-symbols-outlined text-primary">bar_chart</span>
											HPLC Quantitative Results
										</h3>
										<span class="text-[10px] text-text-muted font-mono">METHOD: ISO-17025 HPLC-DAD</span>
									</div>
									<table class="w-full text-left">
										<thead>
											<tr class="border-b border-border-card">
												<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Analyte</th>
												<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center"
													>Concentration (%)</th
												>
												<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-center"
													>LOQ (%)</th
												>
												<th class="py-3 text-[10px] font-black uppercase tracking-widest text-text-muted text-right"
													>Status</th
												>
											</tr>
										</thead>
										<tbody>
											{#each alkaloids as alk}
												<tr class="border-b border-border-subtle">
													<td class="py-3 text-sm text-text-primary">{alk.name}</td>
													<td class="py-3 text-sm font-bold text-text-primary text-center font-mono"
														>{alk.pct !== null ? `${alk.pct}%` : '< 0.02%'}</td
													>
													<td class="py-3 text-sm text-text-muted text-center font-mono">{alk.loq}%</td>
													<td class="py-3 text-right">
														<span class="text-[10px] font-bold uppercase {getSpecClass(alk.pct)}"
															>{getSpecStatus(alk.pct)}</span
														>
													</td>
												</tr>
											{/each}
											<tr class="border-t-2 border-border-card">
												<td class="py-3 text-sm font-bold text-text-primary">Total Alkaloids</td>
												<td class="py-3 text-sm font-bold text-primary text-center font-mono"
													>{totalAlkaloids.toFixed(2)}%</td
												>
												<td class="py-3 text-sm text-text-muted text-center">-</td>
												<td class="py-3 text-right">
													<span class="text-[10px] font-bold uppercase text-primary">VERIFIED</span>
												</td>
											</tr>
										</tbody>
									</table>
								</div>
							{/if}

							{#if selected.test_type === 'TLC'}
								<div class="bg-bg-card border border-border-card rounded p-6 mb-6">
									<h3 class="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
										<span class="material-symbols-outlined text-primary">science</span>
										TLC Analysis
									</h3>
									<div class="grid grid-cols-2 gap-4">
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Spots Observed</p>
											<p class="text-xl font-black text-text-primary">{selected.tlc_spots_observed ?? '—'}</p>
										</div>
										<div>
											<p class="text-[10px] uppercase text-text-muted font-bold">Rf Values</p>
											<p class="text-sm font-mono text-text-primary">{selected.tlc_rf_values ?? '—'}</p>
										</div>
									</div>
								</div>
							{/if}

							<!-- Bottom Cards: Metadata + Notes -->
							<div class="grid grid-cols-2 gap-6">
								<div class="bg-bg-card border border-border-card rounded p-6">
									<h3 class="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
										<span class="material-symbols-outlined text-primary text-sm">info</span>
										Metadata Info
									</h3>
									<div class="space-y-2">
										<div class="flex justify-between">
											<span class="text-xs text-text-muted">Lab Reference</span>
											<span class="text-xs font-bold text-text-primary">{selected.lab_reference ?? '—'}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-xs text-text-muted">Test Date</span>
											<span class="text-xs font-bold text-text-primary"
												>{selected.test_date
													? new Date(selected.test_date).toLocaleDateString('en-US', {
															month: 'short',
															day: 'numeric',
															year: 'numeric'
														})
													: '—'}</span
											>
										</div>
										{#if selected.hplc_purity_pct}
											<div class="flex justify-between">
												<span class="text-xs text-text-muted">Purity Rating</span>
												<span class="text-xs font-bold text-primary">{selected.hplc_purity_pct}%</span>
											</div>
										{/if}
									</div>
								</div>
								<div class="bg-bg-card border border-border-card rounded p-6">
									<h3 class="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
										<span class="material-symbols-outlined text-primary text-sm">edit_note</span>
										Internal Notes
									</h3>
									{#if selected.notes}
										<p class="text-xs text-text-secondary italic">"{selected.notes}"</p>
										{#if selected.reviewed_by}
											<p class="text-[10px] text-text-muted mt-2">— {selected.reviewed_by}</p>
										{/if}
									{:else}
										<p class="text-xs text-text-muted italic">No notes recorded.</p>
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
										<span class="material-symbols-outlined text-4xl text-text-secondary">image</span>
									</div>
									<p class="text-[10px] text-text-muted uppercase tracking-wider font-bold">TLC Fingerprint Scan</p>
									<p class="text-[10px] text-primary font-mono mt-1">SCAN ID: TLC-{selected.batch_number}-UV254</p>
								</div>
							{/if}

							<!-- Sample Status Timeline -->
							<div class="bg-bg-card border border-border-card rounded p-6">
								<h3 class="text-sm font-bold text-text-primary mb-4">Sample Status Timeline</h3>
								<div class="space-y-4">
									{#if selected.status === 'Completed'}
										<div class="flex items-start gap-3">
											<div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
												<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
											</div>
											<div>
												<p class="text-xs font-bold text-text-primary">Approved</p>
												<p class="text-[10px] text-text-muted">
													{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'}
												</p>
											</div>
										</div>
									{/if}
									<div class="flex items-start gap-3">
										<div class="w-6 h-6 rounded-full bg-blue-900/20 flex items-center justify-center mt-0.5">
											<span class="material-symbols-outlined text-blue-500 text-sm">receipt_long</span>
										</div>
										<div>
											<p class="text-xs font-bold text-text-primary">Received</p>
											<p class="text-[10px] text-text-muted">
												{selected.test_date ? new Date(selected.test_date).toLocaleString() : '—'}
											</p>
										</div>
									</div>
									<div class="flex items-start gap-3">
										<div class="w-6 h-6 rounded-full bg-amber-900/20 flex items-center justify-center mt-0.5">
											<span class="material-symbols-outlined text-amber-500 text-sm">science</span>
										</div>
										<div>
											<p class="text-xs font-bold text-text-primary">Submitted</p>
											<p class="text-[10px] text-text-muted">
												{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
											</p>
										</div>
									</div>
									<div class="flex items-start gap-3">
										<div class="w-6 h-6 rounded-full bg-bg-input flex items-center justify-center mt-0.5">
											<span class="material-symbols-outlined text-text-muted text-sm">pending</span>
										</div>
										<div>
											<p class="text-xs font-bold text-text-primary">Pending</p>
											<p class="text-[10px] text-text-muted">
												{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
											</p>
										</div>
									</div>
								</div>
							</div>

							<!-- Performed By -->
							<div class="bg-bg-card border border-border-card rounded p-6">
								<h3 class="text-sm font-bold text-text-primary mb-3">Analysis Team</h3>
								<div class="space-y-2">
									<div class="flex justify-between">
										<span class="text-xs text-text-muted">Performed by</span>
										<span class="text-xs font-bold text-text-primary">{selected.performed_by ?? '—'}</span>
									</div>
									<div class="flex justify-between">
										<span class="text-xs text-text-muted">Reviewed by</span>
										<span class="text-xs font-bold text-text-primary">{selected.reviewed_by ?? '—'}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<div class="bg-bg-card border border-border-card rounded p-12 text-center">
						<span class="material-symbols-outlined text-4xl text-text-muted">science</span>
						<p class="text-sm text-text-muted mt-2">No lab results available.</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
