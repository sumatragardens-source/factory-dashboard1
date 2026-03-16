import type Database from 'better-sqlite3';

export function seedData(db: Database.Database): void {
	// --- Machines (must be inserted before stage records that reference them) ---
	db.exec(`
		INSERT INTO machines (code, name, machine_type, location, status, stage_relevance) VALUES
			('GRN-01', 'Grinder Unit 1', 'Grinder', 'Processing Room A', 'Running', 'Raw Leaf to Powder'),
			('RXT-01', 'Reactor Unit 1', 'Reactor', 'Extraction Room', 'Running', 'Ethanol Extraction'),
			('SEP-01', 'Separation Vessel 1', 'Separation Vessel', 'Extraction Room', 'Idle', 'Acid/Base Extraction'),
			('RTV-01', 'Rotovap Unit 1', 'Rotovap', 'Extraction Room', 'Maintenance', 'Distillation'),
			('DRY-01', 'Drying Cabinet 1', 'Drying Cabinet', 'Drying Room', 'Running', 'Drying'),
			('RXT-02', 'Reactor Unit 2', 'Reactor', 'Extraction Room', 'Idle', 'Ethanol Extraction'),
			('RXT-03', 'Reactor Unit 3', 'Reactor', 'Extraction Room', 'Idle', 'Ethanol Extraction'),
			('RTV-02', 'Rotovap Unit 2', 'Rotovap', 'Extraction Room', 'Idle', 'Distillation');
	`);

	// --- Materials (scaled for 100 kg lot operations) ---
	db.exec(`
		INSERT INTO materials (code, name, unit, on_hand_qty, reorder_threshold, stage_relevance) VALUES
			('MAT-LEAF', 'Dried Leaf', 'kg', 520.0, 200, 'Raw Leaf to Powder'),
			('MAT-ETOH', 'Ethanol 96%', 'L', 2200.0, 800, 'Ethanol Extraction'),
			('MAT-H2O', 'DI Water', 'L', 5000.0, 2000, 'Acid/Base Extraction'),
			('MAT-HCL', 'HCl', 'L', 85.0, 40, 'Acid/Base Extraction'),
			('MAT-NAOH', 'NaOH', 'kg', 380.0, 150, 'Acid/Base Extraction'),
			('MAT-LIM', 'Limonene', 'L', 250.0, 80, 'Acid/Base Extraction, Back Extraction, Precipitation');
	`);

	// --- Batches (10 lots x 100 kg each = 1,000 kg total intake) ---
	// current_stage now uses 8-stage numbering:
	// 1=Powder, 2=EtOH Extraction, 3=Filtration, 4=Distillation,
	// 5=A/B Extraction, 6=Back Extraction, 7=Precipitation, 8=Drying
	db.exec(`
		INSERT INTO batches (batch_number, status, current_stage, supplier, strain, leaf_input_kg, operator_name, notes, created_at, updated_at, started_at, completed_at) VALUES
			('SG-LOT-001', 'Completed', 8, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, 'Ahmad R.', 'First lot - full run with HPLC', '2026-01-10 08:00:00', '2026-02-05 16:00:00', '2026-01-10 08:30:00', '2026-02-05 16:00:00'),
			('SG-LOT-002', 'Completed', 8, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, 'Dewi S.', 'Second lot completed', '2026-01-17 08:00:00', '2026-02-12 16:00:00', '2026-01-17 08:30:00', '2026-02-12 16:00:00'),
			('SG-LOT-003', 'Completed', 8, 'Borneo Botanicals', 'Red Borneo Select', 100.0, 'Ahmad R.', 'Third lot completed - Borneo source', '2026-01-24 08:00:00', '2026-02-20 16:00:00', '2026-01-24 08:30:00', '2026-02-20 16:00:00'),
			('SG-LOT-004', 'Pending Review', 8, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, 'Budi P.', 'All stages done, awaiting final approval', '2026-01-31 08:00:00', '2026-03-01 15:00:00', '2026-01-31 08:30:00', NULL),
			('SG-LOT-005', 'In Progress', 8, 'Maeng Da Farms', 'White Maeng Da', 100.0, 'Dewi S.', 'Drying in progress', '2026-02-07 08:00:00', '2026-03-10 09:00:00', '2026-02-07 09:00:00', NULL),
			('SG-LOT-006', 'In Progress', 5, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, 'Ahmad R.', 'Mid acid/base extraction', '2026-02-14 08:00:00', '2026-03-12 10:00:00', '2026-02-14 09:00:00', NULL),
			('SG-LOT-007', 'In Progress', 2, 'Borneo Botanicals', 'Red Borneo Select', 100.0, 'Budi P.', 'In ethanol extraction', '2026-02-21 08:00:00', '2026-03-14 11:00:00', '2026-02-21 09:00:00', NULL),
			('SG-LOT-008', 'In Progress', 1, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, 'Dewi S.', 'Grinding in progress', '2026-03-01 08:00:00', '2026-03-15 08:00:00', '2026-03-01 09:00:00', NULL),
			('SG-LOT-009', 'Rejected', 5, 'Maeng Da Farms', 'White Maeng Da', 100.0, 'Budi P.', 'pH deviation in acid/base extraction - rejected for review', '2026-02-10 08:00:00', '2026-03-08 10:00:00', '2026-02-10 09:00:00', NULL),
			('SG-LOT-010', 'Draft', 1, 'Sumatra Direct', 'Green Sumatra Premium', 100.0, NULL, 'Not started', '2026-03-14 08:00:00', '2026-03-14 08:00:00', NULL, NULL);
	`);

	// --- Batch stages (8 stages per batch) ---
	// Lot 1 (Completed - all 8 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(1, 1, 'Finalized', '2026-01-10 08:30:00', '2026-01-14 16:00:00', 'Ahmad R.'),
			(1, 2, 'Finalized', '2026-01-15 08:00:00', '2026-01-18 16:00:00', 'Ahmad R.'),
			(1, 3, 'Finalized', '2026-01-19 08:00:00', '2026-01-21 16:00:00', 'Ahmad R.'),
			(1, 4, 'Finalized', '2026-01-22 08:00:00', '2026-01-24 16:00:00', 'Ahmad R.'),
			(1, 5, 'Finalized', '2026-01-26 08:00:00', '2026-01-31 16:00:00', 'Ahmad R.'),
			(1, 6, 'Finalized', '2026-02-01 08:00:00', '2026-02-02 16:00:00', 'Ahmad R.'),
			(1, 7, 'Finalized', '2026-02-03 08:00:00', '2026-02-04 12:00:00', 'Ahmad R.'),
			(1, 8, 'Finalized', '2026-02-04 13:00:00', '2026-02-05 16:00:00', 'Ahmad R.');
	`);
	// Lot 2 (Completed - all 8 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(2, 1, 'Finalized', '2026-01-17 08:30:00', '2026-01-21 16:00:00', 'Dewi S.'),
			(2, 2, 'Finalized', '2026-01-22 08:00:00', '2026-01-25 16:00:00', 'Dewi S.'),
			(2, 3, 'Finalized', '2026-01-26 08:00:00', '2026-01-28 16:00:00', 'Dewi S.'),
			(2, 4, 'Finalized', '2026-01-29 08:00:00', '2026-01-31 16:00:00', 'Dewi S.'),
			(2, 5, 'Finalized', '2026-02-02 08:00:00', '2026-02-07 16:00:00', 'Dewi S.'),
			(2, 6, 'Finalized', '2026-02-08 08:00:00', '2026-02-09 16:00:00', 'Dewi S.'),
			(2, 7, 'Finalized', '2026-02-10 08:00:00', '2026-02-11 12:00:00', 'Dewi S.'),
			(2, 8, 'Finalized', '2026-02-11 13:00:00', '2026-02-12 16:00:00', 'Dewi S.');
	`);
	// Lot 3 (Completed - all 8 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(3, 1, 'Finalized', '2026-01-24 08:30:00', '2026-01-28 16:00:00', 'Ahmad R.'),
			(3, 2, 'Finalized', '2026-01-29 08:00:00', '2026-02-01 16:00:00', 'Ahmad R.'),
			(3, 3, 'Finalized', '2026-02-02 08:00:00', '2026-02-04 16:00:00', 'Ahmad R.'),
			(3, 4, 'Finalized', '2026-02-05 08:00:00', '2026-02-07 16:00:00', 'Ahmad R.'),
			(3, 5, 'Finalized', '2026-02-09 08:00:00', '2026-02-15 16:00:00', 'Ahmad R.'),
			(3, 6, 'Finalized', '2026-02-16 08:00:00', '2026-02-17 16:00:00', 'Ahmad R.'),
			(3, 7, 'Finalized', '2026-02-18 08:00:00', '2026-02-19 12:00:00', 'Ahmad R.'),
			(3, 8, 'Finalized', '2026-02-19 13:00:00', '2026-02-20 16:00:00', 'Ahmad R.');
	`);
	// Lot 4 (Pending Review - all 8 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(4, 1, 'Finalized', '2026-01-31 08:30:00', '2026-02-04 16:00:00', 'Budi P.'),
			(4, 2, 'Finalized', '2026-02-05 08:00:00', '2026-02-08 16:00:00', 'Budi P.'),
			(4, 3, 'Finalized', '2026-02-09 08:00:00', '2026-02-11 16:00:00', 'Budi P.'),
			(4, 4, 'Finalized', '2026-02-12 08:00:00', '2026-02-14 16:00:00', 'Budi P.'),
			(4, 5, 'Finalized', '2026-02-16 08:00:00', '2026-02-22 16:00:00', 'Budi P.'),
			(4, 6, 'Finalized', '2026-02-23 08:00:00', '2026-02-25 16:00:00', 'Budi P.'),
			(4, 7, 'Finalized', '2026-02-26 08:00:00', '2026-02-28 12:00:00', 'Budi P.'),
			(4, 8, 'Finalized', '2026-02-28 13:00:00', '2026-03-01 15:00:00', 'Budi P.');
	`);
	// Lot 5 (In Progress stage 8 - stages 1-7 finalized, 8 in progress)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(5, 1, 'Finalized', '2026-02-07 09:00:00', '2026-02-11 16:00:00', 'Dewi S.'),
			(5, 2, 'Finalized', '2026-02-12 08:00:00', '2026-02-15 16:00:00', 'Dewi S.'),
			(5, 3, 'Finalized', '2026-02-16 08:00:00', '2026-02-18 16:00:00', 'Dewi S.'),
			(5, 4, 'Finalized', '2026-02-19 08:00:00', '2026-02-21 16:00:00', 'Dewi S.'),
			(5, 5, 'Finalized', '2026-02-23 08:00:00', '2026-03-01 16:00:00', 'Dewi S.'),
			(5, 6, 'Finalized', '2026-03-02 08:00:00', '2026-03-04 16:00:00', 'Dewi S.'),
			(5, 7, 'Finalized', '2026-03-05 08:00:00', '2026-03-07 16:00:00', 'Dewi S.'),
			(5, 8, 'In Progress', '2026-03-08 08:00:00', NULL, NULL);
	`);
	// Lot 6 (In Progress stage 5 - stages 1-4 finalized, 5 in progress, 6-8 pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(6, 1, 'Finalized', '2026-02-14 09:00:00', '2026-02-18 16:00:00', 'Ahmad R.'),
			(6, 2, 'Finalized', '2026-02-19 08:00:00', '2026-02-22 16:00:00', 'Ahmad R.'),
			(6, 3, 'Finalized', '2026-02-23 08:00:00', '2026-02-25 16:00:00', 'Ahmad R.'),
			(6, 4, 'Finalized', '2026-02-26 08:00:00', '2026-02-28 16:00:00', 'Ahmad R.'),
			(6, 5, 'In Progress', '2026-03-02 08:00:00', NULL, NULL),
			(6, 6, 'Pending', NULL, NULL, NULL),
			(6, 7, 'Pending', NULL, NULL, NULL),
			(6, 8, 'Pending', NULL, NULL, NULL);
	`);
	// Lot 7 (In Progress stage 2 - stage 1 finalized, 2 in progress, 3-8 pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(7, 1, 'Finalized', '2026-02-21 09:00:00', '2026-02-25 16:00:00', 'Budi P.'),
			(7, 2, 'In Progress', '2026-02-26 08:00:00', NULL, NULL),
			(7, 3, 'Pending', NULL, NULL, NULL),
			(7, 4, 'Pending', NULL, NULL, NULL),
			(7, 5, 'Pending', NULL, NULL, NULL),
			(7, 6, 'Pending', NULL, NULL, NULL),
			(7, 7, 'Pending', NULL, NULL, NULL),
			(7, 8, 'Pending', NULL, NULL, NULL);
	`);
	// Lot 8 (In Progress stage 1 - stage 1 in progress, 2-8 pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(8, 1, 'In Progress', '2026-03-01 09:00:00', NULL, NULL),
			(8, 2, 'Pending', NULL, NULL, NULL),
			(8, 3, 'Pending', NULL, NULL, NULL),
			(8, 4, 'Pending', NULL, NULL, NULL),
			(8, 5, 'Pending', NULL, NULL, NULL),
			(8, 6, 'Pending', NULL, NULL, NULL),
			(8, 7, 'Pending', NULL, NULL, NULL),
			(8, 8, 'Pending', NULL, NULL, NULL);
	`);
	// Lot 9 (Rejected at stage 5 - stages 1-4 finalized, 5 in progress, 6-8 pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(9, 1, 'Finalized', '2026-02-10 09:00:00', '2026-02-14 16:00:00', 'Budi P.'),
			(9, 2, 'Finalized', '2026-02-15 08:00:00', '2026-02-18 16:00:00', 'Budi P.'),
			(9, 3, 'Finalized', '2026-02-19 08:00:00', '2026-02-21 16:00:00', 'Budi P.'),
			(9, 4, 'Finalized', '2026-02-22 08:00:00', '2026-02-24 16:00:00', 'Budi P.'),
			(9, 5, 'In Progress', '2026-02-26 08:00:00', NULL, NULL),
			(9, 6, 'Pending', NULL, NULL, NULL),
			(9, 7, 'Pending', NULL, NULL, NULL),
			(9, 8, 'Pending', NULL, NULL, NULL);
	`);
	// Lot 10 (Draft - all 8 pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(10, 1, 'Pending', NULL, NULL, NULL),
			(10, 2, 'Pending', NULL, NULL, NULL),
			(10, 3, 'Pending', NULL, NULL, NULL),
			(10, 4, 'Pending', NULL, NULL, NULL),
			(10, 5, 'Pending', NULL, NULL, NULL),
			(10, 6, 'Pending', NULL, NULL, NULL),
			(10, 7, 'Pending', NULL, NULL, NULL),
			(10, 8, 'Pending', NULL, NULL, NULL);
	`);

	// --- Stage 1 records (100 kg leaf -> ~96 kg powder, 96% yield) ---
	db.exec(`
		INSERT INTO stage1_records (batch_id, receipt_date, processing_date, gross_weight_kg, tare_weight_kg, net_weight_kg, moisture_content_pct, grinder_id, screen_mesh_mm, feed_rate_setting, machine_temp_c, rpm, run_duration_min, powder_weight_kg, dust_loss_kg, powder_yield_pct, mass_balance_error_pct, operator_name) VALUES
			(1, '2026-01-09', '2026-01-10', 102.0, 2.0, 100.0, 8.5, 1, 0.5, 'Medium', 42, 1800, 210, 96.0, 2.8, 96.0, 1.2, 'Ahmad R.'),
			(2, '2026-01-16', '2026-01-17', 102.5, 2.5, 100.0, 9.0, 1, 0.5, 'Medium', 40, 1800, 220, 95.8, 3.0, 95.8, 1.2, 'Dewi S.'),
			(3, '2026-01-23', '2026-01-24', 102.0, 2.0, 100.0, 8.2, 1, 0.5, 'Medium', 41, 1800, 215, 96.2, 2.6, 96.2, 1.2, 'Ahmad R.'),
			(4, '2026-01-30', '2026-01-31', 102.5, 2.5, 100.0, 8.8, 1, 0.5, 'Medium', 43, 1800, 230, 95.6, 3.2, 95.6, 1.2, 'Budi P.'),
			(5, '2026-02-06', '2026-02-07', 102.0, 2.0, 100.0, 8.4, 1, 0.5, 'Medium', 40, 1800, 200, 96.4, 2.4, 96.4, 1.2, 'Dewi S.'),
			(6, '2026-02-13', '2026-02-14', 102.5, 2.5, 100.0, 8.6, 1, 0.5, 'Medium', 41, 1800, 225, 95.8, 3.0, 95.8, 1.2, 'Ahmad R.'),
			(7, '2026-02-20', '2026-02-21', 102.0, 2.0, 100.0, 9.1, 1, 0.5, 'Medium', 42, 1800, 240, 95.4, 3.4, 95.4, 1.2, 'Budi P.'),
			(9, '2026-02-09', '2026-02-10', 102.5, 2.5, 100.0, 8.8, 1, 0.5, 'Medium', 42, 1800, 230, 95.6, 3.2, 95.6, 1.2, 'Budi P.');
	`);

	// --- Stage 2 records (96 kg powder x 5 L/kg = 480 L ethanol 70%; 350 L stock + 130 L water) ---
	// Filtration: bag filter gets main filtrate (~400L), centrifuge extracts ~40L from wet cake, screw press ~20L from remaining cake
	db.exec(`
		INSERT INTO stage2_records (batch_id, ethanol_stock_grade_pct, target_ethanol_pct, ethanol_stock_used_l, water_added_l, ethanol_70_volume_l, settle_time_min, bag_filter_input_l, bag_filter_output_l, centrifuge_input_l, centrifuge_output_l, screw_press_input_l, screw_press_output_l, total_ethanol_70_to_rotovap_l, total_ethanol_distilled_l, water_mother_liquid_l, total_ethanol_recovered_l, total_ethanol_loss_l, recovery_rate_pct, extract_weight_kg, operator_name) VALUES
			(1, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 400.0, 80.0, 40.0, 40.0, 20.0, 460.0, 430.0, 30.0, 330.0, 20.0, 94.3, 12.0, 'Ahmad R.'),
			(2, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 402.0, 78.0, 41.0, 37.0, 18.0, 461.0, 432.0, 29.0, 332.0, 18.0, 94.9, 11.8, 'Dewi S.'),
			(3, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 398.0, 82.0, 39.0, 43.0, 22.0, 459.0, 428.0, 31.0, 328.0, 22.0, 93.7, 12.2, 'Ahmad R.'),
			(4, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 400.0, 80.0, 40.0, 40.0, 20.0, 460.0, 431.0, 29.0, 331.0, 19.0, 94.6, 11.6, 'Budi P.'),
			(5, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 403.0, 77.0, 41.0, 36.0, 18.0, 462.0, 433.0, 29.0, 333.0, 17.0, 95.1, 11.5, 'Dewi S.'),
			(6, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 400.0, 80.0, 40.0, 40.0, 20.0, 460.0, 430.0, 30.0, 330.0, 20.0, 94.3, 12.1, 'Ahmad R.'),
			(7, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 396.0, 84.0, 38.0, 46.0, 24.0, 458.0, 427.0, 31.0, 327.0, 23.0, 93.4, 12.4, 'Budi P.'),
			(9, 96, 70, 350.0, 130.0, 480.0, 30, 480.0, 401.0, 79.0, 40.0, 39.0, 20.0, 461.0, 431.0, 30.0, 331.0, 19.0, 94.6, 11.9, 'Budi P.');
	`);

	// --- Stage 2 reactors (3 reactors x ~32 kg powder each, solvent_ratio = 5.0) ---
	db.exec(`
		INSERT INTO stage2_reactors (batch_id, reactor_number, machine_id, temperature_c, rpm, soak_time_min, powder_mass_kg, ethanol_70_volume_l, solvent_ratio) VALUES
			(1, 1, 2, 60, 120, 180, 32.0, 160.0, 5.0),
			(1, 2, 6, 60, 120, 180, 32.0, 160.0, 5.0),
			(1, 3, 7, 60, 120, 180, 32.0, 160.0, 5.0),
			(2, 1, 2, 60, 120, 180, 31.9, 159.5, 5.0),
			(2, 2, 6, 60, 120, 180, 31.9, 159.5, 5.0),
			(2, 3, 7, 60, 120, 180, 32.0, 161.0, 5.0),
			(3, 1, 2, 60, 120, 180, 32.1, 160.5, 5.0),
			(3, 2, 6, 60, 120, 180, 32.1, 160.5, 5.0),
			(3, 3, 7, 60, 120, 180, 32.0, 159.0, 5.0),
			(4, 1, 2, 60, 120, 180, 31.9, 159.5, 5.0),
			(4, 2, 6, 60, 120, 180, 31.9, 159.5, 5.0),
			(4, 3, 7, 60, 120, 180, 31.8, 161.0, 5.0),
			(5, 1, 2, 60, 120, 180, 32.1, 160.5, 5.0),
			(5, 2, 6, 60, 120, 180, 32.1, 160.5, 5.0),
			(5, 3, 7, 60, 120, 180, 32.2, 159.0, 5.0),
			(6, 1, 2, 60, 120, 180, 31.9, 159.5, 5.0),
			(6, 2, 6, 60, 120, 180, 31.9, 159.5, 5.0),
			(6, 3, 7, 60, 120, 180, 32.0, 161.0, 5.0),
			(7, 1, 2, 60, 120, 180, 31.8, 159.0, 5.0),
			(7, 2, 6, 60, 120, 180, 31.8, 159.0, 5.0),
			(7, 3, 7, 60, 120, 180, 31.8, 162.0, 5.0),
			(9, 1, 2, 60, 120, 180, 31.9, 159.5, 5.0),
			(9, 2, 6, 60, 120, 180, 31.9, 159.5, 5.0),
			(9, 3, 7, 60, 120, 180, 31.8, 161.0, 5.0);
	`);

	// --- Stage 2 rotovap daily logs ---
	db.exec(`
		INSERT INTO stage2_rotovap_days (batch_id, rotovap_number, machine_id, day_number, water_bath_temp_c, vacuum_mbar, chiller_temp_c, rpm, run_time_hours, ethanol_recovered_l, recovery_per_hour_l) VALUES
			(1, 1, 4, 1, 45, 150, 5, 120, 8.0, 145.0, 18.1),
			(1, 1, 4, 2, 45, 150, 5, 120, 8.0, 143.0, 17.9),
			(1, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(2, 1, 4, 1, 45, 150, 5, 120, 8.0, 146.0, 18.3),
			(2, 1, 4, 2, 45, 150, 5, 120, 8.0, 144.0, 18.0),
			(2, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(3, 1, 4, 1, 45, 150, 5, 120, 8.0, 144.0, 18.0),
			(3, 1, 4, 2, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(3, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(4, 1, 4, 1, 45, 150, 5, 120, 8.0, 145.0, 18.1),
			(4, 1, 4, 2, 45, 150, 5, 120, 8.0, 144.0, 18.0),
			(4, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(5, 1, 4, 1, 45, 150, 5, 120, 8.0, 146.0, 18.3),
			(5, 1, 4, 2, 45, 150, 5, 120, 8.0, 145.0, 18.1),
			(5, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(6, 1, 4, 1, 45, 150, 5, 120, 8.0, 145.0, 18.1),
			(6, 1, 4, 2, 45, 150, 5, 120, 8.0, 143.0, 17.9),
			(6, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(7, 1, 4, 1, 45, 150, 5, 120, 8.0, 144.0, 18.0),
			(7, 1, 4, 2, 45, 150, 5, 120, 8.0, 142.0, 17.8),
			(7, 2, 8, 1, 45, 150, 5, 120, 8.0, 141.0, 17.6),
			(9, 1, 4, 1, 45, 150, 5, 120, 8.0, 145.0, 18.1),
			(9, 1, 4, 2, 45, 150, 5, 120, 8.0, 144.0, 18.0),
			(9, 2, 8, 1, 45, 150, 5, 120, 8.0, 142.0, 17.8);
	`);

	// --- Stage 3 records (12 kg feed -> ~10 kg alkaloid precipitate, ~25 L limonene) ---
	db.exec(`
		INSERT INTO stage3_records (batch_id, feed_weight_kg, acid_type, acid_volume_l, acid_concentration_pct, water_volume_l, target_ph_acid, actual_ph_acid, limonene_volume_l, partition_vessel_id, num_washes, aqueous_phase_volume_l, organic_phase_volume_l, base_type, base_weight_kg, target_ph_base, actual_ph_base, limonene_recovered_l, limonene_loss_l, partition_loss_kg, alkaloid_precipitate_kg, operator_name) VALUES
			(1, 12.0, 'HCl', 8.5, 10.0, 50.0, 2.0, 2.1, 25.0, 3, 3, 48.0, 23.0, 'NaOH', 9.0, 10.0, 10.2, 22.0, 3.0, 0.8, 10.0, 'Ahmad R.'),
			(2, 11.8, 'HCl', 8.4, 10.0, 49.0, 2.0, 2.0, 25.0, 3, 3, 47.5, 23.2, 'NaOH', 8.8, 10.0, 10.1, 22.5, 2.5, 0.7, 9.8, 'Dewi S.'),
			(3, 12.2, 'HCl', 8.6, 10.0, 51.0, 2.0, 2.1, 25.5, 3, 3, 49.0, 23.5, 'NaOH', 9.2, 10.0, 10.0, 22.4, 3.1, 0.9, 10.2, 'Ahmad R.'),
			(4, 11.6, 'HCl', 8.2, 10.0, 48.0, 2.0, 2.0, 24.5, 3, 3, 46.5, 22.8, 'NaOH', 8.6, 10.0, 10.1, 21.8, 2.7, 0.7, 9.6, 'Budi P.'),
			(5, 11.5, 'HCl', 8.1, 10.0, 48.0, 2.0, 2.1, 24.5, 3, 3, 46.0, 22.5, 'NaOH', 8.5, 10.0, 10.0, 21.6, 2.9, 0.6, 9.5, 'Dewi S.'),
			(9, 11.9, 'HCl', 8.4, 10.0, 50.0, 2.0, 2.0, 25.0, 3, 3, 48.0, 23.0, 'NaOH', 8.9, 10.0, 10.1, 22.0, 3.0, 0.8, 9.8, 'Budi P.');
	`);

	// --- Stage 4 records (10 kg feed -> ~7.5 kg final product, 7.5% cumulative yield) ---
	db.exec(`
		INSERT INTO stage4_records (batch_id, feed_weight_kg, back_extraction_solvent, back_extraction_volume_l, back_extraction_temp_c, back_extraction_time_min, limonene_retained_product_kg, limonene_process_loss_kg, precipitation_method, precipitation_ph, precipitate_weight_kg, drying_cabinet_id, drying_temp_c, drying_time_hours, drying_humidity_pct, final_product_weight_kg, product_appearance, cumulative_yield_pct, stage_yield_pct, mass_balance_error_pct, operator_name) VALUES
			(1, 10.0, 'Ethanol', 20.0, 50, 60, 0.02, 0.05, 'pH precipitation', 9.5, 8.5, 5, 45, 24, 35, 7.5, 'Fine off-white powder', 7.5, 75.0, 1.8, 'Ahmad R.'),
			(2, 9.8, 'Ethanol', 19.5, 50, 60, 0.02, 0.05, 'pH precipitation', 9.5, 8.3, 5, 45, 24, 33, 7.4, 'Fine pale green powder', 7.4, 75.5, 1.6, 'Dewi S.'),
			(3, 10.2, 'Ethanol', 20.5, 50, 60, 0.03, 0.06, 'pH precipitation', 9.5, 8.7, 5, 45, 24, 34, 7.7, 'Fine off-white powder', 7.7, 75.5, 1.9, 'Ahmad R.'),
			(4, 9.6, 'Ethanol', 19.0, 50, 60, 0.02, 0.05, 'pH precipitation', 9.5, 8.2, 5, 45, 24, 34, 7.3, 'Fine off-white powder', 7.3, 76.0, 1.7, 'Budi P.');
	`);

	// --- Deviations (stage_number updated for 8-stage system) ---
	db.exec(`
		INSERT INTO deviations (batch_id, stage_number, deviation_type, severity, status, parameter, expected_value, actual_value, description, root_cause, corrective_action, raised_by, resolved_by, created_at, resolved_at) VALUES
			(1, 2, 'Process Parameter', 'Medium', 'Closed', 'Solvent Recovery Rate', '>=95%', '94.3%', 'Ethanol recovery rate below 95% target on lot 1', 'Rotovap vacuum seal degradation', 'Replaced vacuum seal, re-calibrated', 'Ahmad R.', 'Ahmad R.', '2026-01-24 14:00:00', '2026-01-25 10:00:00'),
			(9, 5, 'Process Parameter', 'Critical', 'Open', 'Acid Phase pH', '2.0', '3.8', 'pH significantly above target during acid/base extraction on lot 9', NULL, NULL, 'Budi P.', NULL, '2026-03-04 11:00:00', NULL),
			(3, 1, 'Mass Balance', 'Low', 'Resolved', 'Mass Balance Error', '<=2.0%', '2.1%', 'Mass balance error slightly above 2% threshold', 'Scale calibration drift', 'Recalibrated scale, verified within tolerance', 'Ahmad R.', 'Ahmad R.', '2026-01-28 15:00:00', '2026-01-29 09:00:00'),
			(2, 8, 'Environmental', 'Medium', 'Closed', 'Drying Humidity', '<=40%', '52%', 'Humidity spike during drying cycle on lot 2', 'HVAC malfunction in drying room', 'HVAC repaired, batch re-dried for additional 6 hours', 'Dewi S.', 'Dewi S.', '2026-02-11 10:00:00', '2026-02-12 14:00:00');
	`);

	// --- Lab Results ---
	db.exec(`
		INSERT INTO lab_results (batch_id, test_type, test_date, lab_reference, status, mitragynine_pct, hydroxy_mitragynine_pct, paynantheine_pct, speciogynine_pct, speciociliatine_pct, non_alkaloids_pct, tlc_spots_observed, tlc_rf_values, hplc_purity_pct, performed_by, reviewed_by, notes, created_at, updated_at) VALUES
			(1, 'HPLC', '2026-02-06', 'LAB-HPLC-001', 'Completed', 66.2, 1.8, 8.5, 6.2, 4.1, 13.2, NULL, NULL, 86.8, 'Lab Tech A', 'Dr. Chen', 'High mitragynine content, meets premium grade spec', '2026-02-06 09:00:00', '2026-02-08 10:00:00'),
			(1, 'TLC', '2026-02-06', 'LAB-TLC-001', 'Completed', NULL, NULL, NULL, NULL, NULL, NULL, 5, '0.15, 0.28, 0.42, 0.58, 0.72', NULL, 'Lab Tech A', 'Dr. Chen', '5 distinct spots observed, clean separation', '2026-02-06 10:00:00', '2026-02-08 11:00:00'),
			(2, 'HPLC', '2026-02-13', 'LAB-HPLC-002', 'Completed', 65.8, 1.9, 8.8, 6.5, 4.3, 12.7, NULL, NULL, 87.3, 'Lab Tech A', 'Dr. Chen', 'Good alkaloid profile for Green Sumatra', '2026-02-13 09:00:00', '2026-02-15 14:00:00'),
			(3, 'HPLC', '2026-02-21', 'LAB-HPLC-003', 'Completed', 62.5, 2.1, 9.0, 7.1, 5.0, 14.3, NULL, NULL, 85.7, 'Lab Tech A', 'Dr. Chen', 'Good alkaloid profile for Red Borneo', '2026-02-21 09:00:00', '2026-02-23 14:00:00'),
			(4, 'TLC', '2026-03-02', 'LAB-TLC-004', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Awaiting TLC analysis for lot 4', '2026-03-02 08:00:00', '2026-03-02 08:00:00');
	`);

	// --- Approvals (stage_number updated for 8-stage system) ---
	db.exec(`
		INSERT INTO approvals (batch_id, stage_number, approval_type, status, requested_by, decided_by, decision_notes, requested_at, decided_at) VALUES
			(1, NULL, 'batch_review', 'Approved', 'Ahmad R.', 'Supervisor K.', 'All quality parameters met. HPLC confirms premium grade.', '2026-02-05 16:30:00', '2026-02-06 10:00:00'),
			(2, NULL, 'batch_review', 'Approved', 'Dewi S.', 'Supervisor K.', 'Quality parameters met.', '2026-02-12 16:30:00', '2026-02-13 10:00:00'),
			(3, NULL, 'batch_review', 'Approved', 'Ahmad R.', 'Supervisor K.', 'Red Borneo lot approved.', '2026-02-20 16:30:00', '2026-02-21 10:00:00'),
			(4, NULL, 'batch_review', 'Pending', 'Budi P.', NULL, NULL, '2026-03-01 15:30:00', NULL),
			(9, 5, 'stage_finalization', 'Rejected', 'Budi P.', 'Supervisor K.', 'Critical pH deviation must be investigated before proceeding.', '2026-03-04 12:00:00', '2026-03-08 10:00:00');
	`);

	// --- Unit Rates ---
	db.exec(`
		INSERT INTO unit_rates (category, item_name, unit, rate_per_unit, effective_from, notes) VALUES
			('Material', 'Dried Leaf', 'kg', 45.00, '2026-01-01', 'Sumatra Direct pricing'),
			('Material', 'Ethanol 96%', 'L', 12.50, '2026-01-01', 'Industrial grade'),
			('Material', 'DI Water', 'L', 0.15, '2026-01-01', 'In-house RO system'),
			('Material', 'HCl', 'L', 28.00, '2026-01-01', 'ACS grade'),
			('Material', 'NaOH', 'kg', 18.00, '2026-01-01', 'Technical grade'),
			('Material', 'Limonene', 'L', 35.00, '2026-01-01', 'Food grade d-limonene'),
			('Labor', 'Operator', 'hr', 15.00, '2026-01-01', 'Standard operator rate'),
			('Labor', 'Supervisor', 'hr', 25.00, '2026-01-01', 'Supervisor review rate'),
			('Utility', 'Electricity', 'kWh', 0.18, '2026-01-01', 'Local industrial rate');
	`);

	// --- Batch Costs (stage_number updated for 8-stage system) ---
	db.exec(`
		INSERT INTO batch_costs (batch_id, stage_number, cost_category, item_name, quantity, unit_rate, total_cost, notes) VALUES
			(1, 1, 'Material', 'Dried Leaf', 100.0, 45.00, 4500.00, 'Raw leaf input'),
			(1, 1, 'Labor', 'Operator', 8.0, 15.00, 120.00, 'Grinding operation'),
			(1, 1, 'Utility', 'Electricity', 38.0, 0.18, 6.84, 'Grinder power consumption'),
			(1, 2, 'Material', 'Ethanol 96%', 350.0, 12.50, 4375.00, 'Ethanol stock issued'),
			(1, 2, 'Labor', 'Operator', 40.0, 15.00, 600.00, 'Extraction operation'),
			(1, 2, 'Utility', 'Electricity', 200.0, 0.18, 36.00, 'Reactor + rotovap power'),
			(1, 5, 'Material', 'HCl', 8.5, 28.00, 238.00, 'Acid extraction'),
			(1, 5, 'Material', 'NaOH', 9.0, 18.00, 162.00, 'Base extraction'),
			(1, 5, 'Material', 'Limonene', 25.0, 35.00, 875.00, 'Partition solvent'),
			(1, 5, 'Material', 'DI Water', 50.0, 0.15, 7.50, 'Wash water'),
			(1, 5, 'Labor', 'Operator', 20.0, 15.00, 300.00, 'Partitioning operations'),
			(1, 8, 'Labor', 'Operator', 16.0, 15.00, 240.00, 'Drying and final product'),
			(1, 8, 'Utility', 'Electricity', 100.0, 0.18, 18.00, 'Drying cabinet power');
	`);

	// --- Machine status events ---
	db.exec(`
		INSERT INTO machine_status_events (machine_id, previous_status, new_status, batch_id, reason, performed_by, created_at) VALUES
			(4, 'Running', 'Maintenance', NULL, 'Vacuum seal replacement needed', 'Ahmad R.', '2026-03-08 14:00:00'),
			(1, 'Idle', 'Running', 8, 'Starting lot SG-LOT-008 grinding', 'Dewi S.', '2026-03-01 09:00:00'),
			(5, 'Idle', 'Running', 5, 'Starting lot SG-LOT-005 drying', 'Dewi S.', '2026-03-03 08:00:00');
	`);

	// --- Material movements (stage_number updated for 8-stage system) ---
	db.exec(`
		INSERT INTO material_movements (material_id, batch_id, movement_type, quantity, stage_number, reference_note, performed_by, created_at) VALUES
			(1, 1, 'Issued', 100.0, 1, 'Dried leaf issued for lot SG-LOT-001', 'Ahmad R.', '2026-01-10 08:30:00'),
			(2, 1, 'Issued', 350.0, 2, 'Ethanol stock issued for extraction', 'Ahmad R.', '2026-01-15 08:00:00'),
			(2, 1, 'Recovered', 330.0, 2, 'Ethanol recovered via rotovap', 'Ahmad R.', '2026-01-24 14:00:00'),
			(3, 1, 'Issued', 50.0, 5, 'DI Water for wash', 'Ahmad R.', '2026-01-26 08:00:00'),
			(4, 1, 'Issued', 8.5, 5, 'HCl for acid extraction', 'Ahmad R.', '2026-01-26 08:30:00'),
			(5, 1, 'Issued', 9.0, 5, 'NaOH for base extraction', 'Ahmad R.', '2026-01-26 10:00:00'),
			(6, 1, 'Issued', 25.0, 5, 'Limonene for partitioning', 'Ahmad R.', '2026-01-26 08:15:00'),
			(6, 1, 'Recovered', 22.0, 5, 'Limonene recovered', 'Ahmad R.', '2026-01-31 14:00:00');
	`);
}
