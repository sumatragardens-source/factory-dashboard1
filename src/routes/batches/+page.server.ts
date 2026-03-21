import { getAllBatches, createBatch } from '$lib/data/repositories/batchRepo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = () => {
	try {
		const batches = getAllBatches();
		return { batches };
	} catch (e) {
		console.error('Failed to load batches:', e);
		return { batches: [] };
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const supplier = formData.get('supplier') as string;
		const supplier_lot = (formData.get('supplier_lot') as string) || null;
		const leaf_input_kg = Number(formData.get('leaf_input_kg'));
		const operator_name = formData.get('operator_name') as string;

		if (!supplier || !leaf_input_kg || leaf_input_kg <= 0) {
			return { error: 'Supplier and leaf input are required.' };
		}

		const newId = createBatch({ supplier, supplier_lot, leaf_input_kg, operator_name });
		redirect(303, `/batches/${newId}`);
	}
};
