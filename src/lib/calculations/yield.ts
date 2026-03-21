export function calculatePowderYield(inputKg: number, outputKg: number): number {
	if (inputKg <= 0) return 0;
	return Number(((outputKg / inputKg) * 100).toFixed(1));
}

export function calculateCumulativeYield(leafInputKg: number, finalProductKg: number): number {
	if (leafInputKg <= 0) return 0;
	return Number(((finalProductKg / leafInputKg) * 100).toFixed(1));
}

export function calculateMassBalanceError(inputKg: number, outputKg: number, lossKg: number): number {
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
	return Number(((100 * (wetProductKg - finalProductKg)) / wetProductKg).toFixed(1));
}

/** Spec §2 Stage 4: overall_dry_yield = 100 × final_product_kg / leaf_dry_mass_kg */
export function calculateOverallDryYield(finalProductKg: number, leafDryMassKg: number): number {
	if (leafDryMassKg <= 0) return 0;
	return Number(((100 * finalProductKg) / leafDryMassKg).toFixed(2));
}

export interface LotStageYields {
	grinding: number;
	extraction: number;
	abPhase: number;
	drying: number;
}

/** Compute per-stage yields for a given lot's batches. */
export function getLotStageYields(
	batches: {
		leaf_input_kg?: number | null;
		powder_output_kg?: number | null;
		etoh_vol_L?: number | null;
		etoh_recovered_L?: number | null;
		dlimo_vol_L?: number | null;
		dlimo_recovered_L?: number | null;
		wet_precipitate_g?: number | null;
		final_product_g?: number | null;
	}[]
): LotStageYields {
	if (batches.length === 0) return { grinding: 0, extraction: 0, abPhase: 0, drying: 0 };

	const withPowder = batches.filter((b) => b.powder_output_kg != null);
	const grindLeaf = withPowder.reduce((s, b) => s + (b.leaf_input_kg ?? 0), 0);
	const grindPowder = withPowder.reduce((s, b) => s + (b.powder_output_kg ?? 0), 0);

	const withEtoh = batches.filter((b) => b.etoh_vol_L != null && b.etoh_vol_L > 0);
	const extIssued = withEtoh.reduce((s, b) => s + (b.etoh_vol_L ?? 0), 0);
	const extRecovered = withEtoh.reduce((s, b) => s + (b.etoh_recovered_L ?? 0), 0);

	const withDlimo = batches.filter((b) => b.dlimo_vol_L != null && b.dlimo_vol_L > 0);
	const abIssued = withDlimo.reduce((s, b) => s + (b.dlimo_vol_L ?? 0), 0);
	const abRecovered = withDlimo.reduce((s, b) => s + (b.dlimo_recovered_L ?? 0), 0);

	const withFinal = batches.filter((b) => b.final_product_g != null);
	const dryPrecip = withFinal.reduce((s, b) => s + (b.wet_precipitate_g ?? 0) / 1000, 0);
	const dryFinal = withFinal.reduce((s, b) => s + (b.final_product_g ?? 0) / 1000, 0);

	return {
		grinding: grindLeaf > 0 ? (grindPowder / grindLeaf) * 100 : 0,
		extraction: extIssued > 0 ? (extRecovered / extIssued) * 100 : 0,
		abPhase: abIssued > 0 ? (abRecovered / abIssued) * 100 : 0,
		drying: dryPrecip > 0 ? (dryFinal / dryPrecip) * 100 : 0
	};
}
