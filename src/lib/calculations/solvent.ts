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

/** Stage 2: ethanol_mass_in = volume × density (default 0.87 for 70% EtOH) */
export function calculateEthanolMass(volumeL: number, densityKgPerL: number = 0.87): number {
	if (volumeL <= 0) return 0;
	return Number((volumeL * densityKgPerL).toFixed(2));
}

/** Spec §2 Stage 2: extraction mass balance error (all inputs in kg) */
export function calculateExtractionBalanceError(
	powderLoadedKg: number,
	ethanolMassInKg: number,
	crudeExtractKg: number,
	spentCakeWetKg: number,
	ethanolRecoveredMassKg: number
): number {
	const totalIn = powderLoadedKg + ethanolMassInKg;
	if (totalIn <= 0) return 0;
	const totalOut = crudeExtractKg + spentCakeWetKg + ethanolRecoveredMassKg;
	const unaccounted = Math.abs(totalIn - totalOut);
	return Number(((unaccounted / totalIn) * 100).toFixed(1));
}
