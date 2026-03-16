export function validateStage2Save(_data: Record<string, unknown>): string[] {
	return [];
}

export function validateStage2Finalize(data: Record<string, unknown>): string[] {
	const errors: string[] = [];
	const grade = Number(data.ethanol_stock_grade_pct);
	if (!grade || (grade !== 70 && grade !== 96)) errors.push('Ethanol stock grade must be 70 or 96.');
	if (grade === 96) {
		const water = Number(data.water_added_l);
		if (!water || water <= 0) errors.push('Water added is required when using 96% ethanol stock.');
	}
	const ew = Number(data.extract_weight_kg);
	if (!ew || ew <= 0) errors.push('Extract weight (kg) is required and must be greater than 0.');
	if (!data.operator_name || String(data.operator_name).trim() === '') errors.push('Operator name is required.');
	return errors;
}
