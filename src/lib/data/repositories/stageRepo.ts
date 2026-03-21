import { getDb } from '../db';
import type {
	Stage1Record,
	Stage2Record,
	Stage3Record,
	Stage4Record,
	Stage3Filtration,
	Stage4Distillation,
	Stage5AcidBase,
	Stage6BackextPrecip,
	Stage7DryingFinal,
	ReactorLoad
} from '$lib/domain/types';

// ── Stage 1: Raw Leaf & Grinding ──────────────────────────────────────────

const STAGE1_COLS = [
	'gross_leaf_kg',
	'container_kg',
	'net_leaf_kg',
	'moisture_pct',
	'dry_mass_kg',
	'grinder_id',
	'screen_microns',
	'grind_start',
	'grind_end',
	'runtime_min',
	'powder_output_kg',
	'dust_loss_kg',
	'retained_kg',
	'mass_balance_err_pct',
	'throughput_kg_hr',
	'operator_name',
	'notes'
] as const;

export function getStage1Record(batchId: number): Stage1Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage1_records WHERE batch_id = ?').get(batchId) as Stage1Record | undefined;
}

export function upsertStage1Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE1_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE1_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage1_records (batch_id, ${STAGE1_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE1_COLS.map((c) => data[c] ?? null));
}

// ── Stage 2: Ethanol Extraction ───────────────────────────────────────────

const STAGE2_COLS = [
	'etoh_vol_L',
	'etoh_purity_pct',
	'extract_temp_C',
	'extract_time_min',
	'extract_cycles',
	'agitation_rpm',
	'stir_time_min',
	'settle_time_min',
	'filtrate_vol_L',
	'spent_cake_kg',
	'etoh_recovered_L',
	'etoh_recovery_pct',
	'etoh_lost_L',
	'distill_time_min',
	'rotovap_vacuum_mbar',
	'rotovap_bath_C',
	'crude_aqueous_vol_L',
	'crude_extract_wt_kg',
	'water_vol_L',
	'water_temp_C',
	'water_time_min',
	'water_cycles',
	'water_filtrate_L',
	'water_spent_cake_kg',
	'operator_name',
	'notes'
] as const;

export function getStage2Record(batchId: number): Stage2Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage2_records WHERE batch_id = ?').get(batchId) as Stage2Record | undefined;
}

export function upsertStage2Record(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE2_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE2_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage2_records (batch_id, ${STAGE2_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE2_COLS.map((c) => data[c] ?? null));
}

// ── Reactor Loads (within Stage 2) ────────────────────────────────────────

export function getReactorLoads(batchId: number): ReactorLoad[] {
	const db = getDb();
	return db
		.prepare('SELECT * FROM reactor_loads WHERE batch_id = ? ORDER BY load_number')
		.all(batchId) as ReactorLoad[];
}

// ── Stage 3: Filtration & Washing ─────────────────────────────────────────

const STAGE3_FILT_COLS = [
	'filter_press_cycles',
	'centrifuge_batches',
	'screw_press_used',
	'de_used',
	'wash_volume_L',
	'cake_weight_kg',
	'filtrate_volume_L',
	'filtrate_clarity',
	'operator_name',
	'notes'
] as const;

export function getStage3Filtration(batchId: number): Stage3Filtration | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage3_filtration WHERE batch_id = ?').get(batchId) as Stage3Filtration | undefined;
}

export function upsertStage3Filtration(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE3_FILT_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE3_FILT_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage3_filtration (batch_id, ${STAGE3_FILT_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE3_FILT_COLS.map((c) => data[c] ?? null));
}

// ── Stage 4: Ethanol Distillation/Recovery ────────────────────────────────

const STAGE4_DIST_COLS = [
	'distillation_temp_C',
	'vacuum_mbar',
	'bath_temp_C',
	'distill_time_min',
	'recovered_etoh_L',
	'recovered_abv_pct',
	'recovery_pct',
	'crude_aqueous_vol_L',
	'crude_aqueous_wt_kg',
	'residual_alcohol_pct',
	'operator_name',
	'notes'
] as const;

export function getStage4Distillation(batchId: number): Stage4Distillation | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage4_distillation WHERE batch_id = ?').get(batchId) as
		| Stage4Distillation
		| undefined;
}

