import type { BatchState } from '$lib/constants/batchStates';

export interface Batch {
	id: number;
	batch_number: string;
	status: BatchState;
	current_stage: number;
	leaf_batch_id: string | null;
	supplier: string | null;
	strain: string | null;
	leaf_input_kg: number;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	started_at: string | null;
	completed_at: string | null;
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

export interface Stage1Record {
	id: number;
	batch_id: number;
	receipt_date: string | null;
	processing_date: string | null;
	gross_weight_kg: number | null;
	tare_weight_kg: number | null;
	net_weight_kg: number | null;
	moisture_content_pct: number | null;
	grinder_id: number | null;
	screen_mesh_mm: number | null;
	feed_rate_setting: string | null;
	machine_temp_c: number | null;
	rpm: number | null;
	run_duration_min: number | null;
	powder_weight_kg: number | null;
	dust_loss_kg: number | null;
	powder_yield_pct: number | null;
	mass_balance_error_pct: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Stage2Record {
	id: number;
	batch_id: number;
	ethanol_stock_grade_pct: number | null;
	target_ethanol_pct: number | null;
	ethanol_stock_used_l: number | null;
	water_added_l: number | null;
	ethanol_70_volume_l: number | null;
	settle_time_min: number | null;
	bag_filter_input_l: number | null;
	bag_filter_output_l: number | null;
	centrifuge_input_l: number | null;
	centrifuge_output_l: number | null;
	screw_press_input_l: number | null;
	screw_press_output_l: number | null;
	total_ethanol_70_to_rotovap_l: number | null;
	total_ethanol_distilled_l: number | null;
	water_mother_liquid_l: number | null;
	total_ethanol_recovered_l: number | null;
	total_ethanol_loss_l: number | null;
	recovery_rate_pct: number | null;
	extract_weight_kg: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Stage2Reactor {
	id: number;
	batch_id: number;
	reactor_number: number;
	machine_id: number | null;
	temperature_c: number | null;
	rpm: number | null;
	soak_time_min: number | null;
	powder_mass_kg: number | null;
	ethanol_70_volume_l: number | null;
	solvent_ratio: number | null;
}

export interface Stage2RotovapDay {
	id: number;
	batch_id: number;
	rotovap_number: number;
	machine_id: number | null;
	day_number: number;
	water_bath_temp_c: number | null;
	vacuum_mbar: number | null;
	chiller_temp_c: number | null;
	rpm: number | null;
	run_time_hours: number | null;
	ethanol_recovered_l: number | null;
	recovery_per_hour_l: number | null;
}

export interface Stage3Record {
	id: number;
	batch_id: number;
	feed_weight_kg: number | null;
	acid_type: string | null;
	acid_volume_l: number | null;
	acid_concentration_pct: number | null;
	water_volume_l: number | null;
	target_ph_acid: number | null;
	actual_ph_acid: number | null;
	limonene_volume_l: number | null;
	partition_vessel_id: number | null;
	num_washes: number | null;
	aqueous_phase_volume_l: number | null;
	organic_phase_volume_l: number | null;
	base_type: string | null;
	base_weight_kg: number | null;
	target_ph_base: number | null;
	actual_ph_base: number | null;
	limonene_recovered_l: number | null;
	limonene_loss_l: number | null;
	partition_loss_kg: number | null;
	alkaloid_precipitate_kg: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Stage4Record {
	id: number;
	batch_id: number;
	feed_weight_kg: number | null;
	back_extraction_solvent: string | null;
	back_extraction_volume_l: number | null;
	back_extraction_temp_c: number | null;
	back_extraction_time_min: number | null;
	limonene_retained_product_kg: number | null;
	limonene_process_loss_kg: number | null;
	precipitation_method: string | null;
	precipitation_ph: number | null;
	precipitate_weight_kg: number | null;
	drying_cabinet_id: number | null;
	drying_temp_c: number | null;
	drying_time_hours: number | null;
	drying_humidity_pct: number | null;
	final_product_weight_kg: number | null;
	product_appearance: string | null;
	cumulative_yield_pct: number | null;
	stage_yield_pct: number | null;
	mass_balance_error_pct: number | null;
	operator_name: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
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
	stage_number: number;
	cost_category: string;
	item_name: string;
	quantity: number;
	unit_rate: number;
	total_cost: number;
	notes: string | null;
	created_at: string;
}
