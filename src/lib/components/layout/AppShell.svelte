<script lang="ts">
	import Header from './Header.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}

	let { title = 'Operations', children }: Props = $props();
</script>

<div class="flex flex-col h-screen w-full overflow-hidden bg-bg-page">
	<Header {title} />
	<div class="flex-1 overflow-auto">
		{@render children()}
	</div>
</div>
