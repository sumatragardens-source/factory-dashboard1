export function validateStage1Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage1Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const pw = Number(data.powder_weight_kg);
	if (!pw || pw <= 0) errors.push('Powder weight (kg) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
