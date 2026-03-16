export function calculateDilution(
	stockGradePct: number,
	targetPct: number,
	stockVolumeL: number
): { waterNeededL: number; resultingVolumeL: number } {
	if (stockGradePct <= targetPct) {
		return { waterNeededL: 0, resultingVolumeL: stockVolumeL };
	}
	const resultingVolumeL = (stockGradePct / targetPct) * stockVolumeL;
	const waterNeededL = resultingVolumeL - stockVolumeL;
	return {
		waterNeededL: Number(waterNeededL.toFixed(2)),
		resultingVolumeL: Number(resultingVolumeL.toFixed(2))
	};
}

export function calculateSolventRatio(ethanolVolumeL: number, powderMassKg: number): number {
	if (powderMassKg <= 0) return 0;
	return Number((ethanolVolumeL / powderMassKg).toFixed(1));
}

export function calculateRecoveryPerHour(recoveredL: number, runTimeHours: number): number {
	if (runTimeHours <= 0) return 0;
	return Number((recoveredL / runTimeHours).toFixed(2));
}
