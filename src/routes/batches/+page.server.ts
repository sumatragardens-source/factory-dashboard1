import { getAllBatches, createBatch } from '$lib/data/repositories/batchRepo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = () => {
	const batches = getAllBatches();
	return { batches };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const strain = formData.get('strain') as string;
		const supplier = formData.get('supplier') as string;
		const leaf_input_kg = Number(formData.get('leaf_input_kg'));
		const operator_name = formData.get('operator_name') as string;

		if (!strain || !supplier || !leaf_input_kg || leaf_input_kg <= 0) {
			return { error: 'All fields are required and leaf input must be positive.' };
		}

		const newId = createBatch({ strain, supplier, leaf_input_kg, operator_name });
		redirect(303, `/batches/${newId}`);
	}
};
