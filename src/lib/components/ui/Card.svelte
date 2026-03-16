<script lang="ts">
	interface Props {
		title?: string;
		children: import('svelte').Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="rounded-lg border border-border-card bg-bg-card p-6 shadow-sm">
	{#if title}
		<h3 class="mb-4 text-lg font-semibold text-text-primary">{title}</h3>
	{/if}
	{@render children()}
</div>
