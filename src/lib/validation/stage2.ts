export function validateStage2Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage2Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const etoh = Number(data.etoh_vol_L);
	if (!etoh || etoh <= 0) errors.push('Ethanol volume (L) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
