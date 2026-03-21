export const ALERT_THRESHOLDS = {
	MASS_BALANCE_ERROR_PCT: 5,
	LOW_ETHANOL_RECOVERY_PCT: 80,
	YIELD_FLOOR_PCT: 1.5,
	COST_SPIKE_FACTOR: 1.5,
	GRIND_THROUGHPUT_DROP_PCT: 30,
	SOLVENT_INVENTORY_BATCHES: 2,
	BATCH_DURATION_FACTOR: 2.0,
	PH_OVERSHOOT_DELTA: 0.5
};

export interface SpecAlert {
	alert_type: string;
	severity: 'Low' | 'Medium' | 'High';
	metric: string;
	threshold: number;
	actual_value: number;
	message: string;
	stage_number: number | null;
}

export function checkMassBalanceError(errorPct: number, stageNumber: number): SpecAlert | null {
	if (errorPct > ALERT_THRESHOLDS.MASS_BALANCE_ERROR_PCT) {
		return {
			alert_type: 'Mass Balance',
			severity: 'High',
			metric: 'mass_balance_error_pct',
			threshold: ALERT_THRESHOLDS.MASS_BALANCE_ERROR_PCT,
			actual_value: errorPct,
			message: `Stage ${stageNumber} mass balance error ${errorPct}% exceeds ${ALERT_THRESHOLDS.MASS_BALANCE_ERROR_PCT}% threshold`,
			stage_number: stageNumber
		};
	}
	return null;
}

export function checkLowEthanolRecovery(recoveryPct: number): SpecAlert | null {
	if (recoveryPct < ALERT_THRESHOLDS.LOW_ETHANOL_RECOVERY_PCT) {
		return {
			alert_type: 'Solvent Recovery',
			severity: 'High',
			metric: 'recovery_rate_pct',
			threshold: ALERT_THRESHOLDS.LOW_ETHANOL_RECOVERY_PCT,
			actual_value: recoveryPct,
			message: `Ethanol recovery ${recoveryPct}% below ${ALERT_THRESHOLDS.LOW_ETHANOL_RECOVERY_PCT}% minimum`,
			stage_number: 2
		};
	}
	return null;
}

export function checkYieldFloor(yieldPct: number): SpecAlert | null {
	if (yieldPct < ALERT_THRESHOLDS.YIELD_FLOOR_PCT) {
		return {
			alert_type: 'Yield',
			severity: 'High',
			metric: 'overall_dry_yield_pct',
			threshold: ALERT_THRESHOLDS.YIELD_FLOOR_PCT,
			actual_value: yieldPct,
			message: `Overall yield ${yieldPct}% below ${ALERT_THRESHOLDS.YIELD_FLOOR_PCT}% floor`,
			stage_number: 4
		};
	}
	return null;
}

export function checkCostSpike(currentCostPerKg: number, avgCostPerKg: number): SpecAlert | null {
	if (avgCostPerKg <= 0) return null;
	const ratio = currentCostPerKg / avgCostPerKg;
	if (ratio > ALERT_THRESHOLDS.COST_SPIKE_FACTOR) {
		return {
			alert_type: 'Cost Spike',
			severity: 'Medium',
			metric: 'cost_per_kg',
			threshold: avgCostPerKg * ALERT_THRESHOLDS.COST_SPIKE_FACTOR,
			actual_value: currentCostPerKg,
			message: `Cost/kg ${currentCostPerKg.toFixed(0)} is ${(ratio * 100).toFixed(0)}% of 10-batch avg (${avgCostPerKg.toFixed(0)})`,
			stage_number: null
		};
	}
	return null;
}

export function checkGrindThroughputDrop(throughputKgHr: number, baselineKgHr: number): SpecAlert | null {
	if (baselineKgHr <= 0) return null;
	const dropPct = ((baselineKgHr - throughputKgHr) / baselineKgHr) * 100;
	if (dropPct > ALERT_THRESHOLDS.GRIND_THROUGHPUT_DROP_PCT) {
		return {
			alert_type: 'Throughput Drop',
			severity: 'Medium',
			metric: 'grind_throughput_kg_hr',
			threshold: baselineKgHr * (1 - ALERT_THRESHOLDS.GRIND_THROUGHPUT_DROP_PCT / 100),
			actual_value: throughputKgHr,
			message: `Grind throughput ${throughputKgHr.toFixed(1)} kg/hr is ${dropPct.toFixed(0)}% below baseline ${baselineKgHr.toFixed(1)}`,
			stage_number: 1
		};
	}
	return null;
}

export function checkSolventInventory(remainingL: number, avgUsagePerBatchL: number): SpecAlert | null {
	if (avgUsagePerBatchL <= 0) return null;
	const batchesRemaining = remainingL / avgUsagePerBatchL;
	if (batchesRemaining < ALERT_THRESHOLDS.SOLVENT_INVENTORY_BATCHES) {
		return {
			alert_type: 'Inventory Low',
			severity: 'Medium',
			metric: 'solvent_inventory_batches',
			threshold: ALERT_THRESHOLDS.SOLVENT_INVENTORY_BATCHES,
			actual_value: Number(batchesRemaining.toFixed(1)),
			message: `Ethanol inventory covers only ${batchesRemaining.toFixed(1)} batches (minimum ${ALERT_THRESHOLDS.SOLVENT_INVENTORY_BATCHES})`,
			stage_number: null
		};
	}
	return null;
}

