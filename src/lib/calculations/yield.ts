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

/** Spec §2 Stage 1: leaf_dry_mass = net_leaf_weight × (1 - moisture_pct / 100) */
export function calculateLeafDryMass(netWeightKg: number, moisturePct: number): number {
	if (netWeightKg <= 0) return 0;
	return Number((netWeightKg * (1 - moisturePct / 100)).toFixed(2));
}

/** Spec §2 Stage 1: throughput = powder_output / (runtime_minutes / 60) */
export function calculateGrindThroughput(powderOutputKg: number, runtimeMin: number): number {
	if (runtimeMin <= 0) return 0;
	return Number((powderOutputKg / (runtimeMin / 60)).toFixed(2));
}

/** Spec §2 Stage 4: drying_loss = 100 × (wet - final) / wet */
export function calculateDryingLoss(wetProductKg: number, finalProductKg: number): number {
	if (wetProductKg <= 0) return 0;
	return Number((100 * (wetProductKg - finalProductKg) / wetProductKg).toFixed(1));
}

/** Spec §2 Stage 4: overall_dry_yield = 100 × final_product_kg / leaf_dry_mass_kg */
export function calculateOverallDryYield(finalProductKg: number, leafDryMassKg: number): number {
	if (leafDryMassKg <= 0) return 0;
	return Number((100 * finalProductKg / leafDryMassKg).toFixed(2));
}
