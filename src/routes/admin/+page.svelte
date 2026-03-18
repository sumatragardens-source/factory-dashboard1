<script lang="ts">
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import { parseCSV, validateColumns } from '$lib/utils/csvParser';

	let { data, form } = $props();

	let selectedTable = $state('');
	let csvText = $state('');
	let clearFirst = $state(false);
	let previewHeaders = $state<string[]>([]);
	let previewRows = $state<string[][]>([]);
	let validationMsg = $state('');

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			csvText = reader.result as string;
			updatePreview();
		};
		reader.readAsText(file);
	}

	function updatePreview() {
		if (!csvText || !selectedTable) {
			previewHeaders = [];
			previewRows = [];
			validationMsg = '';
			return;
		}
		const parsed = parseCSV(csvText);
		previewHeaders = parsed.headers;
		previewRows = parsed.rows.slice(0, 5);

		const expected = data.tableColumns[selectedTable];
		if (expected) {
			const { valid, missing, extra } = validateColumns(parsed.headers, expected);
			if (!valid) {
				validationMsg = `Missing columns: ${missing.join(', ')}`;
			} else if (extra.length > 0) {
				validationMsg = `Extra columns (will be imported): ${extra.join(', ')}`;
			} else {
				validationMsg = `${parsed.rows.length} rows ready to import`;
			}
		}
	}

	$effect(() => {
		if (selectedTable && csvText) updatePreview();
	});
</script>

<AppShell title="Admin — Data Import">
	<div class="p-6 max-w-5xl mx-auto space-y-6">
		<div class="bg-[#1a1a1a] border border-[#333] rounded-lg p-6">
			<h2 class="text-sm font-semibold text-[#e0e0e0] mb-4">CSV Import</h2>

			<form method="POST" action="?/import" class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="table" class="block text-xs text-[#999] mb-1">Target Table</label>
						<select
							id="table"
							name="table"
							bind:value={selectedTable}
							class="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-[#e0e0e0]"
						>
							<option value="">Select table...</option>
							{#each data.tables as table}
								<option value={table}>{table}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="csvFile" class="block text-xs text-[#999] mb-1">CSV File</label>
						<input
							id="csvFile"
							type="file"
							accept=".csv"
							onchange={handleFileChange}
							class="w-full bg-[#111] border border-[#444] rounded px-3 py-2 text-sm text-[#e0e0e0]"
						/>
					</div>
				</div>

				<input type="hidden" name="csvText" value={csvText} />

				<div class="flex items-center gap-4">
					<label class="flex items-center gap-2 text-xs text-[#999]">
						<input type="checkbox" name="clearFirst" bind:checked={clearFirst} class="rounded" />
						Clear table before import
					</label>
				</div>

				{#if validationMsg}
					<p class="text-xs text-[#999]">{validationMsg}</p>
				{/if}

				{#if selectedTable && data.tableColumns[selectedTable]}
					<div class="text-xs text-[#666]">
						Expected columns: {data.tableColumns[selectedTable].join(', ')}
					</div>
				{/if}

				{#if previewHeaders.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-[#333]">
									{#each previewHeaders as h}
										<th class="px-2 py-1 text-left text-[#999] font-medium">{h}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each previewRows as row}
									<tr class="border-b border-[#222]">
										{#each row as cell}
											<td class="px-2 py-1 text-[#ccc] max-w-[150px] truncate">{cell}</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
						{#if previewRows.length > 0}
							<p class="text-xs text-[#666] mt-1">Showing first {previewRows.length} rows</p>
						{/if}
					</div>
				{/if}

				<div class="flex gap-3">
					<button
						type="submit"
						disabled={!selectedTable || !csvText}
						class="px-4 py-2 bg-[#2a6f2a] text-white text-sm rounded hover:bg-[#348834] disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Import CSV
					</button>
				</div>
			</form>

			<form method="POST" action="?/clear" class="mt-4 pt-4 border-t border-[#333]">
				<input type="hidden" name="table" value={selectedTable} />
				<button
					type="submit"
					disabled={!selectedTable}
					class="px-4 py-2 bg-[#6f2a2a] text-white text-sm rounded hover:bg-[#883434] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					Clear {selectedTable || 'table'}
				</button>
			</form>
		</div>

		{#if form}
			<div class="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
				{#if form.success > 0}
					<p class="text-sm text-green-400">Imported {form.success} rows into {form.table}</p>
				{/if}
				{#if form.cleared}
					<p class="text-sm text-yellow-400">Cleared table: {form.table}</p>
				{/if}
				{#if form.errors && form.errors.length > 0}
					<div class="mt-2 space-y-1">
						{#each form.errors as err}
							<p class="text-xs text-red-400">{err}</p>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</AppShell>
