export function validateStage7Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage7Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const pw = Number(data.precipitate_weight_kg);
	if (!pw || pw <= 0) errors.push('Precipitate weight (kg) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
