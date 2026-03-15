import { getDb } from '../db';
import type { Machine, MachineStatusEvent } from '$lib/domain/types';

export function getAllMachines(): Machine[] {
	const db = getDb();
	return db.prepare('SELECT * FROM machines ORDER BY code').all() as Machine[];
}

export function getMachineById(id: number): Machine | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM machines WHERE id = ?').get(id) as Machine | undefined;
}

export function getMachineStatusEvents(machineId: number): MachineStatusEvent[] {
	const db = getDb();
	return db
		.prepare(
			'SELECT * FROM machine_status_events WHERE machine_id = ? ORDER BY created_at DESC'
		)
		.all(machineId) as MachineStatusEvent[];
}
