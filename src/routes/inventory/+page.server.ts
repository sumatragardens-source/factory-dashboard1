import { getAllMaterials, getMaterialMovements } from '$lib/data/repositories/materialRepo';
import { getDb } from '$lib/data/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const materials = getAllMaterials();

	// Get recent movements across all materials
	const db = getDb();
	const recentMovements = db
		.prepare(`
			SELECT mm.*, m.name as material_name, m.unit, b.batch_number
			FROM material_movements mm
			JOIN materials m ON m.id = mm.material_id
			LEFT JOIN batches b ON b.id = mm.batch_id
			ORDER BY mm.created_at DESC
			LIMIT 10
		`)
		.all() as any[];

	return { materials, recentMovements };
};
