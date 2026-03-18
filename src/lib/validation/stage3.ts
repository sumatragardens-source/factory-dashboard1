export function validateStage3Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage3Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const aq = Number(data.acidic_aq_vol_L);
	if (!aq || aq <= 0) errors.push('Acidic aqueous volume (L) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
