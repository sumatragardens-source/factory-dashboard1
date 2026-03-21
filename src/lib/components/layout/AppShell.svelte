<script lang="ts">
	import Header from './Header.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		alertCounts?: { high: number; medium: number; low: number; total: number };
		children: Snippet;
	}

	let { title = 'Operations', alertCounts, children }: Props = $props();
</script>

<div class="flex flex-col h-screen w-full overflow-hidden bg-bg-page">
	<Header {title} {alertCounts} />
	<main class="flex-1 overflow-auto">
		{@render children()}
	</main>
</div>
