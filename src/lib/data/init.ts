import { getDb } from './db';
import { createSchema } from './schema';
import { seedData } from './seed';

let initialized = false;

export function initDb(): void {
	if (initialized) return;

	const db = getDb();

	const tableExists = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='batches'")
		.get();

	if (!tableExists) {
		createSchema(db);
		seedData(db);
	}

	initialized = true;
}