export function checkBatchDuration(durationHrs: number, avgDurationHrs: number): SpecAlert | null {
	if (avgDurationHrs <= 0) return null;
	const ratio = durationHrs / avgDurationHrs;
	if (ratio > ALERT_THRESHOLDS.BATCH_DURATION_FACTOR) {
		return {
			alert_type: 'Long Duration',
			severity: 'Low',
			metric: 'batch_duration_hours',
			threshold: avgDurationHrs * ALERT_THRESHOLDS.BATCH_DURATION_FACTOR,
			actual_value: durationHrs,
			message: `Batch took ${durationHrs.toFixed(0)}h — ${(ratio * 100).toFixed(0)}% of avg ${avgDurationHrs.toFixed(0)}h`,
			stage_number: null
		};
	}
	return null;
}

export function checkPhOvershoot(targetPh: number, actualPh: number, stageNumber: number): SpecAlert | null {
	const delta = Math.abs(actualPh - targetPh);
	if (delta > ALERT_THRESHOLDS.PH_OVERSHOOT_DELTA) {
		return {
			alert_type: 'pH Overshoot',
			severity: 'Low',
			metric: 'ph_delta',
			threshold: ALERT_THRESHOLDS.PH_OVERSHOOT_DELTA,
			actual_value: delta,
			message: `pH off target by ${delta.toFixed(2)} (actual ${actualPh}, target ${targetPh}) at stage ${stageNumber}`,
			stage_number: stageNumber
		};
	}
	return null;
}

export function checkPhOutOfRange(
	actualPh: number,
	rangeMin: number,
	rangeMax: number,
	label: string
): SpecAlert | null {
	if (actualPh < rangeMin || actualPh > rangeMax) {
		return {
			alert_type: 'pH Out of Range',
			severity: 'Low',
			metric: `ph_${label}`,
			threshold: actualPh < rangeMin ? rangeMin : rangeMax,
			actual_value: actualPh,
			message: `${label} pH ${actualPh.toFixed(2)} outside expected range ${rangeMin}–${rangeMax}`,
			stage_number: 3
		};
	}
	return null;
}

export interface BatchAlertData {
	stage1MassBalanceError?: number;
	stage2MassBalanceError?: number;
	recoveryRatePct?: number;
	overallYieldPct?: number;
	currentCostPerKg?: number;
	avgCostPerKg?: number;
	grindThroughput?: number;
	baselineThroughput?: number;
	ethanolOnHandL?: number;
	avgEthanolPerBatch?: number;
	batchDurationHrs?: number;
	avgBatchDurationHrs?: number;
	acidicPh?: number;
	basifiedPh?: number;
}

export function evaluateBatchAlerts(data: BatchAlertData): SpecAlert[] {
	const alerts: SpecAlert[] = [];

	if (data.stage1MassBalanceError != null) {
		const a = checkMassBalanceError(data.stage1MassBalanceError, 1);
		if (a) alerts.push(a);
	}
	if (data.stage2MassBalanceError != null) {
		const a = checkMassBalanceError(data.stage2MassBalanceError, 2);
		if (a) alerts.push(a);
	}
	if (data.recoveryRatePct != null) {
		const a = checkLowEthanolRecovery(data.recoveryRatePct);
		if (a) alerts.push(a);
	}
	if (data.overallYieldPct != null) {
		const a = checkYieldFloor(data.overallYieldPct);
		if (a) alerts.push(a);
	}
	if (data.currentCostPerKg != null && data.avgCostPerKg != null) {
		const a = checkCostSpike(data.currentCostPerKg, data.avgCostPerKg);
		if (a) alerts.push(a);
	}
	if (data.grindThroughput != null && data.baselineThroughput != null) {
		const a = checkGrindThroughputDrop(data.grindThroughput, data.baselineThroughput);
		if (a) alerts.push(a);
	}
	if (data.ethanolOnHandL != null && data.avgEthanolPerBatch != null) {
		const a = checkSolventInventory(data.ethanolOnHandL, data.avgEthanolPerBatch);
		if (a) alerts.push(a);
	}
	if (data.batchDurationHrs != null && data.avgBatchDurationHrs != null) {
		const a = checkBatchDuration(data.batchDurationHrs, data.avgBatchDurationHrs);
		if (a) alerts.push(a);
	}
	if (data.acidicPh != null) {
		const a = checkPhOutOfRange(data.acidicPh, 3, 4, 'acidic');
		if (a) alerts.push(a);
	}
	if (data.basifiedPh != null) {
		const a = checkPhOutOfRange(data.basifiedPh, 12, 13, 'basified');
		if (a) alerts.push(a);
	}

	return alerts;
}
