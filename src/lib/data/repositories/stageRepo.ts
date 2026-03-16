import { getDb } from '../db';
import type { Stage1Record, Stage2Record, Stage3Record, Stage4Record, Stage2Reactor, Stage2RotovapDay } from '$lib/domain/types';

export function getStage1Record(batchId: number): Stage1Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) as
		| Stage1Record
		| undefined;
}

export function getStage2Record(batchId: number): Stage2Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) as
		| Stage2Record
		| undefined;
}

export function getStage2Reactors(batchId: number): Stage2Reactor[] {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_reactors WHERE batch_id = ? ORDER BY reactor_number').all(batchId) as Stage2Reactor[];
}

export function getStage2RotovapDays(batchId: number): Stage2RotovapDay[] {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_rotovap_days WHERE batch_id = ? ORDER BY rotovap_number, day_number').all(batchId) as Stage2RotovapDay[];
}

export function getStage3Record(batchId: number): Stage3Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) as
		| Stage3Record
		| undefined;
}

export function getStage4Record(batchId: number): Stage4Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) as
		| Stage4Record
		| undefined;
}

export function upsertStage1Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const existing = getStage1Record(batchId);
	if (existing) {
		db.prepare(`
			UPDATE stage1_records SET
				receipt_date = ?, processing_date = ?, gross_weight_kg = ?, tare_weight_kg = ?,
				net_weight_kg = ?, moisture_content_pct = ?, grinder_id = ?, screen_mesh_mm = ?,
				feed_rate_setting = ?, machine_temp_c = ?, rpm = ?, run_duration_min = ?,
				powder_weight_kg = ?, dust_loss_kg = ?, powder_yield_pct = ?, mass_balance_error_pct = ?,
				operator_name = ?, notes = ?, updated_at = datetime('now')
			WHERE batch_id = ?
		`).run(
			data.receipt_date ?? null, data.processing_date ?? null, data.gross_weight_kg ?? null,
			data.tare_weight_kg ?? null, data.net_weight_kg ?? null, data.moisture_content_pct ?? null,
			data.grinder_id ?? null, data.screen_mesh_mm ?? null, data.feed_rate_setting ?? null,
			data.machine_temp_c ?? null, data.rpm ?? null, data.run_duration_min ?? null,
			data.powder_weight_kg ?? null, data.dust_loss_kg ?? null, data.powder_yield_pct ?? null,
			data.mass_balance_error_pct ?? null, data.operator_name ?? null, data.notes ?? null, batchId
		);
	} else {
		db.prepare(`
			INSERT INTO stage1_records (batch_id, receipt_date, processing_date, gross_weight_kg, tare_weight_kg,
				net_weight_kg, moisture_content_pct, grinder_id, screen_mesh_mm, feed_rate_setting, machine_temp_c,
				rpm, run_duration_min, powder_weight_kg, dust_loss_kg, powder_yield_pct, mass_balance_error_pct,
				operator_name, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			batchId, data.receipt_date ?? null, data.processing_date ?? null, data.gross_weight_kg ?? null,
			data.tare_weight_kg ?? null, data.net_weight_kg ?? null, data.moisture_content_pct ?? null,
			data.grinder_id ?? null, data.screen_mesh_mm ?? null, data.feed_rate_setting ?? null,
			data.machine_temp_c ?? null, data.rpm ?? null, data.run_duration_min ?? null,
			data.powder_weight_kg ?? null, data.dust_loss_kg ?? null, data.powder_yield_pct ?? null,
			data.mass_balance_error_pct ?? null, data.operator_name ?? null, data.notes ?? null
		);
	}
}

export function upsertStage2Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const existing = getStage2Record(batchId);
	if (existing) {
		db.prepare(`
			UPDATE stage2_records SET
				ethanol_stock_grade_pct = ?, target_ethanol_pct = ?, ethanol_stock_used_l = ?,
				water_added_l = ?, ethanol_70_volume_l = ?, settle_time_min = ?,
				bag_filter_input_l = ?, bag_filter_output_l = ?,
				centrifuge_input_l = ?, centrifuge_output_l = ?,
				screw_press_input_l = ?, screw_press_output_l = ?,
				total_ethanol_70_to_rotovap_l = ?, total_ethanol_distilled_l = ?,
				water_mother_liquid_l = ?, total_ethanol_recovered_l = ?, total_ethanol_loss_l = ?,
				recovery_rate_pct = ?, extract_weight_kg = ?, operator_name = ?, notes = ?,
				updated_at = datetime('now')
			WHERE batch_id = ?
		`).run(
			data.ethanol_stock_grade_pct ?? null, data.target_ethanol_pct ?? 70,
			data.ethanol_stock_used_l ?? null, data.water_added_l ?? null,
			data.ethanol_70_volume_l ?? null, data.settle_time_min ?? null,
			data.bag_filter_input_l ?? null, data.bag_filter_output_l ?? null,
			data.centrifuge_input_l ?? null, data.centrifuge_output_l ?? null,
			data.screw_press_input_l ?? null, data.screw_press_output_l ?? null,
			data.total_ethanol_70_to_rotovap_l ?? null, data.total_ethanol_distilled_l ?? null,
			data.water_mother_liquid_l ?? null, data.total_ethanol_recovered_l ?? null,
			data.total_ethanol_loss_l ?? null, data.recovery_rate_pct ?? null,
			data.extract_weight_kg ?? null, data.operator_name ?? null, data.notes ?? null, batchId
		);
	} else {
		db.prepare(`
			INSERT INTO stage2_records (batch_id, ethanol_stock_grade_pct, target_ethanol_pct, ethanol_stock_used_l,
				water_added_l, ethanol_70_volume_l, settle_time_min, bag_filter_input_l, bag_filter_output_l,
				centrifuge_input_l, centrifuge_output_l, screw_press_input_l, screw_press_output_l,
				total_ethanol_70_to_rotovap_l, total_ethanol_distilled_l, water_mother_liquid_l,
				total_ethanol_recovered_l, total_ethanol_loss_l, recovery_rate_pct, extract_weight_kg,
				operator_name, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			batchId, data.ethanol_stock_grade_pct ?? null, data.target_ethanol_pct ?? 70,
			data.ethanol_stock_used_l ?? null, data.water_added_l ?? null,
			data.ethanol_70_volume_l ?? null, data.settle_time_min ?? null,
			data.bag_filter_input_l ?? null, data.bag_filter_output_l ?? null,
			data.centrifuge_input_l ?? null, data.centrifuge_output_l ?? null,
			data.screw_press_input_l ?? null, data.screw_press_output_l ?? null,
			data.total_ethanol_70_to_rotovap_l ?? null, data.total_ethanol_distilled_l ?? null,
			data.water_mother_liquid_l ?? null, data.total_ethanol_recovered_l ?? null,
			data.total_ethanol_loss_l ?? null, data.recovery_rate_pct ?? null,
			data.extract_weight_kg ?? null, data.operator_name ?? null, data.notes ?? null
		);
	}
}

