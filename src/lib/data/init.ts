import { getDb } from './db';
import { createSchema } from './schema';
import { seedData } from './seed';

const SCHEMA_VERSION = 12;

let initialized = false;

export function initDb(): void {
	if (initialized) return;

	const db = getDb();

	const tableExists = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='batches'")
		.get();

	let needsReseed = !tableExists;

	if (tableExists) {
		const versionTable = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
			.get();
		if (!versionTable) {
			needsReseed = true;
		} else {
			const row = db.prepare('SELECT version FROM schema_version').get() as
				| { version: number }
				| undefined;
			if (!row || row.version !== SCHEMA_VERSION) {
				needsReseed = true;
			}
		}
	}

	if (needsReseed) {
		// Drop all existing tables and re-create from scratch
		db.pragma('foreign_keys = OFF');
		const tables = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'")
			.all() as { name: string }[];
		for (const { name } of tables) {
			db.exec(`DROP TABLE IF EXISTS "${name}"`);
		}
		db.pragma('foreign_keys = ON');

		createSchema(db);
		seedData(db);

		db.exec(`
			CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
			DELETE FROM schema_version;
			INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});
		`);
	}

	initialized = true;
}
