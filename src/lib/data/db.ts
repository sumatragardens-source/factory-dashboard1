import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!db) {
		const dataDir = path.resolve('data');
		if (!fs.existsSync(dataDir)) {
			fs.mkdirSync(dataDir, { recursive: true });
		}
		const dbPath = path.join(dataDir, 'factory.db');
		db = new Database(dbPath);
		db.pragma('journal_mode = WAL');
		db.pragma('foreign_keys = ON');
	}
	return db;
}
