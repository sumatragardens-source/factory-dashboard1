<script lang="ts">
	import { getProcessStageName } from '$lib/constants/stageNames';

	let { data } = $props();

	function resolveStageRelevance(text: string): string {
		return text.replace(/Stage (\d)/g, (_, n) => getProcessStageName(Number(n)));
	}

	const statusColors: Record<string, string> = {
		Running: 'bg-primary',
		Idle: 'bg-slate-300',
		Maintenance: 'bg-amber-500',
		Offline: 'bg-red-500'
	};
	const statusBadge: Record<string, string> = {
		Running: 'text-primary bg-primary/10',
		Idle: 'text-text-muted bg-bg-input',
		Maintenance: 'text-amber-400 bg-amber-900/20',
		Offline: 'text-red-400 bg-red-900/20'
	};
	const machineIcons: Record<string, string> = {
		Grinder: 'settings',
		Reactor: 'science',
		'Separation Vessel': 'swap_vert',
		Rotovap: 'rotate_right',
		'Drying Cabinet': 'thermostat'
	};
</script>

<div class="p-6">
	{#if data.machines.length === 0}
		<div class="text-center py-12 text-[#666666]"><p class="text-sm">No data available</p><p class="text-xs mt-1">Import data via the Admin page to get started.</p></div>
	{:else}
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-text-primary">Machine Operations</h1>
			<p class="text-sm text-text-muted">Machine utilization and operational status</p>
		</div>
		<button disabled title="Coming soon" class="bg-primary text-text-primary px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2 opacity-50 cursor-not-allowed">
			<span class="material-symbols-outlined text-sm">add</span>
			Add Machine
		</button>
	</div>

	<!-- Machine Cards Grid -->
	<div class="grid grid-cols-2 gap-4 mb-8">
		{#each data.machines as machine}
			<div class="bg-bg-card border border-border-card rounded p-6">
				<div class="flex items-start justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<span class="material-symbols-outlined text-primary">{machineIcons[machine.machine_type] ?? 'settings'}</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-text-primary">{machine.name}</h3>
							<p class="text-[10px] uppercase tracking-wider text-text-muted font-bold">{resolveStageRelevance(machine.stage_relevance ?? '')}</p>
						</div>
					</div>
					<span class="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded {statusBadge[machine.status]}">
						<span class="w-2 h-2 rounded-full {statusColors[machine.status]}"></span>
						{machine.status}
					</span>
				</div>

				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<p class="text-[10px] uppercase text-text-muted font-bold">Code</p>
						<p class="text-sm font-bold font-mono">{machine.code}</p>
					</div>
					<div>
						<p class="text-[10px] uppercase text-text-muted font-bold">Location</p>
						<p class="text-sm font-bold">{machine.location ?? '—'}</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button disabled title="Coming soon" class="flex-1 border border-border-card text-text-secondary py-2 rounded text-xs font-bold uppercase opacity-50 cursor-not-allowed">Maintenance</button>
					<button disabled title="Coming soon" class="flex-1 bg-primary text-text-primary py-2 rounded text-xs font-bold uppercase opacity-50 cursor-not-allowed">
						{machine.status === 'Running' ? 'Pause Ops' : 'Start'}
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Operation Log -->
	{#if data.recentEvents.length > 0}
		<div class="bg-bg-card border border-border-card rounded overflow-hidden">
			<div class="px-6 py-3 border-b border-border-card">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-text-muted">Operation Log</h3>
			</div>
			<div class="divide-y divide-border-subtle">
				{#each data.recentEvents as event}
					<div class="px-6 py-3 flex items-center gap-4">
						<span class="w-2 h-2 rounded-full {statusColors[event.new_status]}"></span>
						<div class="flex-1">
							<p class="text-xs font-bold text-text-primary">{event.machine_name}</p>
							<p class="text-[10px] text-text-muted">{event.previous_status} → {event.new_status} · {event.reason}</p>
						</div>
						<span class="text-[10px] text-text-muted font-mono">{new Date(event.created_at).toLocaleString()}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	{/if}
</div>
