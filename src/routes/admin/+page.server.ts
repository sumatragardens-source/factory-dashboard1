import { getDb } from '$lib/data/db';
import { initDb } from '$lib/data/init';
import type { Actions, PageServerLoad } from './$types';

const TABLE_COLUMNS: Record<string, string[]> = {
	lots: [
		'lot_id',
		'supplier',
		'delivery_date',
		'quantity_kg',
		'batches_from_lot',
		'cost_usd',
		'cost_per_kg_usd',
		'testing_cost_usd',
		'notes'
	],
	batches: [
		'batch_number',
		'status',
		'current_stage',
		'production_run_id',
		'lot_id',
		'supplier',
		'supplier_lot',
		'lot_position',
		'leaf_input_kg',
		'operator_name',
		'notes',
		'started_at',
		'completed_at'
	],
	reactor_loads: [
		'batch_id',
		'reactor_id',
		'load_number',
		'powder_kg',
		'etoh_vol_L',
		'agitation_rpm',
		'stir_time_min',
		'settle_time_hr'
	],
	stage1_records: [
		'batch_id',
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
	],
	stage2_records: [
		'batch_id',
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
		'water_spent_cake_kg'
	],
	stage3_filtration: [
		'batch_id',
		'filter_press_cycles',
		'centrifuge_batches',
		'screw_press_used',
		'de_used',
		'wash_volume_L',
		'cake_weight_kg',
		'filtrate_volume_L',
		'filtrate_clarity'
	],
	stage4_distillation: [
		'batch_id',
		'distillation_temp_C',
		'vacuum_mbar',
		'bath_temp_C',
		'distill_time_min',
		'recovered_etoh_L',
		'recovered_abv_pct',
		'recovery_pct',
		'crude_aqueous_vol_L',
		'crude_aqueous_wt_kg'
	],
	stage5_acid_base: [
		'batch_id',
		'initial_ph',
		'naoh_added_g',
		'basified_ph',
		'dlimo_vol_L',
		'partition_cycles',
		'settling_min',
		'organic_phase_mL',
		'aqueous_waste_L',
		'emulsion_events'
	],
	stage6_backext_precip: [
		'batch_id',
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
		'wash_cycles'
	],
	stage7_drying_final: [
		'batch_id',
		'dry_method',
		'dry_temp_C',
		'dry_time_h',
		'final_product_g',
		'final_moisture_pct',
		'overall_yield_pct',
		'batch_duration_hr'
	],
	batch_costs: ['batch_id', 'cost_category', 'item_name', 'quantity', 'unit_rate', 'total_cost', 'notes'],
	lab_results: [
		'batch_id',
		'test_type',
		'test_date',
		'lab_reference',
		'status',
		'mitragynine_pct',
		'hydroxy_mitragynine_pct',
		'paynantheine_pct',
		'speciogynine_pct',
		'speciociliatine_pct',
		'non_alkaloids_pct'
	],
	price_references: ['material', 'unit', 'price_per_unit', 'effective_date', 'source', 'notes']
};

export const load: PageServerLoad = () => {
	initDb();
	return {
		tables: Object.keys(TABLE_COLUMNS),
		tableColumns: TABLE_COLUMNS
	};
};

export const actions: Actions = {
	import: async ({ request }) => {
		initDb();
		const formData = await request.formData();
		const table = formData.get('table') as string;
		const csvText = formData.get('csvText') as string;
		const clearFirst = formData.get('clearFirst') === 'on';

		if (!table || !csvText) {
			return { success: 0, errors: ['Missing table or CSV data'] };
		}

		const expectedCols = TABLE_COLUMNS[table];
		if (!expectedCols) {
			return { success: 0, errors: [`Unknown table: ${table}`] };
		}

		const { parseCSV, validateColumns } = await import('$lib/utils/csvParser');
		const { headers, rows } = parseCSV(csvText);

		if (headers.length === 0) {
			return { success: 0, errors: ['CSV has no headers'] };
		}

		const { valid, missing } = validateColumns(headers, expectedCols);
		if (!valid) {
			return { success: 0, errors: [`Missing columns: ${missing.join(', ')}`] };
		}

		const db = getDb();
		const errors: string[] = [];
		let success = 0;

		try {
			db.pragma('foreign_keys = OFF');

			if (clearFirst) {
				db.exec(`DELETE FROM "${table}"`);
			}

			const colNames = headers.map((h) => `"${h}"`).join(', ');
			const placeholders = headers.map(() => '?').join(', ');
			const stmt = db.prepare(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders})`);

			const txn = db.transaction(() => {
				for (let i = 0; i < rows.length; i++) {
					try {
						const values = rows[i].map((v, j) => {
							if (v === '' || v === 'NULL' || v === 'null') return null;
							const num = Number(v);
							if (!isNaN(num) && v !== '') return num;
							return v;
						});
						stmt.run(...values);
						success++;
					} catch (e: unknown) {
						const msg = e instanceof Error ? e.message : String(e);
						errors.push(`Row ${i + 1}: ${msg}`);
					}
				}
			});
			txn();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			errors.push(`Import failed: ${msg}`);
		} finally {
			db.pragma('foreign_keys = ON');
		}

		return { success, errors, table };
	},

	clear: async ({ request }) => {
		initDb();
		const formData = await request.formData();
		const table = formData.get('table') as string;

		if (!table || !TABLE_COLUMNS[table]) {
			return { success: 0, errors: ['Unknown table'], cleared: false };
		}

		const db = getDb();
		try {
			db.pragma('foreign_keys = OFF');
			db.exec(`DELETE FROM "${table}"`);
			db.pragma('foreign_keys = ON');
			return { success: 0, errors: [], cleared: true, table };
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: 0, errors: [msg], cleared: false };
		}
	}
};
