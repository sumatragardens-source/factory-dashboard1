import { getDb } from '../db';
import type { Alert } from '$lib/domain/types';
import { evaluateBatchAlerts, type SpecAlert, type BatchAlertData } from '$lib/calculations/alerts';
import { calculateLeafDryMass, calculateGrindThroughput, calculateOverallDryYield } from '$lib/calculations/yield';
import { calculateEthanolMass, calculateExtractionBalanceError } from '$lib/calculations/solvent';
import { calculateBatchDuration } from '$lib/calculations/duration';
import { calculateTotalBatchCost, calculateCostPerKg } from '$lib/calculations/costing';

export function insertAlert(batchId: number, alert: SpecAlert): void {
	const db = getDb();
	db.prepare(`
		INSERT INTO alerts (batch_id, stage_number, alert_type, severity, metric, threshold, actual_value, message)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`).run(batchId, alert.stage_number, alert.alert_type, alert.severity, alert.metric, alert.threshold, alert.actual_value, alert.message);
}

export function getActiveAlerts(): Alert[] {
	const db = getDb();
	return db.prepare('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY CASE severity WHEN \'High\' THEN 0 WHEN \'Medium\' THEN 1 WHEN \'Low\' THEN 2 END, created_at DESC').all() as Alert[];
}

export function getAlertsByBatch(batchId: number): Alert[] {
	const db = getDb();
	return db.prepare('SELECT * FROM alerts WHERE batch_id = ? ORDER BY CASE severity WHEN \'High\' THEN 0 WHEN \'Medium\' THEN 1 WHEN \'Low\' THEN 2 END, created_at DESC').all(batchId) as Alert[];
}

export function acknowledgeAlert(alertId: number, acknowledgedBy: string): void {
	const db = getDb();
	db.prepare(`
		UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = datetime('now')
		WHERE id = ?
	`).run(acknowledgedBy, alertId);
}

export function getAlertCounts(): { high: number; medium: number; low: number; total: number } {
	const db = getDb();
	const rows = db.prepare(`
		SELECT severity, COUNT(*) as cnt FROM alerts WHERE acknowledged = 0 GROUP BY severity
	`).all() as { severity: string; cnt: number }[];
	const counts = { high: 0, medium: 0, low: 0, total: 0 };
	for (const r of rows) {
		if (r.severity === 'High') counts.high = r.cnt;
		else if (r.severity === 'Medium') counts.medium = r.cnt;
		else if (r.severity === 'Low') counts.low = r.cnt;
		counts.total += r.cnt;
	}
	return counts;
}

