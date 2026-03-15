<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import Header from './Header.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}

	let { title = 'Operations', children }: Props = $props();
</script>

<div class="flex h-screen w-full overflow-hidden bg-bg-light">
	<Sidebar />
	<main class="flex-1 flex flex-col min-w-0">
		<Header {title} />
		<div class="flex-1 overflow-auto">
			{@render children()}
		</div>
	</main>
</div>
