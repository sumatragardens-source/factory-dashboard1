import { getDb } from '../db';
import type { Material, MaterialMovement } from '$lib/domain/types';

export function getAllMaterials(): Material[] {
	const db = getDb();
	return db.prepare('SELECT * FROM materials ORDER BY name').all() as Material[];
}

export function getMaterialMovements(materialId: number): MaterialMovement[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM material_movements WHERE material_id = ? ORDER BY created_at DESC')
		.all(materialId) as MaterialMovement[];
}

export function getLowStockMaterials(): Material[] {
	const db = getDb();
	return db.prepare('SELECT * FROM materials WHERE on_hand_qty <= reorder_threshold ORDER BY name').all() as Material[];
}