export function upsertStage2Reactors(batchId: number, reactors: Record<string, unknown>[]): void {
	const db = getDb();
	db.prepare('DELETE FROM stage2_reactors WHERE batch_id = ?').run(batchId);
	const insert = db.prepare(`
		INSERT INTO stage2_reactors (batch_id, reactor_number, machine_id, temperature_c, rpm, soak_time_min,
			powder_mass_kg, ethanol_70_volume_l, solvent_ratio)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);
	for (const r of reactors) {
		insert.run(batchId, r.reactor_number, r.machine_id ?? null, r.temperature_c ?? null,
			r.rpm ?? null, r.soak_time_min ?? null, r.powder_mass_kg ?? null,
			r.ethanol_70_volume_l ?? null, r.solvent_ratio ?? null);
	}
}

export function upsertStage2RotovapDays(batchId: number, days: Record<string, unknown>[]): void {
	const db = getDb();
	db.prepare('DELETE FROM stage2_rotovap_days WHERE batch_id = ?').run(batchId);
	const insert = db.prepare(`
		INSERT INTO stage2_rotovap_days (batch_id, rotovap_number, machine_id, day_number,
			water_bath_temp_c, vacuum_mbar, chiller_temp_c, rpm, run_time_hours,
			ethanol_recovered_l, recovery_per_hour_l)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);
	for (const d of days) {
		insert.run(batchId, d.rotovap_number, d.machine_id ?? null, d.day_number,
			d.water_bath_temp_c ?? null, d.vacuum_mbar ?? null, d.chiller_temp_c ?? null,
			d.rpm ?? null, d.run_time_hours ?? null, d.ethanol_recovered_l ?? null,
			d.recovery_per_hour_l ?? null);
	}
}

