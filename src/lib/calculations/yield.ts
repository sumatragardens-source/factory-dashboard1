export function calculatePowderYield(inputKg: number, outputKg: number): number {
	if (inputKg <= 0) return 0;
	return Number(((outputKg / inputKg) * 100).toFixed(1));
}

export function calculateCumulativeYield(leafInputKg: number, finalProductKg: number): number {
	if (leafInputKg <= 0) return 0;
	return Number(((finalProductKg / leafInputKg) * 100).toFixed(1));
}

export function calculateMassBalanceError(
	inputKg: number,
	outputKg: number,
	lossKg: number
): number {
	if (inputKg <= 0) return 0;
	const unaccounted = Math.abs(inputKg - outputKg - lossKg);
	return Number(((unaccounted / inputKg) * 100).toFixed(1));
}

export function calculateStageYield(inputKg: number, outputKg: number): number {
	if (inputKg <= 0) return 0;
	return Number(((outputKg / inputKg) * 100).toFixed(1));
}
