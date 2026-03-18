import type Database from 'better-sqlite3';

export function createSchema(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS production_runs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			run_number TEXT NOT NULL UNIQUE,
			target_kg REAL NOT NULL DEFAULT 1000,
			batch_size_kg REAL NOT NULL DEFAULT 100,
			status TEXT NOT NULL DEFAULT 'In Progress'
				CHECK(status IN ('Planning','In Progress','Completed','On Hold')),
			started_at TEXT,
			completed_at TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Lots: 1-ton supplier deliveries
		CREATE TABLE IF NOT EXISTS lots (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			lot_id TEXT NOT NULL UNIQUE,
			supplier TEXT NOT NULL,
			delivery_date TEXT NOT NULL,
			quantity_kg REAL NOT NULL,
			batches_from_lot INTEGER,
			cost_usd REAL,
			cost_per_kg_usd REAL,
			testing_cost_usd REAL DEFAULT 110,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS batches (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_number TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL CHECK(status IN ('Draft','In Progress','Pending Review','Completed','Rejected')),
			current_stage INTEGER NOT NULL DEFAULT 1 CHECK(current_stage BETWEEN 1 AND 7),
			production_run_id INTEGER REFERENCES production_runs(id),
			lot_id INTEGER REFERENCES lots(id),
			supplier TEXT,
			supplier_lot TEXT,
			lot_position TEXT,
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
			stage_number INTEGER NOT NULL CHECK(stage_number BETWEEN 1 AND 7),
			status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','In Progress','Finalized')),
			started_at TEXT,
			finalized_at TEXT,
			finalized_by TEXT,
			notes TEXT,
			UNIQUE(batch_id, stage_number)
		);

		-- Stage 1: Raw Leaf & Grinding
		CREATE TABLE IF NOT EXISTS stage1_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			gross_leaf_kg REAL,
			container_kg REAL,
			net_leaf_kg REAL,
			moisture_pct REAL,
			dry_mass_kg REAL,
			grinder_id TEXT,
			screen_microns INTEGER,
			grind_start TEXT,
			grind_end TEXT,
			runtime_min REAL,
			powder_output_kg REAL,
			dust_loss_kg REAL,
			retained_kg REAL,
			mass_balance_err_pct REAL,
			throughput_kg_hr REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 2: Ethanol Extraction (70% EtOH, 1:5 ratio)
		CREATE TABLE IF NOT EXISTS stage2_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			etoh_vol_L REAL,
			etoh_purity_pct REAL,
			extract_temp_C REAL,
			extract_time_min REAL,
			extract_cycles INTEGER,
			agitation_rpm REAL,
			stir_time_min REAL,
			settle_time_min REAL,
			filtrate_vol_L REAL,
			spent_cake_kg REAL,
			etoh_recovered_L REAL,
			etoh_recovery_pct REAL,
			etoh_lost_L REAL,
			distill_time_min REAL,
			rotovap_vacuum_mbar REAL,
			rotovap_bath_C REAL,
			crude_aqueous_vol_L REAL,
			crude_extract_wt_kg REAL,
			water_vol_L REAL,
			water_temp_C REAL,
			water_time_min REAL,
			water_cycles INTEGER,
			water_filtrate_L REAL,
			water_spent_cake_kg REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Reactor loads: 10 kg loads within Stage 2
		CREATE TABLE IF NOT EXISTS reactor_loads (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL REFERENCES batches(id),
			reactor_id TEXT,
			load_number INTEGER,
			powder_kg REAL,
			etoh_vol_L REAL,
			agitation_rpm REAL,
			stir_time_min REAL,
			settle_time_hr REAL,
			filtrate_vol_L REAL,
			spent_cake_kg REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 3: Filtration & Washing
		CREATE TABLE IF NOT EXISTS stage3_filtration (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			filter_press_cycles INTEGER,
			centrifuge_batches INTEGER,
			screw_press_used INTEGER DEFAULT 0,
			de_used INTEGER DEFAULT 0,
			wash_volume_L REAL,
			cake_weight_kg REAL,
			filtrate_volume_L REAL,
			filtrate_clarity TEXT,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 4: Ethanol Distillation/Recovery
		CREATE TABLE IF NOT EXISTS stage4_distillation (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			distillation_temp_C REAL,
			vacuum_mbar REAL,
			bath_temp_C REAL,
			distill_time_min REAL,
			recovered_etoh_L REAL,
			recovered_abv_pct REAL,
			recovery_pct REAL,
			crude_aqueous_vol_L REAL,
			crude_aqueous_wt_kg REAL,
			residual_alcohol_pct REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 5: Acid/Base Extraction and Partitioning (d-Limonene + NaOH)
		CREATE TABLE IF NOT EXISTS stage5_acid_base (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			initial_ph REAL,
			naoh_added_g REAL,
			basified_ph REAL,
			dlimo_vol_L REAL,
			partition_cycles INTEGER,
			settling_min REAL,
			organic_phase_mL REAL,
			aqueous_waste_L REAL,
			emulsion_events INTEGER DEFAULT 0,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 6: Back-Extraction & Precipitation
		CREATE TABLE IF NOT EXISTS stage6_backext_precip (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			acetic_conc TEXT,
			acetic_water_vol_L REAL,
			acetic_pure_vol_L REAL,
			backext_cycles INTEGER,
			backext_settle_min REAL,
			dlimo_recovered_L REAL,
			dlimo_lost_L REAL,
			dlimo_loss_pct REAL,
			acidic_aq_vol_L REAL,
			acidic_ph REAL,
			k2co3_added_g REAL,
			precip_ph REAL,
			precip_temp_C REAL,
			wet_precipitate_g REAL,
			wash_vol_mL REAL,
			wash_cycles INTEGER,
			centrifuge_rpm REAL,
			supernatant_vol_L REAL,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Stage 7: Drying & Final Product
		CREATE TABLE IF NOT EXISTS stage7_drying_final (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER NOT NULL UNIQUE REFERENCES batches(id),
			dry_method TEXT,
			dry_temp_C REAL,
			dry_time_h REAL,
			final_product_g REAL,
			final_moisture_pct REAL,
			overall_yield_pct REAL,
			batch_duration_hr REAL,
			storage_location TEXT,
			operator_name TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Price references: material price history
		CREATE TABLE IF NOT EXISTS price_references (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material TEXT NOT NULL,
			unit TEXT NOT NULL,
			price_per_unit REAL NOT NULL,
			effective_date TEXT NOT NULL DEFAULT (date('now')),
			source TEXT,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		-- Backward-compat VIEWs: stage3_records reconstructs old stage3 interface
		CREATE VIEW IF NOT EXISTS stage3_records AS
		SELECT
			s5.id,
			s5.batch_id,
			s5.initial_ph,
			s5.naoh_added_g,
			s5.basified_ph,
			s5.dlimo_vol_L,
			s5.partition_cycles,
			s5.settling_min,
			s5.organic_phase_mL,
			s5.aqueous_waste_L,
			s6.acetic_conc,
			s6.acetic_water_vol_L,
			s6.acetic_pure_vol_L,
			s6.backext_cycles,
			s6.backext_settle_min,
			s6.dlimo_recovered_L,
			s6.dlimo_lost_L,
			s6.dlimo_loss_pct,
			s6.acidic_aq_vol_L,
			s6.acidic_ph,
			s5.operator_name,
			s5.notes,
			s5.created_at,
			s5.updated_at
		FROM stage5_acid_base s5
		LEFT JOIN stage6_backext_precip s6 ON s5.batch_id = s6.batch_id;

		-- Backward-compat VIEW: stage4_records reconstructs old stage4 interface
		CREATE VIEW IF NOT EXISTS stage4_records AS
		SELECT
			s6.id,
			s7.batch_id,
			s6.k2co3_added_g,
			s6.precip_ph,
			s6.precip_temp_C,
			s6.wet_precipitate_g,
			s6.wash_vol_mL,
			s6.wash_cycles,
			s7.dry_method,
			s7.dry_temp_C,
			s7.dry_time_h AS dry_time_hr,
			s7.final_product_g,
			s7.final_moisture_pct,
			s7.overall_yield_pct,
			s7.batch_duration_hr,
			s7.operator_name,
			s7.notes,
			s7.created_at,
			s7.updated_at
		FROM stage7_drying_final s7
		LEFT JOIN stage6_backext_precip s6 ON s7.batch_id = s6.batch_id;

		-- Keep existing supplier_deliveries for backward compat
		CREATE TABLE IF NOT EXISTS supplier_deliveries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			lot_id TEXT NOT NULL UNIQUE,
			supplier TEXT NOT NULL,
			delivery_date TEXT NOT NULL,
			quantity_kg REAL NOT NULL,
			batches_from_lot INTEGER,
			cost_usd REAL,
			cost_per_kg_usd REAL,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
			cost_category TEXT NOT NULL,
			item_name TEXT NOT NULL,
			quantity REAL,
			unit_rate REAL,
			total_cost REAL NOT NULL,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS alerts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			batch_id INTEGER REFERENCES batches(id),
			stage_number INTEGER,
			alert_type TEXT NOT NULL,
			severity TEXT NOT NULL CHECK(severity IN ('Low','Medium','High')),
			metric TEXT NOT NULL,
			threshold REAL NOT NULL,
			actual_value REAL NOT NULL,
			message TEXT NOT NULL,
			acknowledged INTEGER NOT NULL DEFAULT 0,
			acknowledged_by TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			acknowledged_at TEXT
		);

		CREATE TABLE IF NOT EXISTS solvent_ledger (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT NOT NULL,
			event TEXT NOT NULL,
			material TEXT NOT NULL,
			volume_L REAL NOT NULL,
			batch_id TEXT,
			running_balance_L REAL,
			notes TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);
}