export function upsertStage3Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const existing = getStage3Record(batchId);
	if (existing) {
		db.prepare(`
			UPDATE stage3_records SET
				feed_weight_kg = ?, acid_type = ?, acid_volume_l = ?, acid_concentration_pct = ?,
				water_volume_l = ?, target_ph_acid = ?, actual_ph_acid = ?, limonene_volume_l = ?,
				partition_vessel_id = ?, num_washes = ?, aqueous_phase_volume_l = ?, organic_phase_volume_l = ?,
				base_type = ?, base_weight_kg = ?, target_ph_base = ?, actual_ph_base = ?,
				limonene_recovered_l = ?, limonene_loss_l = ?, partition_loss_kg = ?,
				alkaloid_precipitate_kg = ?, operator_name = ?, notes = ?, updated_at = datetime('now')
			WHERE batch_id = ?
		`).run(
			data.feed_weight_kg ?? null, data.acid_type ?? null, data.acid_volume_l ?? null,
			data.acid_concentration_pct ?? null, data.water_volume_l ?? null,
			data.target_ph_acid ?? null, data.actual_ph_acid ?? null, data.limonene_volume_l ?? null,
			data.partition_vessel_id ?? null, data.num_washes ?? null,
			data.aqueous_phase_volume_l ?? null, data.organic_phase_volume_l ?? null,
			data.base_type ?? null, data.base_weight_kg ?? null, data.target_ph_base ?? null,
			data.actual_ph_base ?? null, data.limonene_recovered_l ?? null, data.limonene_loss_l ?? null,
			data.partition_loss_kg ?? null, data.alkaloid_precipitate_kg ?? null,
			data.operator_name ?? null, data.notes ?? null, batchId
		);
	} else {
		db.prepare(`
			INSERT INTO stage3_records (batch_id, feed_weight_kg, acid_type, acid_volume_l, acid_concentration_pct,
				water_volume_l, target_ph_acid, actual_ph_acid, limonene_volume_l, partition_vessel_id, num_washes,
				aqueous_phase_volume_l, organic_phase_volume_l, base_type, base_weight_kg, target_ph_base,
				actual_ph_base, limonene_recovered_l, limonene_loss_l, partition_loss_kg,
				alkaloid_precipitate_kg, operator_name, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			batchId, data.feed_weight_kg ?? null, data.acid_type ?? null, data.acid_volume_l ?? null,
			data.acid_concentration_pct ?? null, data.water_volume_l ?? null,
			data.target_ph_acid ?? null, data.actual_ph_acid ?? null, data.limonene_volume_l ?? null,
			data.partition_vessel_id ?? null, data.num_washes ?? null,
			data.aqueous_phase_volume_l ?? null, data.organic_phase_volume_l ?? null,
			data.base_type ?? null, data.base_weight_kg ?? null, data.target_ph_base ?? null,
			data.actual_ph_base ?? null, data.limonene_recovered_l ?? null, data.limonene_loss_l ?? null,
			data.partition_loss_kg ?? null, data.alkaloid_precipitate_kg ?? null,
			data.operator_name ?? null, data.notes ?? null
		);
	}
}

export function upsertStage4Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const existing = getStage4Record(batchId);
	if (existing) {
		db.prepare(`
			UPDATE stage4_records SET
				feed_weight_kg = ?, back_extraction_solvent = ?, back_extraction_volume_l = ?,
				back_extraction_temp_c = ?, back_extraction_time_min = ?,
				limonene_retained_product_kg = ?, limonene_process_loss_kg = ?,
				precipitation_method = ?, precipitation_ph = ?, precipitate_weight_kg = ?,
				drying_cabinet_id = ?, drying_temp_c = ?, drying_time_hours = ?,
				drying_humidity_pct = ?, final_product_weight_kg = ?, product_appearance = ?,
				cumulative_yield_pct = ?, stage_yield_pct = ?, mass_balance_error_pct = ?,
				operator_name = ?, notes = ?, updated_at = datetime('now')
			WHERE batch_id = ?
		`).run(
			data.feed_weight_kg ?? null, data.back_extraction_solvent ?? null,
			data.back_extraction_volume_l ?? null, data.back_extraction_temp_c ?? null,
			data.back_extraction_time_min ?? null, data.limonene_retained_product_kg ?? null,
			data.limonene_process_loss_kg ?? null, data.precipitation_method ?? null,
			data.precipitation_ph ?? null, data.precipitate_weight_kg ?? null,
			data.drying_cabinet_id ?? null, data.drying_temp_c ?? null, data.drying_time_hours ?? null,
			data.drying_humidity_pct ?? null, data.final_product_weight_kg ?? null,
			data.product_appearance ?? null, data.cumulative_yield_pct ?? null,
			data.stage_yield_pct ?? null, data.mass_balance_error_pct ?? null,
			data.operator_name ?? null, data.notes ?? null, batchId
		);
	} else {
		db.prepare(`
			INSERT INTO stage4_records (batch_id, feed_weight_kg, back_extraction_solvent, back_extraction_volume_l,
				back_extraction_temp_c, back_extraction_time_min, limonene_retained_product_kg,
				limonene_process_loss_kg, precipitation_method, precipitation_ph, precipitate_weight_kg,
				drying_cabinet_id, drying_temp_c, drying_time_hours, drying_humidity_pct,
				final_product_weight_kg, product_appearance, cumulative_yield_pct, stage_yield_pct,
				mass_balance_error_pct, operator_name, notes)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			batchId, data.feed_weight_kg ?? null, data.back_extraction_solvent ?? null,
			data.back_extraction_volume_l ?? null, data.back_extraction_temp_c ?? null,
			data.back_extraction_time_min ?? null, data.limonene_retained_product_kg ?? null,
			data.limonene_process_loss_kg ?? null, data.precipitation_method ?? null,
			data.precipitation_ph ?? null, data.precipitate_weight_kg ?? null,
			data.drying_cabinet_id ?? null, data.drying_temp_c ?? null, data.drying_time_hours ?? null,
			data.drying_humidity_pct ?? null, data.final_product_weight_kg ?? null,
			data.product_appearance ?? null, data.cumulative_yield_pct ?? null,
			data.stage_yield_pct ?? null, data.mass_balance_error_pct ?? null,
			data.operator_name ?? null, data.notes ?? null
		);
	}
}
