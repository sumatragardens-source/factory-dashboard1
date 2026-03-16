import { getBatchById, getBatchStages, startStage, finalizeStage } from '$lib/data/repositories/batchRepo';
import {
	getStage1Record, getStage2Record, getStage3Record, getStage4Record,
	getStage2Reactors, getStage2RotovapDays,
	upsertStage1Record, upsertStage2Record, upsertStage2Reactors, upsertStage2RotovapDays,
	upsertStage3Record, upsertStage4Record
} from '$lib/data/repositories/stageRepo';
import { getAllUnitRates, getBatchCosts } from '$lib/data/repositories/costingRepo';
import { calculateTotalBatchCost } from '$lib/calculations/costing';
import { getAllMachineStatuses } from '$lib/data/repositories/dashboardRepo';
import { validateStage1Save, validateStage1Finalize } from '$lib/validation/stage1';
import { validateStage2Save, validateStage2Finalize } from '$lib/validation/stage2';
import { validateStage3Save, validateStage3Finalize } from '$lib/validation/stage3';
import { validateStage4Save, validateStage4Finalize } from '$lib/validation/stage4';
import { validateStage5Save, validateStage5Finalize } from '$lib/validation/stage5';
import { validateStage6Save, validateStage6Finalize } from '$lib/validation/stage6';
import { validateStage7Save, validateStage7Finalize } from '$lib/validation/stage7';
import { validateStage8Save, validateStage8Finalize } from '$lib/validation/stage8';
import { TOTAL_STAGES, stageToRecordTable } from '$lib/constants/stageNames';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const batch = getBatchById(Number(params.id));
	if (!batch) error(404, 'Batch not found');

	const stageNumber = Number(params.stageNumber);
	if (stageNumber < 1 || stageNumber > TOTAL_STAGES) error(404, 'Invalid stage number');

	const stages = getBatchStages(batch.id);

	const stageRecords = {
		stage1: getStage1Record(batch.id) ?? null,
		stage2: getStage2Record(batch.id) ?? null,
		stage3: getStage3Record(batch.id) ?? null,
		stage4: getStage4Record(batch.id) ?? null
	};

	const unitRates = getAllUnitRates();
	const costs = getBatchCosts(batch.id);
	const totalCost = calculateTotalBatchCost(costs);
	const machines = getAllMachineStatuses();

	const recordTable = stageToRecordTable(stageNumber);
	const stage2Reactors = recordTable === 2 ? getStage2Reactors(batch.id) : [];
	const stage2RotovapDays = recordTable === 2 ? getStage2RotovapDays(batch.id) : [];

	return { batch, stageNumber, stages, ...stageRecords, unitRates, costs, totalCost, machines, stage2Reactors, stage2RotovapDays };
};

function formDataToRecord(formData: FormData): Record<string, unknown> {
	const record: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		if (key.startsWith('reactor_') || key.startsWith('rotovap_day_')) continue;
		const strVal = value.toString().trim();
		if (strVal === '') {
			record[key] = null;
		} else if (!isNaN(Number(strVal)) && key !== 'operator_name' && key !== 'notes' && key !== 'receipt_date' && key !== 'processing_date' && key !== 'feed_rate_setting' && key !== 'acid_type' && key !== 'base_type' && key !== 'back_extraction_solvent' && key !== 'precipitation_method' && key !== 'product_appearance' && key !== 'ethanol_grade') {
			record[key] = Number(strVal);
		} else {
			record[key] = strVal;
		}
	}
	return record;
}

function parseReactors(formData: FormData): Record<string, unknown>[] {
	const reactors: Record<string, unknown>[] = [];
	for (let i = 1; i <= 3; i++) {
		const hasMass = formData.get(`reactor_${i}_powder_mass_kg`);
		if (hasMass && hasMass.toString().trim() !== '') {
			reactors.push({
				reactor_number: i,
				machine_id: formData.get(`reactor_${i}_machine_id`) ? Number(formData.get(`reactor_${i}_machine_id`)) : null,
				temperature_c: formData.get(`reactor_${i}_temperature_c`) ? Number(formData.get(`reactor_${i}_temperature_c`)) : null,
				rpm: formData.get(`reactor_${i}_rpm`) ? Number(formData.get(`reactor_${i}_rpm`)) : null,
				soak_time_min: formData.get(`reactor_${i}_soak_time_min`) ? Number(formData.get(`reactor_${i}_soak_time_min`)) : null,
				powder_mass_kg: Number(hasMass),
				ethanol_70_volume_l: formData.get(`reactor_${i}_ethanol_70_volume_l`) ? Number(formData.get(`reactor_${i}_ethanol_70_volume_l`)) : null,
				solvent_ratio: formData.get(`reactor_${i}_solvent_ratio`) ? Number(formData.get(`reactor_${i}_solvent_ratio`)) : null
			});
		}
	}
	return reactors;
}

