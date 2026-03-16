export function validateStage8Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage8Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const fp = Number(data.final_product_weight_kg);
	if (!fp || fp <= 0) errors.push('Final product weight (kg) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
