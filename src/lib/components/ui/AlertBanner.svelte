<script lang="ts">
	import type { Alert } from '$lib/domain/types';

	let { alerts = [] }: { alerts: Alert[] } = $props();

	const unacked = $derived(alerts.filter(a => !a.acknowledged));
	const high = $derived(unacked.filter(a => a.severity === 'High'));
	const medium = $derived(unacked.filter(a => a.severity === 'Medium'));
	const low = $derived(unacked.filter(a => a.severity === 'Low'));
</script>

{#if unacked.length > 0}
	<div class="space-y-2">
		{#each high as alert}
			<div class="flex items-center gap-2 p-3 rounded-lg border bg-red-900/20 border-red-500/30 text-red-400 text-sm">
				<span class="material-symbols-outlined text-sm">error</span>
				<span class="font-bold">{alert.alert_type}</span>
				<span class="flex-1">{alert.message}</span>
				<span class="text-xs opacity-70">{alert.actual_value} vs {alert.threshold}</span>
			</div>
		{/each}
		{#each medium as alert}
			<div class="flex items-center gap-2 p-3 rounded-lg border bg-amber-900/20 border-amber-500/30 text-amber-400 text-sm">
				<span class="material-symbols-outlined text-sm">warning</span>
				<span class="font-bold">{alert.alert_type}</span>
				<span class="flex-1">{alert.message}</span>
				<span class="text-xs opacity-70">{alert.actual_value} vs {alert.threshold}</span>
			</div>
		{/each}
		{#each low as alert}
			<div class="flex items-center gap-2 p-3 rounded-lg border bg-blue-900/20 border-blue-500/30 text-blue-400 text-sm">
				<span class="material-symbols-outlined text-sm">info</span>
				<span class="font-bold">{alert.alert_type}</span>
				<span class="flex-1">{alert.message}</span>
				<span class="text-xs opacity-70">{alert.actual_value} vs {alert.threshold}</span>
			</div>
		{/each}
	</div>
{/if}
