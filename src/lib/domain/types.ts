import type { BatchState } from '$lib/constants/batchStates';

export interface Lot {
	id: number;
	lot_id: string;
	supplier: string;
	delivery_date: string;
	quantity_kg: number;
	batches_from_lot: number | null;
	cost_usd: number | null;
	cost_per_kg_usd: number | null;
	testing_cost_usd: number | null;
	notes: string | null;
	created_at: string;
}

export interface Batch {
	id: number;
	batch_number: string;
	status: BatchState;
	current_stage: number;
	production_run_id: number | null;
	lot_id: number | null;
	supplier: string | null;
	supplier_lot: string | null;
	lot_position: string | null;
	leaf_input_kg: number;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	started_at: string | null;
	completed_at: string | null;
}

export interface ReactorLoad {
	id: number;
	batch_id: number;
	reactor_id: string | null;
	load_number: number | null;
	powder_kg: number | null;
	etoh_vol_L: number | null;
	agitation_rpm: number | null;
	stir_time_min: number | null;
	settle_time_hr: number | null;
	filtrate_vol_L: number | null;
	spent_cake_kg: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
}

export interface BatchStage {
	id: number;
	batch_id: number;
	stage_number: number;
	status: 'Pending' | 'In Progress' | 'Finalized';
	started_at: string | null;
	finalized_at: string | null;
	finalized_by: string | null;
	notes: string | null;
}