function parseRotovapDays(formData: FormData): Record<string, unknown>[] {
	const days: Record<string, unknown>[] = [];
	const dayCountStr = formData.get('rotovap_day_count');
	const dayCount = dayCountStr ? Number(dayCountStr) : 0;
	for (let i = 0; i < dayCount; i++) {
		const rn = formData.get(`rotovap_day_${i}_rotovap_number`);
		const dn = formData.get(`rotovap_day_${i}_day_number`);
		if (rn && dn) {
			days.push({
				rotovap_number: Number(rn),
				machine_id: formData.get(`rotovap_day_${i}_machine_id`) ? Number(formData.get(`rotovap_day_${i}_machine_id`)) : null,
				day_number: Number(dn),
				water_bath_temp_c: formData.get(`rotovap_day_${i}_water_bath_temp_c`) ? Number(formData.get(`rotovap_day_${i}_water_bath_temp_c`)) : null,
				vacuum_mbar: formData.get(`rotovap_day_${i}_vacuum_mbar`) ? Number(formData.get(`rotovap_day_${i}_vacuum_mbar`)) : null,
				chiller_temp_c: formData.get(`rotovap_day_${i}_chiller_temp_c`) ? Number(formData.get(`rotovap_day_${i}_chiller_temp_c`)) : null,
				rpm: formData.get(`rotovap_day_${i}_rpm`) ? Number(formData.get(`rotovap_day_${i}_rpm`)) : null,
				run_time_hours: formData.get(`rotovap_day_${i}_run_time_hours`) ? Number(formData.get(`rotovap_day_${i}_run_time_hours`)) : null,
				ethanol_recovered_l: formData.get(`rotovap_day_${i}_ethanol_recovered_l`) ? Number(formData.get(`rotovap_day_${i}_ethanol_recovered_l`)) : null,
				recovery_per_hour_l: formData.get(`rotovap_day_${i}_recovery_per_hour_l`) ? Number(formData.get(`rotovap_day_${i}_recovery_per_hour_l`)) : null
			});
		}
	}
	return days;
}

function getValidateFns(stageNumber: number) {
	switch (stageNumber) {
		case 1: return { save: validateStage1Save, finalize: validateStage1Finalize };
		case 2: return { save: validateStage2Save, finalize: validateStage2Finalize };
		case 3: return { save: validateStage3Save, finalize: validateStage3Finalize };
		case 4: return { save: validateStage4Save, finalize: validateStage4Finalize };
		case 5: return { save: validateStage5Save, finalize: validateStage5Finalize };
		case 6: return { save: validateStage6Save, finalize: validateStage6Finalize };
		case 7: return { save: validateStage7Save, finalize: validateStage7Finalize };
		case 8: return { save: validateStage8Save, finalize: validateStage8Finalize };
		default: throw new Error('Invalid stage');
	}
}

function upsertForStage(stageNumber: number, batchId: number, data: Record<string, unknown>, formData: FormData) {
	const table = stageToRecordTable(stageNumber);
	switch (table) {
		case 1: upsertStage1Record(batchId, data); break;
		case 2:
			upsertStage2Record(batchId, data);
			upsertStage2Reactors(batchId, parseReactors(formData));
			upsertStage2RotovapDays(batchId, parseRotovapDays(formData));
			break;
		case 3: upsertStage3Record(batchId, data); break;
		case 4: upsertStage4Record(batchId, data); break;
	}
}

export const actions: Actions = {
	save: async ({ request, params }) => {
		const batchId = Number(params.id);
		const stageNumber = Number(params.stageNumber);
		const batch = getBatchById(batchId);
		if (!batch) return fail(404, { errors: ['Batch not found'] });

		const formData = await request.formData();
		const data = formDataToRecord(formData);
		const { save: validateSave } = getValidateFns(stageNumber);
		const errors = validateSave(data);
		if (errors.length > 0) return fail(400, { errors });

		// Auto-start stage if pending
		const stages = getBatchStages(batchId);
		const currentStage = stages.find(s => s.stage_number === stageNumber);
		if (currentStage?.status === 'Pending') {
			startStage(batchId, stageNumber);
		}

		upsertForStage(stageNumber, batchId, data, formData);

		return { success: true };
	},

	finalize: async ({ request, params }) => {
		const batchId = Number(params.id);
		const stageNumber = Number(params.stageNumber);
		const batch = getBatchById(batchId);
		if (!batch) return fail(404, { errors: ['Batch not found'] });

		const formData = await request.formData();
		const data = formDataToRecord(formData);
		const { finalize: validateFinalize } = getValidateFns(stageNumber);
		const errors = validateFinalize(data);
		if (errors.length > 0) return fail(400, { errors });

		// Auto-start stage if pending
		const stages = getBatchStages(batchId);
		const currentStage = stages.find(s => s.stage_number === stageNumber);
		if (currentStage?.status === 'Pending') {
			startStage(batchId, stageNumber);
		}

		upsertForStage(stageNumber, batchId, data, formData);

		const operatorName = String(data.operator_name ?? batch.operator_name ?? 'Unknown');
		finalizeStage(batchId, stageNumber, operatorName);

		return { success: true, finalized: true };
	}
};
