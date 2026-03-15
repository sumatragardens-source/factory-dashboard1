import type Database from 'better-sqlite3';

export function seedData(db: Database.Database): void {
	// --- Machines (must be inserted before stage records that reference them) ---
	db.exec(`
		INSERT INTO machines (code, name, machine_type, location, status, stage_relevance) VALUES
			('GRN-01', 'Grinder Unit 1', 'Grinder', 'Processing Room A', 'Running', 'Raw Leaf to Powder'),
			('RXT-01', 'Reactor Unit 1', 'Reactor', 'Extraction Room', 'Running', 'Ethanol Extraction'),
			('SEP-01', 'Separation Vessel 1', 'Separation Vessel', 'Extraction Room', 'Idle', 'Acid/Base Extraction'),
			('RTV-01', 'Rotovap Unit 1', 'Rotovap', 'Extraction Room', 'Maintenance', 'Ethanol Extraction'),
			('DRY-01', 'Drying Cabinet 1', 'Drying Cabinet', 'Drying Room', 'Running', 'Final Product');
	`);

	// --- Materials ---
	db.exec(`
		INSERT INTO materials (code, name, unit, on_hand_qty, reorder_threshold, stage_relevance) VALUES
			('MAT-LEAF', 'Dried Leaf', 'kg', 45.0, 50, 'Raw Leaf to Powder'),
			('MAT-ETOH', 'Ethanol 96%', 'L', 180.0, 100, 'Ethanol Extraction'),
			('MAT-H2O', 'DI Water', 'L', 480.0, 200, 'Acid/Base Extraction'),
			('MAT-HCL', 'HCl', 'L', 8.5, 10, 'Acid/Base Extraction'),
			('MAT-NAOH', 'NaOH', 'kg', 38.0, 40, 'Acid/Base Extraction'),
			('MAT-LIM', 'Limonene', 'L', 25.0, 20, 'Acid/Base, Final Product');
	`);

	// --- Batches ---
	db.exec(`
		INSERT INTO batches (batch_number, status, current_stage, supplier, strain, leaf_input_kg, operator_name, notes, created_at, updated_at, started_at, completed_at) VALUES
			('SG-2026-001', 'Completed', 4, 'Sumatra Direct', 'Green Sumatra Premium', 5.0, 'Ahmad R.', 'Full run with HPLC and TLC testing', '2026-01-15 08:00:00', '2026-02-10 16:00:00', '2026-01-15 08:30:00', '2026-02-10 16:00:00'),
			('SG-2026-002', 'Completed', 4, 'Borneo Botanicals', 'Red Borneo Select', 6.5, 'Dewi S.', 'Second completed batch for comparison', '2026-01-20 08:00:00', '2026-02-18 14:00:00', '2026-01-20 08:30:00', '2026-02-18 14:00:00'),
			('SG-2026-003', 'In Progress', 3, 'Sumatra Direct', 'Green Sumatra Premium', 4.2, 'Ahmad R.', 'Mid-partitioning', '2026-02-01 08:00:00', '2026-03-05 10:00:00', '2026-02-01 09:00:00', NULL),
			('SG-2026-004', 'In Progress', 2, 'Maeng Da Farms', 'White Maeng Da', 7.0, 'Budi P.', 'In ethanol extraction', '2026-02-10 08:00:00', '2026-03-08 11:00:00', '2026-02-10 09:00:00', NULL),
			('SG-2026-005', 'In Progress', 1, 'Sumatra Direct', 'Green Sumatra Premium', 3.5, 'Dewi S.', 'Stalled - grinder offline for maintenance', '2026-03-01 08:00:00', '2026-03-12 08:00:00', '2026-03-01 09:00:00', NULL),
			('SG-2026-006', 'Pending Review', 4, 'Borneo Botanicals', 'Red Borneo Select', 5.8, 'Ahmad R.', 'All stages done, awaiting final approval', '2026-02-05 08:00:00', '2026-03-10 15:00:00', '2026-02-05 08:30:00', NULL),
			('SG-2026-007', 'Rejected', 3, 'Sumatra Direct', 'Green Sumatra Premium', 4.0, 'Budi P.', 'pH deviation in stage 3 - rejected for review', '2026-02-15 08:00:00', '2026-03-06 10:00:00', '2026-02-15 09:00:00', NULL),
			('SG-2026-008', 'Draft', 1, 'Maeng Da Farms', 'White Maeng Da', 8.0, NULL, 'Not started', '2026-03-10 08:00:00', '2026-03-10 08:00:00', NULL, NULL),
			('SG-2026-009', 'In Progress', 4, 'Sumatra Direct', 'Green Sumatra Premium', 6.0, 'Dewi S.', 'Drying in progress', '2026-02-08 08:00:00', '2026-03-12 09:00:00', '2026-02-08 09:00:00', NULL);
	`);

	// --- Batch stages ---
	// Batch 1 (Completed - all 4 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(1, 1, 'Finalized', '2026-01-15 08:30:00', '2026-01-18 16:00:00', 'Ahmad R.'),
			(1, 2, 'Finalized', '2026-01-20 08:00:00', '2026-01-28 16:00:00', 'Ahmad R.'),
			(1, 3, 'Finalized', '2026-01-30 08:00:00', '2026-02-05 16:00:00', 'Ahmad R.'),
			(1, 4, 'Finalized', '2026-02-06 08:00:00', '2026-02-10 16:00:00', 'Ahmad R.');
	`);
	// Batch 2 (Completed - all 4 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(2, 1, 'Finalized', '2026-01-20 08:30:00', '2026-01-23 16:00:00', 'Dewi S.'),
			(2, 2, 'Finalized', '2026-01-25 08:00:00', '2026-02-02 16:00:00', 'Dewi S.'),
			(2, 3, 'Finalized', '2026-02-04 08:00:00', '2026-02-12 16:00:00', 'Dewi S.'),
			(2, 4, 'Finalized', '2026-02-13 08:00:00', '2026-02-18 14:00:00', 'Dewi S.');
	`);
	// Batch 3 (In Progress stage 3 - stages 1,2 finalized, 3 in progress)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(3, 1, 'Finalized', '2026-02-01 09:00:00', '2026-02-04 16:00:00', 'Ahmad R.'),
			(3, 2, 'Finalized', '2026-02-06 08:00:00', '2026-02-14 16:00:00', 'Ahmad R.'),
			(3, 3, 'In Progress', '2026-03-01 08:00:00', NULL, NULL),
			(3, 4, 'Pending', NULL, NULL, NULL);
	`);
	// Batch 4 (In Progress stage 2 - stage 1 finalized, 2 in progress)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(4, 1, 'Finalized', '2026-02-10 09:00:00', '2026-02-13 16:00:00', 'Budi P.'),
			(4, 2, 'In Progress', '2026-03-05 08:00:00', NULL, NULL),
			(4, 3, 'Pending', NULL, NULL, NULL),
			(4, 4, 'Pending', NULL, NULL, NULL);
	`);
	// Batch 5 (In Progress stage 1 - stage 1 in progress, stalled)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(5, 1, 'In Progress', '2026-03-01 09:00:00', NULL, NULL),
			(5, 2, 'Pending', NULL, NULL, NULL),
			(5, 3, 'Pending', NULL, NULL, NULL),
			(5, 4, 'Pending', NULL, NULL, NULL);
	`);
	// Batch 6 (Pending Review - all 4 finalized)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(6, 1, 'Finalized', '2026-02-05 08:30:00', '2026-02-08 16:00:00', 'Ahmad R.'),
			(6, 2, 'Finalized', '2026-02-10 08:00:00', '2026-02-18 16:00:00', 'Ahmad R.'),
			(6, 3, 'Finalized', '2026-02-20 08:00:00', '2026-02-28 16:00:00', 'Ahmad R.'),
			(6, 4, 'Finalized', '2026-03-01 08:00:00', '2026-03-10 15:00:00', 'Ahmad R.');
	`);
	// Batch 7 (Rejected at stage 3 - stages 1,2 finalized, 3 in progress)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(7, 1, 'Finalized', '2026-02-15 09:00:00', '2026-02-18 16:00:00', 'Budi P.'),
			(7, 2, 'Finalized', '2026-02-20 08:00:00', '2026-02-28 16:00:00', 'Budi P.'),
			(7, 3, 'In Progress', '2026-03-02 08:00:00', NULL, NULL),
			(7, 4, 'Pending', NULL, NULL, NULL);
	`);
	// Batch 8 (Draft - all pending)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(8, 1, 'Pending', NULL, NULL, NULL),
			(8, 2, 'Pending', NULL, NULL, NULL),
			(8, 3, 'Pending', NULL, NULL, NULL),
			(8, 4, 'Pending', NULL, NULL, NULL);
	`);
	// Batch 9 (In Progress stage 4 - stages 1-3 finalized, 4 in progress)
	db.exec(`
		INSERT INTO batch_stages (batch_id, stage_number, status, started_at, finalized_at, finalized_by) VALUES
			(9, 1, 'Finalized', '2026-02-08 09:00:00', '2026-02-11 16:00:00', 'Dewi S.'),
			(9, 2, 'Finalized', '2026-02-13 08:00:00', '2026-02-21 16:00:00', 'Dewi S.'),
			(9, 3, 'Finalized', '2026-02-23 08:00:00', '2026-03-03 16:00:00', 'Dewi S.'),
			(9, 4, 'In Progress', '2026-03-05 08:00:00', NULL, NULL);
	`);

	// --- Stage 1 records ---
	db.exec(`
		INSERT INTO stage1_records (batch_id, receipt_date, processing_date, gross_weight_kg, tare_weight_kg, net_weight_kg, moisture_content_pct, grinder_id, screen_mesh_mm, feed_rate_setting, machine_temp_c, rpm, run_duration_min, powder_weight_kg, dust_loss_kg, powder_yield_pct, mass_balance_error_pct, operator_name) VALUES
			(1, '2026-01-14', '2026-01-15', 5.2, 0.2, 5.0, 8.5, 1, 0.5, 'Medium', 42, 1800, 45, 4.82, 0.12, 96.4, 1.2, 'Ahmad R.'),
			(2, '2026-01-19', '2026-01-20', 6.8, 0.3, 6.5, 9.0, 1, 0.5, 'Medium', 40, 1800, 55, 6.24, 0.16, 96.0, 1.5, 'Dewi S.'),
			(3, '2026-01-31', '2026-02-01', 4.5, 0.3, 4.2, 8.2, 1, 0.5, 'Medium', 41, 1800, 35, 4.05, 0.09, 96.4, 1.4, 'Ahmad R.'),
			(4, '2026-02-09', '2026-02-10', 7.3, 0.3, 7.0, 8.8, 1, 0.5, 'Medium', 43, 1800, 60, 6.72, 0.18, 96.0, 1.4, 'Budi P.'),
			(6, '2026-02-04', '2026-02-05', 6.1, 0.3, 5.8, 8.6, 1, 0.5, 'Medium', 41, 1800, 50, 5.57, 0.14, 96.0, 1.6, 'Ahmad R.'),
			(7, '2026-02-14', '2026-02-15', 4.3, 0.3, 4.0, 9.1, 1, 0.5, 'Medium', 42, 1800, 33, 3.84, 0.10, 96.0, 1.5, 'Budi P.'),
			(9, '2026-02-07', '2026-02-08', 6.3, 0.3, 6.0, 8.4, 1, 0.5, 'Medium', 40, 1800, 52, 5.78, 0.14, 96.3, 1.3, 'Dewi S.');
	`);

	// --- Stage 2 records ---
	db.exec(`
		INSERT INTO stage2_records (batch_id, dry_mass_kg, ethanol_volume_l, solvent_ratio, ethanol_grade, reactor_id, set_temperature_c, agitation_rpm, soak_time_min, settle_time_min, filter_micron, filter_pressure_psi, de_added, rotovap_id, rotovap_bath_temp_c, rotovap_vacuum_mbar, recovered_ethanol_l, ethanol_loss_l, recovery_rate_pct, extract_weight_kg, operator_name) VALUES
			(1, 4.82, 38.5, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.1, 4, 45, 150, 36.2, 2.3, 94.0, 0.58, 'Ahmad R.'),
			(2, 6.24, 50.0, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.12, 4, 45, 150, 47.5, 2.5, 95.0, 0.75, 'Dewi S.'),
			(3, 4.05, 32.4, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.08, 4, 45, 150, 30.5, 1.9, 94.1, 0.49, 'Ahmad R.'),
			(6, 5.57, 44.6, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.11, 4, 45, 150, 42.3, 2.3, 94.8, 0.67, 'Ahmad R.'),
			(7, 3.84, 30.7, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.08, 4, 45, 150, 29.2, 1.5, 95.1, 0.46, 'Budi P.'),
			(9, 5.78, 46.2, 8.0, '96%', 2, 60, 120, 180, 30, 25, 15, 0.12, 4, 45, 150, 43.9, 2.3, 95.0, 0.69, 'Dewi S.');
	`);

	// --- Stage 3 records ---
	db.exec(`
		INSERT INTO stage3_records (batch_id, feed_weight_kg, acid_type, acid_volume_l, acid_concentration_pct, water_volume_l, target_ph_acid, actual_ph_acid, limonene_volume_l, partition_vessel_id, num_washes, aqueous_phase_volume_l, organic_phase_volume_l, base_type, base_weight_kg, target_ph_base, actual_ph_base, limonene_recovered_l, limonene_loss_l, partition_loss_kg, alkaloid_precipitate_kg, operator_name) VALUES
			(1, 0.58, 'HCl', 0.5, 10.0, 5.0, 2.0, 2.1, 2.5, 3, 3, 4.8, 2.3, 'NaOH', 0.8, 10.0, 10.2, 2.2, 0.3, 0.04, 0.48, 'Ahmad R.'),
			(2, 0.75, 'HCl', 0.65, 10.0, 6.5, 2.0, 2.0, 3.2, 3, 3, 6.2, 3.0, 'NaOH', 1.0, 10.0, 10.1, 2.9, 0.3, 0.05, 0.62, 'Dewi S.'),
			(6, 0.67, 'HCl', 0.58, 10.0, 5.8, 2.0, 2.1, 2.8, 3, 3, 5.5, 2.6, 'NaOH', 0.9, 10.0, 10.0, 2.5, 0.3, 0.04, 0.55, 'Ahmad R.'),
			(9, 0.69, 'HCl', 0.6, 10.0, 6.0, 2.0, 2.0, 2.9, 3, 3, 5.7, 2.7, 'NaOH', 0.92, 10.0, 10.1, 2.6, 0.3, 0.04, 0.57, 'Dewi S.');
	`);

	// --- Stage 4 records ---
	db.exec(`
		INSERT INTO stage4_records (batch_id, feed_weight_kg, back_extraction_solvent, back_extraction_volume_l, back_extraction_temp_c, back_extraction_time_min, limonene_retained_product_kg, limonene_process_loss_kg, precipitation_method, precipitation_ph, precipitate_weight_kg, drying_cabinet_id, drying_temp_c, drying_time_hours, drying_humidity_pct, final_product_weight_kg, product_appearance, cumulative_yield_pct, stage_yield_pct, mass_balance_error_pct, operator_name) VALUES
			(1, 0.48, 'Ethanol', 2.0, 50, 60, 0.002, 0.005, 'pH precipitation', 9.5, 0.42, 5, 45, 24, 35, 0.38, 'Fine off-white powder', 7.6, 79.2, 1.8, 'Ahmad R.'),
			(2, 0.62, 'Ethanol', 2.5, 50, 60, 0.003, 0.006, 'pH precipitation', 9.5, 0.54, 5, 45, 24, 33, 0.49, 'Fine pale green powder', 7.5, 79.0, 1.6, 'Dewi S.'),
			(6, 0.55, 'Ethanol', 2.2, 50, 60, 0.002, 0.005, 'pH precipitation', 9.5, 0.48, 5, 45, 24, 34, 0.43, 'Fine off-white powder', 7.4, 78.2, 1.9, 'Ahmad R.');
	`);

	// --- Deviations ---
	db.exec(`
		INSERT INTO deviations (batch_id, stage_number, deviation_type, severity, status, parameter, expected_value, actual_value, description, root_cause, corrective_action, raised_by, resolved_by, created_at, resolved_at) VALUES
			(1, 2, 'Process Parameter', 'Medium', 'Closed', 'Solvent Recovery Rate', '≥95%', '94.0%', 'Ethanol recovery rate below 95% target', 'Rotovap vacuum seal degradation', 'Replaced vacuum seal, re-calibrated', 'Ahmad R.', 'Ahmad R.', '2026-01-28 14:00:00', '2026-01-29 10:00:00'),
			(7, 3, 'Process Parameter', 'Critical', 'Open', 'Acid Phase pH', '2.0', '3.8', 'pH significantly above target during acid extraction', NULL, NULL, 'Budi P.', NULL, '2026-03-04 11:00:00', NULL),
			(3, 1, 'Mass Balance', 'Low', 'Resolved', 'Mass Balance Error', '≤2.0%', '2.1%', 'Mass balance error slightly above 2% threshold', 'Scale calibration drift', 'Recalibrated scale, verified within tolerance', 'Ahmad R.', 'Ahmad R.', '2026-02-04 15:00:00', '2026-02-05 09:00:00'),
			(2, 4, 'Environmental', 'Medium', 'Closed', 'Drying Humidity', '≤40%', '52%', 'Humidity spike during drying cycle', 'HVAC malfunction in drying room', 'HVAC repaired, batch re-dried for additional 6 hours', 'Dewi S.', 'Dewi S.', '2026-02-16 10:00:00', '2026-02-17 14:00:00');
	`);

	// --- Lab Results ---
	db.exec(`
		INSERT INTO lab_results (batch_id, test_type, test_date, lab_reference, status, mitragynine_pct, hydroxy_mitragynine_pct, paynantheine_pct, speciogynine_pct, speciociliatine_pct, non_alkaloids_pct, tlc_spots_observed, tlc_rf_values, hplc_purity_pct, performed_by, reviewed_by, notes, created_at, updated_at) VALUES
			(1, 'HPLC', '2026-02-11', 'LAB-HPLC-001', 'Completed', 66.2, 1.8, 8.5, 6.2, 4.1, 13.2, NULL, NULL, 86.8, 'Lab Tech A', 'Dr. Chen', 'High mitragynine content, meets premium grade spec', '2026-02-11 09:00:00', '2026-02-13 10:00:00'),
			(1, 'TLC', '2026-02-11', 'LAB-TLC-001', 'Completed', NULL, NULL, NULL, NULL, NULL, NULL, 5, '0.15, 0.28, 0.42, 0.58, 0.72', NULL, 'Lab Tech A', 'Dr. Chen', '5 distinct spots observed, clean separation', '2026-02-11 10:00:00', '2026-02-13 11:00:00'),
			(2, 'HPLC', '2026-02-19', 'LAB-HPLC-002', 'Completed', 62.5, 2.1, 9.0, 7.1, 5.0, 14.3, NULL, NULL, 85.7, 'Lab Tech A', 'Dr. Chen', 'Good alkaloid profile for Red Borneo', '2026-02-19 09:00:00', '2026-02-21 14:00:00'),
			(6, 'TLC', '2026-03-11', 'LAB-TLC-003', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Awaiting TLC analysis', '2026-03-11 08:00:00', '2026-03-11 08:00:00');
	`);

	// --- Approvals ---
	db.exec(`
		INSERT INTO approvals (batch_id, stage_number, approval_type, status, requested_by, decided_by, decision_notes, requested_at, decided_at) VALUES
			(1, NULL, 'batch_review', 'Approved', 'Ahmad R.', 'Supervisor K.', 'All quality parameters met. HPLC confirms premium grade.', '2026-02-10 16:30:00', '2026-02-11 10:00:00'),
			(6, NULL, 'batch_review', 'Pending', 'Ahmad R.', NULL, NULL, '2026-03-10 15:30:00', NULL),
			(7, 3, 'stage_finalization', 'Rejected', 'Budi P.', 'Supervisor K.', 'Critical pH deviation must be investigated before proceeding.', '2026-03-04 12:00:00', '2026-03-06 10:00:00');
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

	// --- Batch Costs (SG-2026-001) ---
	db.exec(`
		INSERT INTO batch_costs (batch_id, stage_number, cost_category, item_name, quantity, unit_rate, total_cost, notes) VALUES
			(1, 1, 'Material', 'Dried Leaf', 5.0, 45.00, 225.00, 'Raw leaf input'),
			(1, 1, 'Labor', 'Operator', 1.5, 15.00, 22.50, 'Grinding operation'),
			(1, 1, 'Utility', 'Electricity', 4.7, 0.18, 8.46, 'Grinder power consumption'),
			(1, 2, 'Material', 'Ethanol 96%', 38.5, 12.50, 481.25, 'Ethanol issued'),
			(1, 2, 'Labor', 'Operator', 2.0, 15.00, 30.00, 'Extraction operation'),
			(1, 2, 'Utility', 'Electricity', 9.2, 0.18, 16.56, 'Reactor + rotovap power'),
			(1, 3, 'Material', 'HCl', 0.5, 28.00, 14.00, 'Acid extraction'),
			(1, 3, 'Material', 'NaOH', 0.8, 18.00, 14.40, 'Base extraction'),
			(1, 3, 'Material', 'Limonene', 2.5, 35.00, 87.50, 'Partition solvent'),
			(1, 3, 'Material', 'DI Water', 5.0, 0.15, 0.75, 'Wash water'),
			(1, 3, 'Labor', 'Operator', 4.0, 15.00, 60.00, 'Partitioning operations'),
			(1, 4, 'Labor', 'Operator', 2.0, 15.00, 30.00, 'Drying and final product'),
			(1, 4, 'Utility', 'Electricity', 9.5, 0.18, 17.10, 'Drying cabinet power');
	`);

	// --- Machine status events ---
	db.exec(`
		INSERT INTO machine_status_events (machine_id, previous_status, new_status, batch_id, reason, performed_by, created_at) VALUES
			(4, 'Running', 'Maintenance', NULL, 'Vacuum seal replacement needed', 'Ahmad R.', '2026-03-08 14:00:00'),
			(1, 'Idle', 'Running', 5, 'Starting batch SG-2026-005 grinding', 'Dewi S.', '2026-03-01 09:00:00'),
			(5, 'Idle', 'Running', 9, 'Starting batch SG-2026-009 drying', 'Dewi S.', '2026-03-05 08:00:00');
	`);

	// --- Material movements for batch SG-2026-001 ---
	db.exec(`
		INSERT INTO material_movements (material_id, batch_id, movement_type, quantity, stage_number, reference_note, performed_by, created_at) VALUES
			(1, 1, 'Issued', 5.0, 1, 'Dried leaf issued for batch SG-2026-001', 'Ahmad R.', '2026-01-15 08:30:00'),
			(2, 1, 'Issued', 38.5, 2, 'Ethanol issued for extraction', 'Ahmad R.', '2026-01-20 08:00:00'),
			(2, 1, 'Recovered', 36.2, 2, 'Ethanol recovered via rotovap', 'Ahmad R.', '2026-01-28 14:00:00'),
			(3, 1, 'Issued', 5.0, 3, 'DI Water for wash', 'Ahmad R.', '2026-01-30 08:00:00'),
			(4, 1, 'Issued', 0.5, 3, 'HCl for acid extraction', 'Ahmad R.', '2026-01-30 08:30:00'),
			(5, 1, 'Issued', 0.8, 3, 'NaOH for base extraction', 'Ahmad R.', '2026-01-30 10:00:00'),
			(6, 1, 'Issued', 2.5, 3, 'Limonene for partitioning', 'Ahmad R.', '2026-01-30 08:15:00'),
			(6, 1, 'Recovered', 2.2, 3, 'Limonene recovered', 'Ahmad R.', '2026-02-05 14:00:00');
	`);
}