// Step 1: Raw Leaf to Powder
export interface Stage1Record {
	id: number;
	batch_id: number;
	gross_leaf_kg: number | null;
	container_kg: number | null;
	net_leaf_kg: number | null;
	moisture_pct: number | null;
	dry_mass_kg: number | null;
	grinder_id: string | null;
	screen_microns: number | null;
	grind_start: string | null;
	grind_end: string | null;
	runtime_min: number | null;
	powder_output_kg: number | null;
	dust_loss_kg: number | null;
	retained_kg: number | null;
	mass_balance_err_pct: number | null;
	throughput_kg_hr: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Steps 2+3: Ethanol Extraction + Water Extraction
export interface Stage2Record {
	id: number;
	batch_id: number;
	// Step 2: Ethanol extraction
	etoh_vol_L: number | null;
	etoh_purity_pct: number | null;
	extract_temp_C: number | null;
	extract_time_min: number | null;
	extract_cycles: number | null;
	agitation_rpm: number | null;
	stir_time_min: number | null;
	settle_time_min: number | null;
	filtrate_vol_L: number | null;
	spent_cake_kg: number | null;
	etoh_recovered_L: number | null;
	etoh_recovery_pct: number | null;
	etoh_lost_L: number | null;
	distill_time_min: number | null;
	rotovap_vacuum_mbar: number | null;
	rotovap_bath_C: number | null;
	crude_aqueous_vol_L: number | null;
	crude_extract_wt_kg: number | null;
	// Step 3: Water extraction
	water_vol_L: number | null;
	water_temp_C: number | null;
	water_time_min: number | null;
	water_cycles: number | null;
	water_filtrate_L: number | null;
	water_spent_cake_kg: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Stage 3: Filtration & Washing
export interface Stage3Filtration {
	id: number;
	batch_id: number;
	filter_press_cycles: number | null;
	centrifuge_batches: number | null;
	screw_press_used: number | null;
	de_used: number | null;
	wash_volume_L: number | null;
	cake_weight_kg: number | null;
	filtrate_volume_L: number | null;
	filtrate_clarity: string | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Stage 4: Ethanol Distillation/Recovery
export interface Stage4Distillation {
	id: number;
	batch_id: number;
	distillation_temp_C: number | null;
	vacuum_mbar: number | null;
	bath_temp_C: number | null;
	distill_time_min: number | null;
	recovered_etoh_L: number | null;
	recovered_abv_pct: number | null;
	recovery_pct: number | null;
	crude_aqueous_vol_L: number | null;
	crude_aqueous_wt_kg: number | null;
	residual_alcohol_pct: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Stage 5: Acid/Base Extraction and Partitioning
export interface Stage5AcidBase {
	id: number;
	batch_id: number;
	initial_ph: number | null;
	naoh_added_g: number | null;
	basified_ph: number | null;
	dlimo_vol_L: number | null;
	partition_cycles: number | null;
	settling_min: number | null;
	organic_phase_mL: number | null;
	aqueous_waste_L: number | null;
	emulsion_events: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Stage 6: Back-Extraction & Precipitation
export interface Stage6BackextPrecip {
	id: number;
	batch_id: number;
	acetic_conc: string | null;
	acetic_water_vol_L: number | null;
	acetic_pure_vol_L: number | null;
	backext_cycles: number | null;
	backext_settle_min: number | null;
	dlimo_recovered_L: number | null;
	dlimo_lost_L: number | null;
	dlimo_loss_pct: number | null;
	acidic_aq_vol_L: number | null;
	acidic_ph: number | null;
	k2co3_added_g: number | null;
	precip_ph: number | null;
	precip_temp_C: number | null;
	wet_precipitate_g: number | null;
	wash_vol_mL: number | null;
	wash_cycles: number | null;
	centrifuge_rpm: number | null;
	supernatant_vol_L: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Stage 7: Drying & Final Product
export interface Stage7DryingFinal {
	id: number;
	batch_id: number;
	dry_method: string | null;
	dry_temp_C: number | null;
	dry_time_h: number | null;
	final_product_g: number | null;
	final_moisture_pct: number | null;
	overall_yield_pct: number | null;
	batch_duration_hr: number | null;
	storage_location: string | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Price reference for materials
export interface PriceReference {
	id: number;
	material: string;
	unit: string;
	price_per_unit: number;
	effective_date: string;
	source: string | null;
	notes: string | null;
	created_at: string;
}

// Backward-compat: Stage3Record matches the VIEW output (stage5 + stage6 joined)
// Steps 4+5: Basification + D-Limonene + Acetic Acid Back-Extraction
export interface Stage3Record {
	id: number;
	batch_id: number;
	// Step 4: Basification + D-Limonene partition
	initial_ph: number | null;
	naoh_added_g: number | null;
	basified_ph: number | null;
	dlimo_vol_L: number | null;
	partition_cycles: number | null;
	settling_min: number | null;
	organic_phase_mL: number | null;
	aqueous_waste_L: number | null;
	// Step 5: Acetic acid back-extraction
	acetic_conc: string | null;
	acetic_water_vol_L: number | null;
	acetic_pure_vol_L: number | null;
	backext_cycles: number | null;
	backext_settle_min: number | null;
	dlimo_recovered_L: number | null;
	dlimo_lost_L: number | null;
	dlimo_loss_pct: number | null;
	acidic_aq_vol_L: number | null;
	acidic_ph: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

// Backward-compat: Stage4Record matches the VIEW output (stage6 + stage7 joined)
// Step 6: K₂CO₃ Precipitation + Drying → Final Product
export interface Stage4Record {
	id: number;
	batch_id: number;
	k2co3_added_g: number | null;
	precip_ph: number | null;
	precip_temp_C: number | null;
	wet_precipitate_g: number | null;
	wash_vol_mL: number | null;
	wash_cycles: number | null;
	dry_method: string | null;
	dry_temp_C: number | null;
	dry_time_hr: number | null;
	final_product_g: number | null;
	final_moisture_pct: number | null;
	overall_yield_pct: number | null;
	batch_duration_hr: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface SupplierDelivery {
	id: number;
	lot_id: string;
	supplier: string;
	delivery_date: string;
	quantity_kg: number;
	batches_from_lot: number;
	cost_usd: number;
	cost_per_kg_usd: number;
}

export interface SolventLedgerEntry {
	id: number;
	date: string;
	event: string;
	material: string;
	volume_L: number;
	batch_id: string | null;
	running_balance_L: number | null;
	notes: string | null;
}

export interface Material {
	id: number;
	code: string;
	name: string;
	unit: string;
	on_hand_qty: number;
	reorder_threshold: number;
	stage_relevance: string | null;
	created_at: string;
	updated_at: string;
}

export interface MaterialMovement {
	id: number;
	material_id: number;
	batch_id: number | null;
	movement_type: 'Received' | 'Issued' | 'Recovered' | 'Returned' | 'Adjustment';
	quantity: number;
	stage_number: number | null;
	reference_note: string | null;
	performed_by: string | null;
	created_at: string;
}

export interface Machine {
	id: number;
	code: string;
	name: string;
	machine_type: string;
	location: string | null;
	status: 'Idle' | 'Running' | 'Maintenance' | 'Offline';
	stage_relevance: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface MachineStatusEvent {
	id: number;
	machine_id: number;
	previous_status: string;
	new_status: string;
	batch_id: number | null;
	reason: string | null;
	performed_by: string | null;
	created_at: string;
}

export interface Deviation {
	id: number;
	batch_id: number;
	stage_number: number;
	deviation_type: string;
	severity: 'Low' | 'Medium' | 'High' | 'Critical';
	status: 'Open' | 'Under Review' | 'Resolved' | 'Closed';
	parameter: string | null;
	expected_value: string | null;
	actual_value: string | null;
	description: string | null;
	root_cause: string | null;
	corrective_action: string | null;
	raised_by: string | null;
	resolved_by: string | null;
	created_at: string;
	resolved_at: string | null;
	updated_at: string;
}

export interface LabResult {
	id: number;
	batch_id: number;
	test_type: 'TLC' | 'HPLC';
	test_date: string | null;
	lab_reference: string | null;
	status: 'Pending' | 'In Progress' | 'Completed' | 'Failed';
	mitragynine_pct: number | null;
	hydroxy_mitragynine_pct: number | null;
	paynantheine_pct: number | null;
	speciogynine_pct: number | null;
	speciociliatine_pct: number | null;
	non_alkaloids_pct: number | null;
	tlc_spots_observed: number | null;
	tlc_rf_values: string | null;
	tlc_image_path: string | null;
	hplc_purity_pct: number | null;
	performed_by: string | null;
	reviewed_by: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Approval {
	id: number;
	batch_id: number;
	stage_number: number | null;
	approval_type: 'stage_finalization' | 'batch_review' | 'deviation_resolution';
	status: 'Pending' | 'Approved' | 'Rejected';
	requested_by: string | null;
	decided_by: string | null;
	decision_notes: string | null;
	requested_at: string;
	decided_at: string | null;
}

export interface ProductionRun {
	id: number;
	run_number: string;
	target_kg: number;
	batch_size_kg: number;
	status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold';
	started_at: string | null;
	completed_at: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProductionRunSummary {
	run: ProductionRun;
	totalBatches: number;
	completedBatches: number;
	inProgressBatches: number;
	totalInputKg: number;
	totalProducedKg: number;
	overallYieldPct: number;
	totalCost: number;
	costPerKg: number;
	avgEthanolRecovery: number;
}

export interface BatchCostSummary {
	batch_id: number;
	batch_number: string;
	status: string;
	supplier_lot: string | null;
	totalCost: number;
	costPerKg: number | null;
	final_product_g: number | null;
}

export interface BatchEthanolSummary {
	batch_id: number;
	batch_number: string;
	status: string;
	supplier_lot: string | null;
	ethanol_issued_l: number | null;
	ethanol_recovered_l: number | null;
	ethanol_lost_l: number | null;
	recovery_pct: number | null;
	filtration_return_l: number | null;
	concentration_gl: number | null;
}

export interface BatchYieldSummary {
	batch_id: number;
	batch_number: string;
	status: string;
	supplier_lot: string | null;
	leaf_input_kg: number;
	final_product_g: number | null;
	overall_yield_pct: number | null;
	hplc_purity_pct: number | null;
	mitragynine_pct: number | null;
	deviation_count: number;
}

export interface RunHistorySummary {
	runId: number;
	runNumber: string;
	status: string;
	startedAt: string | null;
	completedAt: string | null;
	totalBatches: number;
	completedBatches: number;
	totalInputKg: number;
	totalProducedKg: number;
	overallYieldPct: number;
	totalCost: number;
	costPerKg: number;
	avgCostPerBatch: number;
	avgEthanolRecovery: number;
	totalEthanolIssued: number;
	totalEthanolRecovered: number;
	totalEthanolLost: number;
	avgPurity: number | null;
	deviationCount: number;
}

export interface AnomalyFlag {
	batchId: number;
	batchNumber: string;
	metric: string;
	value: number;
	runAvg: number;
	deviation: number;
	severity: 'warning' | 'critical';
}

export interface QualityCorrelationPoint {
	batchId: number;
	batchNumber: string;
	yieldPct: number;
	purityPct: number | null;
	mitragynine: number | null;
	hydroxymitragynine: number | null;
	paynantheine: number | null;
	speciogynine: number | null;
	speciociliatine: number | null;
	supplier: string | null;
}

export interface Alert {
	id: number;
	batch_id: number | null;
	stage_number: number | null;
	alert_type: string;
	severity: 'Low' | 'Medium' | 'High';
	metric: string;
	threshold: number;
	actual_value: number;
	message: string;
	acknowledged: number;
	acknowledged_by: string | null;
	created_at: string;
	acknowledged_at: string | null;
}

export interface UnitRate {
	id: number;
	category: string;
	item_name: string;
	unit: string;
	rate_per_unit: number;
	effective_from: string;
	notes: string | null;
}

export interface BatchCost {
	id: number;
	batch_id: number;
	cost_category: string;
	item_name: string;
	quantity: number | null;
	unit_rate: number | null;
	total_cost: number;
	notes: string | null;
	created_at: string;
}
