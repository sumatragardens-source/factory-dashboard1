import { getDb } from '$lib/data/db';
import { UNIT_RATES } from '$lib/config/costs';
import { calculateRecoveryRate } from '$lib/calculations/solvent';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();

	// Ethanol totals from stage2
	const ethanol = db.prepare(`
		SELECT
			COALESCE(SUM(etoh_vol_L), 0) as total_issued,
			COALESCE(SUM(etoh_recovered_L), 0) as total_recovered,
			COALESCE(SUM(etoh_lost_L), 0) as total_lost,
			COALESCE(AVG(etoh_recovery_pct), 0) as avg_recovery,
			COALESCE(MAX(etoh_recovery_pct), 0) as best_recovery
		FROM stage2_records
	`).get() as any;

	// Total leaf input for SSR ratio
	const leafTotals = db.prepare(`
		SELECT COALESCE(SUM(leaf_input_kg), 0) as total_leaf_kg
		FROM batches
	`).get() as any;

	const ssrRatio = leafTotals.total_leaf_kg > 0
		? Number((ethanol.total_issued / leafTotals.total_leaf_kg).toFixed(2))
		: 0;

	// Loss decomposition: estimate cake retention from spent_cake_kg × absorption factor
	const cakeData = db.prepare(`
		SELECT COALESCE(SUM(spent_cake_kg), 0) as total_spent_cake
		FROM stage2_records
	`).get() as any;

	// Absorption factor: ~0.7 L ethanol per kg spent cake (wet cake retains solvent)
	const absorptionFactor = 0.7;
	const cakeRetention = Number((cakeData.total_spent_cake * absorptionFactor).toFixed(1));
	const totalLost = ethanol.total_lost;
	const evaporationLoss = Number(Math.max(totalLost - cakeRetention, totalLost * 0.25).toFixed(1));
	const otherLoss = Number(Math.max(totalLost - cakeRetention - evaporationLoss, 0).toFixed(1));

	// Adjust if cake retention exceeds total loss
	const adjCakeRetention = Math.min(cakeRetention, totalLost * 0.55);
	const adjEvaporation = Number((totalLost * 0.30).toFixed(1));
	const adjOther = Number((totalLost - adjCakeRetention - adjEvaporation).toFixed(1));

	const waterfall = {
		issued: Number(ethanol.total_issued.toFixed(1)),
		cakeRetention: Number(adjCakeRetention.toFixed(1)),
		evaporationLoss: adjEvaporation,
		otherLoss: Math.max(adjOther, 0),
		recovered: Number(ethanol.total_recovered.toFixed(1)),
	};

	// 10-batch rolling average recovery
	const last10 = db.prepare(`
		SELECT etoh_recovery_pct
		FROM stage2_records
		ORDER BY created_at DESC LIMIT 10
	`).all() as any[];

	const rolling10Avg = last10.length > 0
		? Number((last10.reduce((s: number, r: any) => s + (r.etoh_recovery_pct || 0), 0) / last10.length).toFixed(1))
		: 0;

	const bulletChart = {
		current: Number(ethanol.avg_recovery.toFixed(1)),
		rolling10: rolling10Avg,
		best: Number(ethanol.best_recovery.toFixed(1)),
		target: 90,
	};

	// Loss sources ranked
	const lossSources = [
		{ name: 'Cake Retention', value: Number(adjCakeRetention.toFixed(1)), color: '#ef4444' },
		{ name: 'Evaporation', value: adjEvaporation, color: '#f59e0b' },
		{ name: 'Other/Unknown', value: Math.max(Number(adjOther.toFixed(1)), 0), color: '#6b7280' },
	].sort((a, b) => b.value - a.value);

	const maxLoss = Math.max(...lossSources.map(l => l.value), 1);

	// Per-batch ethanol + limonene combined matrix
	const batchMatrix = db.prepare(`
		SELECT
			b.batch_number,
			s2.etoh_vol_L as issued,
			s2.etoh_recovered_L as recovered,
			s2.etoh_lost_L as lost,
			s2.etoh_recovery_pct as recovery_pct
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		ORDER BY b.created_at DESC
	`).all() as any[];

	const avgRecovery = Number(ethanol.avg_recovery.toFixed(1));
	const batchPerformance = batchMatrix.map((row: any) => ({
		...row,
		issued: Number((row.issued || 0).toFixed(1)),
		recovered: Number((row.recovered || 0).toFixed(1)),
		lost: Number((row.lost || 0).toFixed(1)),
		recovery_pct: Number((row.recovery_pct || 0).toFixed(1)),
		vsAvg: row.recovery_pct != null
			? Number((row.recovery_pct - avgRecovery).toFixed(1))
			: null,
		status: row.recovery_pct == null ? 'N/A'
			: row.recovery_pct >= 86 ? 'Optimal'
			: row.recovery_pct >= 82 ? 'Warning'
			: 'Critical'
	}));

	// Net loss value
	const ethanolRate = UNIT_RATES.ethanol70.rate;
	const totalLossValue = Number((ethanol.total_lost * ethanolRate).toFixed(2));

	return {
		recoveryPct: avgRecovery,
		totalIssued: Number(ethanol.total_issued.toFixed(1)),
		totalRecovered: Number(ethanol.total_recovered.toFixed(1)),
		totalLost: Number(ethanol.total_lost.toFixed(1)),
		ssrRatio,
		totalLossValue,
		waterfall,
		bulletChart,
		lossSources,
		maxLoss,
		batchPerformance,
		batchCount: batchMatrix.length,
	};
};
