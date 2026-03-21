/**
 * Simple CSV parser — no npm dependency.
 * Handles quoted fields with embedded commas and newlines.
 */

export interface ParsedCSV {
	headers: string[];
	rows: string[][];
}

export function parseCSV(text: string): ParsedCSV {
	const lines: string[][] = [];
	let current: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < text.length && text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				current.push(field.trim());
				field = '';
			} else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
				current.push(field.trim());
				if (current.some((f) => f !== '')) lines.push(current);
				current = [];
				field = '';
				if (ch === '\r') i++;
			} else {
				field += ch;
			}
		}
	}
	// Last field
	current.push(field.trim());
	if (current.some((f) => f !== '')) lines.push(current);

	if (lines.length === 0) return { headers: [], rows: [] };

	return {
		headers: lines[0],
		rows: lines.slice(1)
	};
}

export function validateColumns(
	headers: string[],
	expected: string[]
): { valid: boolean; missing: string[]; extra: string[] } {
	const headerSet = new Set(headers.map((h) => h.toLowerCase()));
	const expectedSet = new Set(expected.map((e) => e.toLowerCase()));
	const missing = expected.filter((e) => !headerSet.has(e.toLowerCase()));
	const extra = headers.filter((h) => !expectedSet.has(h.toLowerCase()));
	return { valid: missing.length === 0, missing, extra };
}
