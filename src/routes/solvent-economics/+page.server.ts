import { getDb } from '$lib/data/db';
import { getAllBatches } from '$lib/data/repositories/batchRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getDb();

	// Ethanol totals from stage2
	const ethanol = db.prepare(`
		SELECT
			COALESCE(SUM(ethanol_volume_l), 0) as total_issued,
			COALESCE(SUM(recovered_ethanol_l), 0) as total_recovered,
			COALESCE(SUM(ethanol_loss_l), 0) as total_lost,
			COALESCE(AVG(recovery_rate_pct), 0) as avg_recovery
		FROM stage2_records
	`).get() as any;

	// Limonene totals from stage3
	const limonene = db.prepare(`
		SELECT
			COALESCE(SUM(limonene_volume_l), 0) as total_issued,
			COALESCE(SUM(limonene_recovered_l), 0) as total_recovered,
			COALESCE(SUM(limonene_loss_l), 0) as total_lost
		FROM stage3_records
	`).get() as any;

	const limoneneEfficiency = limonene.total_issued > 0
		? Number(((limonene.total_recovered / limonene.total_issued) * 100).toFixed(1))
		: 0;

	// Per-batch ethanol ledger
	const ethanolByBatch = db.prepare(`
		SELECT b.batch_number, s2.ethanol_volume_l, s2.recovered_ethanol_l, s2.ethanol_loss_l, s2.recovery_rate_pct
		FROM stage2_records s2
		JOIN batches b ON b.id = s2.batch_id
		ORDER BY b.created_at DESC
	`).all() as any[];

	// Net ethanol cost
	const ethanolRate = 12.50;
	const netEthanolCost = ethanol.total_lost * ethanolRate;
	const totalLossValue = netEthanolCost + (limonene.total_lost * 35);

	return {
		ethanol: { ...ethanol, avg_recovery: Number(ethanol.avg_recovery.toFixed(1)) },
		limonene,
		limoneneEfficiency,
		ethanolByBatch,
		totalLossValue: Number(totalLossValue.toFixed(2)),
		netEthanolCost: Number(netEthanolCost.toFixed(2))
	};
};
