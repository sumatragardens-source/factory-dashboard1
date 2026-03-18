import { getBatchById, getBatchStages, startStage, finalizeStage } from '$lib/data/repositories/batchRepo';
import {
	getStage1Record, getStage2Record, getStage3Record, getStage4Record,
	upsertStage1Record, upsertStage2Record,
	upsertStage3Record, upsertStage4Record
} from '$lib/data/repositories/stageRepo';
import { getAllUnitRates, getBatchCosts } from '$lib/data/repositories/costingRepo';
import { calculateTotalBatchCost } from '$lib/calculations/costing';
import { getAllMachineStatuses } from '$lib/data/repositories/dashboardRepo';
import { evaluateAndPersistAlerts, getAlertsByBatch, acknowledgeAlert } from '$lib/data/repositories/alertRepo';
import { validateStage1Save, validateStage1Finalize } from '$lib/validation/stage1';
import { validateStage2Save, validateStage2Finalize } from '$lib/validation/stage2';
import { validateStage3Save, validateStage3Finalize } from '$lib/validation/stage3';
import { validateStage4Save, validateStage4Finalize } from '$lib/validation/stage4';
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

	const alerts = getAlertsByBatch(batch.id);

	return { batch, stageNumber, stages, ...stageRecords, unitRates, costs, totalCost, machines, alerts };
};

const TEXT_FIELDS = new Set([
	'operator_name', 'notes',
	'grinder_id', 'grind_start', 'grind_end',
	'acetic_conc', 'dry_method'
]);

function formDataToRecord(formData: FormData): Record<string, unknown> {
	const record: Record<string, unknown> = {};
	for (const [key, value] of formData.entries()) {
		const strVal = value.toString().trim();
		if (strVal === '') {
			record[key] = null;
		} else if (!isNaN(Number(strVal)) && !TEXT_FIELDS.has(key)) {
			record[key] = Number(strVal);
		} else {
			record[key] = strVal;
		}
	}
	return record;
}

function getValidateFns(stageNumber: number) {
	switch (stageNumber) {
		case 1: return { save: validateStage1Save, finalize: validateStage1Finalize };
		case 2: return { save: validateStage2Save, finalize: validateStage2Finalize };
		case 3: return { save: validateStage3Save, finalize: validateStage3Finalize };
		case 4: return { save: validateStage4Save, finalize: validateStage4Finalize };
		default: throw new Error('Invalid stage');
	}
}

function upsertForStage(stageNumber: number, batchId: number, data: Record<string, unknown>) {
	const table = stageToRecordTable(stageNumber);
	switch (table) {
		case 1: upsertStage1Record(batchId, data); break;
		case 2: upsertStage2Record(batchId, data); break;
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

		upsertForStage(stageNumber, batchId, data);
		evaluateAndPersistAlerts(batchId);

		return { success: true };
	},

	acknowledge: async ({ request, params }) => {
		const batchId = Number(params.id);
		const formData = await request.formData();
		const alertId = Number(formData.get('alert_id'));
		const acknowledgedBy = String(formData.get('acknowledged_by') ?? 'Operator');
		if (alertId) acknowledgeAlert(alertId, acknowledgedBy);
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

		upsertForStage(stageNumber, batchId, data);

		const operatorName = String(data.operator_name ?? batch.operator_name ?? 'Unknown');
		finalizeStage(batchId, stageNumber, operatorName);
		evaluateAndPersistAlerts(batchId);

		return { success: true, finalized: true };
	}
};
