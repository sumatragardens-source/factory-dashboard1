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

export function getMachineEventsByBatch(batchId: number): (MachineStatusEvent & { machine_name: string })[] {
	const db = getDb();
	return db
		.prepare(
			`SELECT mse.*, m.name as machine_name FROM machine_status_events mse
			 JOIN machines m ON m.id = mse.machine_id
			 WHERE mse.batch_id = ? ORDER BY mse.created_at DESC`
		)
		.all(batchId) as (MachineStatusEvent & { machine_name: string })[];
}
