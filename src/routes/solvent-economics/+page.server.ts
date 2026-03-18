import { getDb } from '$lib/data/db';
import { UNIT_RATES } from '$lib/config/costs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();

	// Ethanol totals from stage2
	const ethanol = db.prepare(`
		SELECT
			COALESCE(SUM(etoh_vol_L), 0) as total_issued,
			COALESCE(SUM(etoh_recovered_L), 0) as total_recovered,
			COALESCE(SUM(etoh_lost_L), 0) as total_lost,
			COALESCE(AVG(etoh_recovery_pct), 0) as avg_recovery
		FROM stage2_records
	`).get() as any;

	// Limonene totals from stage3
	const limonene = db.prepare(`
		SELECT
			COALESCE(SUM(dlimo_vol_L), 0) as total_issued,
			COALESCE(SUM(dlimo_recovered_L), 0) as total_recovered,
			COALESCE(SUM(dlimo_lost_L), 0) as total_lost
		FROM stage3_records
	`).get() as any;

	const limoneneEfficiency = limonene.total_issued > 0
		? Number(((limonene.total_recovered / limonene.total_issued) * 100).toFixed(1))
		: 0;

	// Per-batch ethanol ledger
	const ethanolByBatch = db.prepare(`
		SELECT b.batch_number, s2.etoh_vol_L, s2.etoh_recovered_L, s2.etoh_lost_L, s2.etoh_recovery_pct
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		ORDER BY b.created_at DESC
	`).all() as any[];

	// Net ethanol cost
	const ethanolRate = UNIT_RATES.ethanol70.rate;
	const limoneneRate = UNIT_RATES.dLimonene.rate;
	const netEthanolCost = ethanol.total_lost * ethanolRate;
	const totalLossValue = netEthanolCost + (limonene.total_lost * limoneneRate);

	return {
		ethanol: { ...ethanol, avg_recovery: Number(ethanol.avg_recovery.toFixed(1)) },
		limonene,
		limoneneEfficiency,
		ethanolByBatch,
		totalLossValue: Number(totalLossValue.toFixed(2)),
		netEthanolCost: Number(netEthanolCost.toFixed(2))
	};
};
