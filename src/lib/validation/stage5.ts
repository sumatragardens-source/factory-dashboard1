export function validateStage5Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage5Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const ap = Number(data.alkaloid_precipitate_kg);
	if (!ap || ap <= 0) errors.push('Alkaloid precipitate (kg) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