export function evaluateAndPersistAlerts(batchId: number): Alert[] {
	const db = getDb();

	const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(batchId) as { id: number; leaf_input_kg: number; started_at: string | null; completed_at: string | null } | undefined;
	if (!batch) return [];

	const s1 = db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) as Record<string, number | string | null> | undefined;
	const s2 = db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) as Record<string, number | string | null> | undefined;
	const s3 = db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) as Record<string, number | string | null> | undefined;
	const s4 = db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) as Record<string, number | string | null> | undefined;

	const alertData: BatchAlertData = {};

	// Stage 1 mass balance + throughput
	if (s1) {
		alertData.stage1MassBalanceError = s1.mass_balance_err_pct as number | undefined;
		const netWeight = s1.net_leaf_kg as number | undefined;
		const moisture = s1.moisture_pct as number | undefined;
		const powderWeight = s1.powder_output_kg as number | undefined;
		const runDuration = s1.runtime_min as number | undefined;

		if (powderWeight && runDuration && runDuration > 0) {
			const throughput = calculateGrindThroughput(powderWeight, runDuration);
			alertData.grindThroughput = throughput;
			// Compute baseline from all stage1 records
			const allS1 = db.prepare('SELECT powder_output_kg, runtime_min FROM stage1_records WHERE runtime_min > 0 AND powder_output_kg > 0').all() as { powder_output_kg: number; runtime_min: number }[];
			if (allS1.length > 1) {
				const avg = allS1.reduce((s, r) => s + calculateGrindThroughput(r.powder_output_kg, r.runtime_min), 0) / allS1.length;
				alertData.baselineThroughput = avg;
			}
		}

		// Leaf dry mass for yield calc
		if (netWeight && moisture != null) {
			const leafDryMass = calculateLeafDryMass(netWeight, moisture);
			if (s4) {
				const finalProductG = s4.final_product_g as number | undefined;
				if (finalProductG && leafDryMass > 0) {
					alertData.overallYieldPct = calculateOverallDryYield(finalProductG / 1000, leafDryMass);
				}
			}
		}
	}

	// Stage 2 recovery + extraction balance
	if (s2) {
		alertData.recoveryRatePct = s2.etoh_recovery_pct as number | undefined;

		const stockUsed = s2.etoh_vol_L as number | undefined;
		const powderLoaded = s1?.powder_output_kg as number | undefined;
		const extractWeight = s2.crude_extract_wt_kg as number | undefined;
		const spentCake = s2.spent_cake_kg as number | undefined;
		const recovered = s2.etoh_recovered_L as number | undefined;

		if (stockUsed && powderLoaded && extractWeight && spentCake && recovered) {
			const ethanolMassIn = calculateEthanolMass(stockUsed);
			const ethanolRecoveredMass = calculateEthanolMass(recovered);
			alertData.stage2MassBalanceError = calculateExtractionBalanceError(
				powderLoaded, ethanolMassIn, extractWeight, spentCake, ethanolRecoveredMass
			);
		}
	}

	// Stage 3 pH checks
	if (s3) {
		alertData.acidicPh = s3.acidic_ph as number | undefined;
		alertData.basifiedPh = s3.basified_ph as number | undefined;
	}

	// Cost checks
	const costs = db.prepare('SELECT SUM(total_cost) as total FROM batch_costs WHERE batch_id = ?').get(batchId) as { total: number | null } | undefined;
	const finalProductG = s4?.final_product_g as number | undefined;
	const finalProductKg = finalProductG ? finalProductG / 1000 : undefined;
	if (costs?.total && finalProductKg && finalProductKg > 0) {
		const costPerKg = calculateCostPerKg(costs.total, finalProductKg);
		alertData.currentCostPerKg = costPerKg;
		// Get avg across last 10 completed batches
		const avgRow = db.prepare(`
			SELECT AVG(bc.total / (s4r.final_product_g / 1000.0)) as avg_cpk
			FROM (SELECT batch_id, SUM(total_cost) as total FROM batch_costs GROUP BY batch_id) bc
			JOIN stage4_records s4r ON s4r.batch_id = bc.batch_id AND s4r.final_product_g > 0
			JOIN batches b ON b.id = bc.batch_id AND b.status = 'Completed'
			ORDER BY b.completed_at DESC LIMIT 10
		`).get() as { avg_cpk: number | null } | undefined;
		if (avgRow?.avg_cpk) {
			alertData.avgCostPerKg = avgRow.avg_cpk;
		}
	}

	// Batch duration
	if (batch.started_at && batch.completed_at) {
		const duration = calculateBatchDuration(batch.started_at, batch.completed_at);
		alertData.batchDurationHrs = duration;
		const avgDur = db.prepare(`
			SELECT AVG((julianday(completed_at) - julianday(started_at)) * 24) as avg_hrs
			FROM batches WHERE status = 'Completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
		`).get() as { avg_hrs: number | null } | undefined;
		if (avgDur?.avg_hrs) {
			alertData.avgBatchDurationHrs = avgDur.avg_hrs;
		}
	}

	// Ethanol inventory
	const ethMat = db.prepare("SELECT on_hand_qty FROM materials WHERE code = 'MAT-ETOH'").get() as { on_hand_qty: number } | undefined;
	if (ethMat) {
		alertData.ethanolOnHandL = ethMat.on_hand_qty;
		alertData.avgEthanolPerBatch = 350; // standard issue per batch
	}

	// Evaluate all alerts
	const specAlerts = evaluateBatchAlerts(alertData);

	// Deduplicate: don't re-insert alerts that already exist unacknowledged for this batch
	const existing = db.prepare(
		'SELECT alert_type, metric FROM alerts WHERE batch_id = ? AND acknowledged = 0'
	).all(batchId) as { alert_type: string; metric: string }[];
	const existingSet = new Set(existing.map(e => `${e.alert_type}:${e.metric}`));

	for (const alert of specAlerts) {
		const key = `${alert.alert_type}:${alert.metric}`;
		if (!existingSet.has(key)) {
			insertAlert(batchId, alert);
		}
	}

	return getAlertsByBatch(batchId);
}
