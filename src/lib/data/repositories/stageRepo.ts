import { getDb } from '../db';
import type { Stage1Record, Stage2Record, Stage3Record, Stage4Record } from '$lib/domain/types';

// ── Stage 1 ─────────────────────────────────────────────────────────────────

const STAGE1_COLS = [
	'gross_leaf_kg', 'container_kg', 'net_leaf_kg', 'moisture_pct', 'dry_mass_kg',
	'grinder_id', 'screen_microns', 'grind_start', 'grind_end', 'runtime_min',
	'powder_output_kg', 'dust_loss_kg', 'retained_kg', 'mass_balance_err_pct',
	'throughput_kg_hr', 'operator_name', 'notes'
] as const;

export function getStage1Record(batchId: number): Stage1Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) as
		| Stage1Record
		| undefined;
}

export function upsertStage1Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE1_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE1_COLS.map(() => '?')].join(', ');
	db.prepare(`
		INSERT INTO stage1_records (batch_id, ${STAGE1_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`).run(batchId, ...STAGE1_COLS.map((c) => data[c] ?? null));
}

// ── Stage 2 ─────────────────────────────────────────────────────────────────

const STAGE2_COLS = [
	'etoh_vol_L', 'etoh_purity_pct', 'extract_temp_C', 'extract_time_min',
	'extract_cycles', 'agitation_rpm', 'stir_time_min', 'settle_time_min',
	'filtrate_vol_L', 'spent_cake_kg', 'etoh_recovered_L', 'etoh_recovery_pct',
	'etoh_lost_L', 'distill_time_min', 'rotovap_vacuum_mbar', 'rotovap_bath_C',
	'crude_aqueous_vol_L', 'crude_extract_wt_kg', 'water_vol_L', 'water_temp_C',
	'water_time_min', 'water_cycles', 'water_filtrate_L', 'water_spent_cake_kg',
	'operator_name', 'notes'
] as const;

export function getStage2Record(batchId: number): Stage2Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) as
		| Stage2Record
		| undefined;
}

export function upsertStage2Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE2_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE2_COLS.map(() => '?')].join(', ');
	db.prepare(`
		INSERT INTO stage2_records (batch_id, ${STAGE2_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`).run(batchId, ...STAGE2_COLS.map((c) => data[c] ?? null));
}

// ── Stage 3 ─────────────────────────────────────────────────────────────────

const STAGE3_COLS = [
	'initial_ph', 'naoh_added_g', 'basified_ph', 'dlimo_vol_L', 'partition_cycles',
	'settling_min', 'organic_phase_mL', 'aqueous_waste_L', 'acetic_conc',
	'acetic_water_vol_L', 'acetic_pure_vol_L', 'backext_cycles', 'backext_settle_min',
	'dlimo_recovered_L', 'dlimo_lost_L', 'dlimo_loss_pct', 'acidic_aq_vol_L',
	'acidic_ph', 'operator_name', 'notes'
] as const;

export function getStage3Record(batchId: number): Stage3Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) as
		| Stage3Record
		| undefined;
}

export function upsertStage3Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE3_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE3_COLS.map(() => '?')].join(', ');
	db.prepare(`
		INSERT INTO stage3_records (batch_id, ${STAGE3_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`).run(batchId, ...STAGE3_COLS.map((c) => data[c] ?? null));
}

// ── Stage 4 ─────────────────────────────────────────────────────────────────

const STAGE4_COLS = [
	'k2co3_added_g', 'precip_ph', 'precip_temp_C', 'wet_precipitate_g', 'wash_vol_mL',
	'wash_cycles', 'dry_method', 'dry_temp_C', 'dry_time_hr', 'final_product_g',
	'final_moisture_pct', 'overall_yield_pct', 'batch_duration_hr', 'operator_name', 'notes'
] as const;

export function getStage4Record(batchId: number): Stage4Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) as
		| Stage4Record
		| undefined;
}

export function upsertStage4Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE4_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE4_COLS.map(() => '?')].join(', ');
	db.prepare(`
		INSERT INTO stage4_records (batch_id, ${STAGE4_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`).run(batchId, ...STAGE4_COLS.map((c) => data[c] ?? null));
}