export function upsertStage4Distillation(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE4_DIST_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE4_DIST_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage4_distillation (batch_id, ${STAGE4_DIST_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE4_DIST_COLS.map((c) => data[c] ?? null));
}

// ── Stage 5: Acid/Base Extraction ─────────────────────────────────────────

const STAGE5_COLS = [
	'initial_ph',
	'naoh_added_g',
	'basified_ph',
	'dlimo_vol_L',
	'partition_cycles',
	'settling_min',
	'organic_phase_mL',
	'aqueous_waste_L',
	'emulsion_events',
	'operator_name',
	'notes'
] as const;

export function getStage5AcidBase(batchId: number): Stage5AcidBase | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage5_acid_base WHERE batch_id = ?').get(batchId) as Stage5AcidBase | undefined;
}

export function upsertStage5AcidBase(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE5_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE5_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage5_acid_base (batch_id, ${STAGE5_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE5_COLS.map((c) => data[c] ?? null));
}

// ── Stage 6: Back-Extraction & Precipitation ──────────────────────────────

const STAGE6_COLS = [
	'acetic_conc',
	'acetic_water_vol_L',
	'acetic_pure_vol_L',
	'backext_cycles',
	'backext_settle_min',
	'dlimo_recovered_L',
	'dlimo_lost_L',
	'dlimo_loss_pct',
	'acidic_aq_vol_L',
	'acidic_ph',
	'k2co3_added_g',
	'precip_ph',
	'precip_temp_C',
	'wet_precipitate_g',
	'wash_vol_mL',
	'wash_cycles',
	'centrifuge_rpm',
	'supernatant_vol_L',
	'operator_name',
	'notes'
] as const;

export function getStage6BackextPrecip(batchId: number): Stage6BackextPrecip | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage6_backext_precip WHERE batch_id = ?').get(batchId) as
		| Stage6BackextPrecip
		| undefined;
}

export function upsertStage6BackextPrecip(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE6_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE6_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage6_backext_precip (batch_id, ${STAGE6_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE6_COLS.map((c) => data[c] ?? null));
}

// ── Stage 7: Drying & Final Product ───────────────────────────────────────

const STAGE7_COLS = [
	'dry_method',
	'dry_temp_C',
	'dry_time_h',
	'final_product_g',
	'final_moisture_pct',
	'overall_yield_pct',
	'batch_duration_hr',
	'storage_location',
	'operator_name',
	'notes'
] as const;

export function getStage7DryingFinal(batchId: number): Stage7DryingFinal | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage7_drying_final WHERE batch_id = ?').get(batchId) as
		| Stage7DryingFinal
		| undefined;
}

export function upsertStage7DryingFinal(batchId: number, data: Record<string, unknown>): void {
	const db = getDb();
	const setClauses = STAGE7_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
	const placeholders = ['?', ...STAGE7_COLS.map(() => '?')].join(', ');
	db.prepare(
		`
		INSERT INTO stage7_drying_final (batch_id, ${STAGE7_COLS.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT(batch_id) DO UPDATE SET ${setClauses}
	`
	).run(batchId, ...STAGE7_COLS.map((c) => data[c] ?? null));
}

// ── Backward-compat: stage3_records VIEW (old Stage 3 = Stage5+Stage6) ────

export function getStage3Record(batchId: number): Stage3Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage3_records WHERE batch_id = ?').get(batchId) as Stage3Record | undefined;
}

/** @deprecated Backward-compat wrapper: splits data into stage5_acid_base + stage6_backext_precip */
export function upsertStage3Record(batchId: number, data: Record<string, unknown>): void {
	const s5Data: Record<string, unknown> = {};
	for (const c of STAGE5_COLS) s5Data[c] = data[c] ?? null;
	upsertStage5AcidBase(batchId, s5Data);

	const s6Data: Record<string, unknown> = {};
	for (const c of STAGE6_COLS) s6Data[c] = data[c] ?? null;
	upsertStage6BackextPrecip(batchId, s6Data);
}

// ── Backward-compat: stage4_records VIEW (old Stage 4 = Stage6+Stage7) ────

export function getStage4Record(batchId: number): Stage4Record | undefined {
	const db = getDb();
	return db.prepare('SELECT * FROM stage4_records WHERE batch_id = ?').get(batchId) as Stage4Record | undefined;
}

/** @deprecated Backward-compat wrapper: splits data into stage6_backext_precip + stage7_drying_final */
export function upsertStage4Record(batchId: number, data: Record<string, unknown>): void {
	const s6Data: Record<string, unknown> = {};
	for (const c of STAGE6_COLS) s6Data[c] = data[c] ?? null;
	upsertStage6BackextPrecip(batchId, s6Data);

	const s7Data: Record<string, unknown> = {};
	for (const c of STAGE7_COLS) s7Data[c] = data[c] ?? null;
	upsertStage7DryingFinal(batchId, s7Data);
}
