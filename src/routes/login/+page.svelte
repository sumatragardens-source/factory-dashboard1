<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="min-h-screen bg-bg-page flex items-center justify-center p-4">
	<div class="w-full max-w-sm">
		<!-- Logo -->
		<div class="flex flex-col items-center mb-8">
			<div class="h-12 w-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
				<i class="fa-solid fa-leaf text-bg-dark text-xl"></i>
			</div>
			<h1 class="text-lg font-black tracking-tight text-text-primary uppercase">Sumatra Gardens</h1>
			<p class="text-[10px] uppercase tracking-[0.2em] text-text-muted font-bold mt-1">Factory Operations</p>
		</div>

		<!-- Login Card -->
		<div class="bg-bg-card border border-border-card rounded-xl p-6 shadow-xl shadow-black/20">
			<h2 class="text-sm font-bold text-text-primary mb-4">Sign in to continue</h2>

			{#if form?.error}
				<div class="mb-4 px-3 py-2 rounded-lg text-[11px] font-medium" style="background: rgba(196, 137, 106, 0.15); color: #C4896A; border: 1px solid rgba(196, 137, 106, 0.25);">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}>
				<div class="space-y-3">
					<div>
						<label for="username" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Username</label>
						<input
							id="username"
							name="username"
							type="text"
							autocomplete="username"
							required
							value={form?.username ?? ''}
							class="w-full bg-bg-page border border-border-card rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
							placeholder="Enter username"
						/>
					</div>
					<div>
						<label for="password" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Password</label>
						<input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							required
							class="w-full bg-bg-page border border-border-card rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors"
							placeholder="Enter password"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full mt-5 bg-primary text-bg-dark font-bold py-2.5 rounded-lg text-xs uppercase tracking-widest hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
						Signing in...
					{:else}
						Sign In
					{/if}
				</button>
			</form>
		</div>

		<p class="text-center text-[9px] text-text-muted/30 mt-6">Authorized personnel only</p>
	</div>
</div>
