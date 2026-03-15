export function calculateRecoveryRate(issuedL: number, recoveredL: number): number {
	if (issuedL <= 0) return 0;
	return Number(((recoveredL / issuedL) * 100).toFixed(1));
}

export function calculateSolventLoss(issuedL: number, recoveredL: number): number {
	return Number((issuedL - recoveredL).toFixed(2));
}

export function calculateNetSolventCost(
	volumeL: number,
	ratePerL: number,
	recoveredL: number
): number {
	const netUsed = volumeL - recoveredL;
	return Number((netUsed * ratePerL).toFixed(2));
}
