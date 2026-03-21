import { getBatchById, getBatchStages, updateBatchStatus } from '$lib/data/repositories/batchRepo';
import { getBatchCosts } from '$lib/data/repositories/costingRepo';
import { getDeviationsByBatch } from '$lib/data/repositories/deviationRepo';
import { getLabResultsByBatch } from '$lib/data/repositories/labResultRepo';
import { getApprovalsByBatch, createApproval, decideApproval } from '$lib/data/repositories/approvalRepo';
import { getMachineEventsByBatch } from '$lib/data/repositories/machineRepo';
import { getStage1Record, getStage2Record, getStage3Record, getStage4Record } from '$lib/data/repositories/stageRepo';
import { calculateTotalBatchCost, calculateCostPerKg } from '$lib/calculations/costing';
import { canTransition } from '$lib/constants/batchStates';
import type { BatchState } from '$lib/constants/batchStates';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = ({ params }) => {
	try {
		const batch = getBatchById(Number(params.id));
		if (!batch) error(404, 'Batch not found');

		const stages = getBatchStages(batch.id);
		const costs = getBatchCosts(batch.id);
		const totalCost = calculateTotalBatchCost(costs);
		const deviations = getDeviationsByBatch(batch.id);
		const labResults = getLabResultsByBatch(batch.id);
		const approvals = getApprovalsByBatch(batch.id);
		const machineEvents = getMachineEventsByBatch(batch.id);

		const stage4 = getStage4Record(batch.id);
		const costPerKg = stage4?.final_product_g ? calculateCostPerKg(totalCost, stage4.final_product_g / 1000) : null;

		return {
			batch,
			stages,
			costs,
			totalCost,
			costPerKg,
			deviations,
			labResults,
			approvals,
			machineEvents,
			stage1: getStage1Record(batch.id) ?? null,
			stage2: getStage2Record(batch.id) ?? null,
			stage3: getStage3Record(batch.id) ?? null,
			stage4: stage4 ?? null
		};
	} catch (e) {
		// Re-throw HTTP errors (like 404)
		if (e && typeof e === 'object' && 'status' in e) throw e;
		console.error('Failed to load batch detail:', e);
		return {
			batch: null,
			stages: [],
			costs: [],
			totalCost: 0,
			costPerKg: null,
			deviations: [],
			labResults: [],
			approvals: [],
			machineEvents: [],
			stage1: null,
			stage2: null,
			stage3: null,
			stage4: null
		};
	}
};

export const actions: Actions = {
	approve: async ({ request, params }) => {
		const batchId = Number(params.id);
		const batch = getBatchById(batchId);
		if (!batch) return fail(404, { error: 'Batch not found' });
		if (!canTransition(batch.status as BatchState, 'Completed')) {
			return fail(400, { error: 'Batch cannot be approved in its current state' });
		}

		const formData = await request.formData();
		const decidedBy = (formData.get('decided_by') as string) || 'Supervisor';

		// Create or update the approval record
		const approvals = getApprovalsByBatch(batchId);
		const pending = approvals.find((a) => a.approval_type === 'batch_review' && a.status === 'Pending');
		if (pending) {
			decideApproval(pending.id, { decided_by: decidedBy, status: 'Approved', decision_notes: null });
		} else {
			const approvalId = createApproval({ batch_id: batchId, approval_type: 'batch_review', requested_by: decidedBy });
			decideApproval(approvalId, { decided_by: decidedBy, status: 'Approved', decision_notes: null });
		}

		updateBatchStatus(batchId, 'Completed');
		return { success: true, action: 'approved' };
	},

	reject: async ({ request, params }) => {
		const batchId = Number(params.id);
		const batch = getBatchById(batchId);
		if (!batch) return fail(404, { error: 'Batch not found' });
		if (!canTransition(batch.status as BatchState, 'Rejected')) {
			return fail(400, { error: 'Batch cannot be rejected in its current state' });
		}

		const formData = await request.formData();
		const decidedBy = (formData.get('decided_by') as string) || 'Supervisor';
		const reason = (formData.get('reason') as string) || null;

		const approvals = getApprovalsByBatch(batchId);
		const pending = approvals.find((a) => a.approval_type === 'batch_review' && a.status === 'Pending');
		if (pending) {
			decideApproval(pending.id, { decided_by: decidedBy, status: 'Rejected', decision_notes: reason });
		} else {
			const approvalId = createApproval({ batch_id: batchId, approval_type: 'batch_review', requested_by: decidedBy });
			decideApproval(approvalId, { decided_by: decidedBy, status: 'Rejected', decision_notes: reason });
		}

		updateBatchStatus(batchId, 'Rejected');
		return { success: true, action: 'rejected' };
	},

	reopen: async ({ request, params }) => {
		const batchId = Number(params.id);
		const batch = getBatchById(batchId);
		if (!batch) return fail(404, { error: 'Batch not found' });
		if (!canTransition(batch.status as BatchState, 'In Progress')) {
			return fail(400, { error: 'Batch cannot be reopened in its current state' });
		}

		updateBatchStatus(batchId, 'In Progress');
		return { success: true, action: 'reopened' };
	}
};
