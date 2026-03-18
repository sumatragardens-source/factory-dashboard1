<script lang="ts">
	import '../app.css';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		data: import('./$types').LayoutServerData;
		children: Snippet;
	}

	let { data, children }: Props = $props();
</script>

<AppShell title={data.pageTitle} alertCounts={data.alertCounts}>
	{@render children()}
</AppShell>
