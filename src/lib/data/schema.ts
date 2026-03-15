import type Database from 'better-sqlite3';

export function createSchema(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS batches (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_number TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL CHECK(status IN ('Draft','In Progress','Pending Review','Completed','Rejected')),
			current_stage INTEGER NOT NULL DEFAULT 1 CHECK(current_stage BETWEEN 1 AND 4),
			leaf_batch_id TEXT,
			supplier TEXT,
			strain TEXT,
			leaf_input_kg REAL NOT NULL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now')),
			started_at TEXT,
			completed_at TEXT
		);

		CREATE TABLE IF NOT EXISTS batch_stages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			stage_number INTEGER NOT NULL CHECK(stage_number BETWEEN 1 AND 4),
			status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Finalized')),
			started_at TEXT,
			finalized_at TEXT,
			finalized_by TEXT,
			notes TEXT,
			UNIQUE(batch_id, stage_number)
		);

		CREATE TABLE IF NOT EXISTS stage1_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			receipt_date TEXT,
			processing_date TEXT,
			gross_weight_kg REAL,
			tare_weight_kg REAL,
			net_weight_kg REAL,
			moisture_content_pct REAL,
			grinder_id INTEGER REFERENCES machines(id),
			screen_mesh_mm REAL,
			feed_rate_setting TEXT,
			machine_temp_c REAL,
			rpm REAL,
			run_duration_min REAL,
			powder_weight_kg REAL,
			dust_loss_kg REAL,
			powder_yield_pct REAL,
			mass_balance_error_pct REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS stage2_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			dry_mass_kg REAL,
			ethanol_volume_l REAL,
			solvent_ratio REAL,
			ethanol_grade TEXT,
			reactor_id INTEGER REFERENCES machines(id),
			set_temperature_c REAL,
			agitation_rpm REAL,
			soak_time_min REAL,
			settle_time_min REAL,
			filter_micron REAL,
			filter_pressure_psi REAL,
			de_added REAL,
			rotovap_id INTEGER REFERENCES machines(id),
			rotovap_bath_temp_c REAL,
			rotovap_vacuum_mbar REAL,
			recovered_ethanol_l REAL,
			ethanol_loss_l REAL,
			recovery_rate_pct REAL,
			extract_weight_kg REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS stage3_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			feed_weight_kg REAL,
			acid_type TEXT,
			acid_volume_l REAL,
			acid_concentration_pct REAL,
			water_volume_l REAL,
			target_ph_acid REAL,
			actual_ph_acid REAL,
			limonene_volume_l REAL,
			partition_vessel_id INTEGER REFERENCES machines(id),
			num_washes INTEGER,
			aqueous_phase_volume_l REAL,
			organic_phase_volume_l REAL,
			base_type TEXT,
			base_weight_kg REAL,
			target_ph_base REAL,
			actual_ph_base REAL,
			limonene_recovered_l REAL,
			limonene_loss_l REAL,
			partition_loss_kg REAL,
			alkaloid_precipitate_kg REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS stage4_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			feed_weight_kg REAL,
			back_extraction_solvent TEXT,
			back_extraction_volume_l REAL,
			back_extraction_temp_c REAL,
			back_extraction_time_min REAL,
			limonene_retained_product_kg REAL,
			limonene_process_loss_kg REAL,
			precipitation_method TEXT,
			precipitation_ph REAL,
			precipitate_weight_kg REAL,
			drying_cabinet_id INTEGER REFERENCES machines(id),
			drying_temp_c REAL,
			drying_time_hours REAL,
			drying_humidity_pct REAL,
			final_product_weight_kg REAL,
			product_appearance TEXT,
			cumulative_yield_pct REAL,
			stage_yield_pct REAL,
			mass_balance_error_pct REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS materials (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			unit TEXT NOT NULL,
			on_hand_qty REAL NOT NULL DEFAULT 0,
			reorder_threshold REAL NOT NULL DEFAULT 0,
			stage_relevance TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS material_movements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material_id INTEGER NOT NULL REFERENCES materials(id),
			batch_id INTEGER REFERENCES batches(id),
			movement_type TEXT NOT NULL CHECK(movement_type IN ('Received','Issued','Recovered','Returned','Adjustment')),
			quantity REAL NOT NULL,
			stage_number INTEGER,
			reference_note TEXT,
			performed_by TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS machines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			machine_type TEXT NOT NULL,
			location TEXT,
			status TEXT NOT NULL DEFAULT 'Idle' CHECK(status IN ('Idle','Running','Maintenance','Offline')),
			stage_relevance TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS machine_status_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			machine_id INTEGER NOT NULL REFERENCES machines(id),
			previous_status TEXT NOT NULL,
			new_status TEXT NOT NULL,
			batch_id INTEGER REFERENCES batches(id),
			reason TEXT,
			performed_by TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS deviations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			stage_number INTEGER NOT NULL,
			deviation_type TEXT NOT NULL,
			severity TEXT NOT NULL CHECK(severity IN ('Low','Medium','High','Critical')),
			status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open','Under Review','Resolved','Closed')),
			parameter TEXT,
			expected_value TEXT,
			actual_value TEXT,
			description TEXT,
			root_cause TEXT,
			corrective_action TEXT,
			raised_by TEXT,
			resolved_by TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			resolved_at TEXT,
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS lab_results (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			test_type TEXT NOT NULL CHECK(test_type IN ('TLC','HPLC')),
			test_date TEXT,
			lab_reference TEXT,
			status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Completed','Failed')),
			mitragynine_pct REAL,
			hydroxy_mitragynine_pct REAL,
			paynantheine_pct REAL,
			speciogynine_pct REAL,
			speciociliatine_pct REAL,
			non_alkaloids_pct REAL,
			tlc_spots_observed INTEGER,
			tlc_rf_values TEXT,
			tlc_image_path TEXT,
			hplc_purity_pct REAL,
			performed_by TEXT,
			reviewed_by TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS approvals (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			stage_number INTEGER,
			approval_type TEXT NOT NULL CHECK(approval_type IN ('stage_finalization','batch_review','deviation_resolution')),
			status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','Rejected')),
			requested_by TEXT,
			decided_by TEXT,
			decision_notes TEXT,
			requested_at TEXT NOT NULL DEFAULT (datetime('now')),
			decided_at TEXT
		);

		CREATE TABLE IF NOT EXISTS unit_rates (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			category TEXT NOT NULL,
			item_name TEXT NOT NULL,
			unit TEXT NOT NULL,
			rate_per_unit REAL NOT NULL,
			effective_from TEXT NOT NULL DEFAULT (date('now')),
			notes TEXT,
			UNIQUE(category, item_name)
		);

		CREATE TABLE IF NOT EXISTS batch_costs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			stage_number INTEGER NOT NULL,
			cost_category TEXT NOT NULL,
			item_name TEXT NOT NULL,
			quantity REAL NOT NULL,
			unit_rate REAL NOT NULL,
			total_cost REAL NOT NULL,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
}
