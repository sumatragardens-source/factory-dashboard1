export function validateStage6Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage6Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
