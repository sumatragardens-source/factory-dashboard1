<script lang="ts">
	let { data } = $props();

	const statusColors: Record<string, string> = {
		Running: 'bg-primary',
		Idle: 'bg-slate-300',
		Maintenance: 'bg-amber-500',
		Offline: 'bg-red-500'
	};
	const statusBadge: Record<string, string> = {
		Running: 'text-primary bg-primary/10',
		Idle: 'text-slate-500 bg-slate-100',
		Maintenance: 'text-amber-600 bg-amber-50',
		Offline: 'text-red-600 bg-red-50'
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
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-black text-slate-900">Machine Operations</h1>
			<p class="text-sm text-slate-500">Machine registry and operational status</p>
		</div>
		<button class="bg-primary text-slate-900 px-4 py-2 rounded font-bold text-xs uppercase tracking-tighter flex items-center gap-2">
			<span class="material-symbols-outlined text-sm">add</span>
			Register Machine
		</button>
	</div>

	<!-- Machine Cards Grid -->
	<div class="grid grid-cols-2 gap-4 mb-8">
		{#each data.machines as machine}
			<div class="bg-white border border-slate-200 rounded p-6">
				<div class="flex items-start justify-between mb-4">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<span class="material-symbols-outlined text-primary">{machineIcons[machine.machine_type] ?? 'settings'}</span>
						</div>
						<div>
							<h3 class="text-sm font-bold text-slate-900">{machine.name}</h3>
							<p class="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{machine.stage_relevance}</p>
						</div>
					</div>
					<span class="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded {statusBadge[machine.status]}">
						<span class="w-2 h-2 rounded-full {statusColors[machine.status]}"></span>
						{machine.status}
					</span>
				</div>

				<div class="grid grid-cols-2 gap-4 mb-4">
					<div>
						<p class="text-[10px] uppercase text-slate-400 font-bold">Code</p>
						<p class="text-sm font-bold font-mono">{machine.code}</p>
					</div>
					<div>
						<p class="text-[10px] uppercase text-slate-400 font-bold">Location</p>
						<p class="text-sm font-bold">{machine.location ?? '—'}</p>
					</div>
				</div>

				<div class="flex gap-2">
					<button class="flex-1 border border-slate-200 text-slate-700 py-2 rounded text-xs font-bold uppercase hover:bg-slate-50 transition-colors">Maintenance</button>
					<button class="flex-1 bg-primary text-slate-900 py-2 rounded text-xs font-bold uppercase hover:brightness-105 transition-all">
						{machine.status === 'Running' ? 'Pause Ops' : 'Start'}
					</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Operation Log -->
	{#if data.recentEvents.length > 0}
		<div class="bg-white border border-slate-200 rounded overflow-hidden">
			<div class="px-6 py-3 border-b border-slate-200">
				<h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Operation Log</h3>
			</div>
			<div class="divide-y divide-slate-100">
				{#each data.recentEvents as event}
					<div class="px-6 py-3 flex items-center gap-4">
						<span class="w-2 h-2 rounded-full {statusColors[event.new_status]}"></span>
						<div class="flex-1">
							<p class="text-xs font-bold text-slate-900">{event.machine_name}</p>
							<p class="text-[10px] text-slate-500">{event.previous_status} → {event.new_status} · {event.reason}</p>
						</div>
						<span class="text-[10px] text-slate-400 font-mono">{new Date(event.created_at).toLocaleString()}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
