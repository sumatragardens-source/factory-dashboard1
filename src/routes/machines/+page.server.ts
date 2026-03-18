import { getAllMachines, getMachineStatusEvents } from '$lib/data/repositories/machineRepo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	try {
		const machines = getAllMachines();
		const recentEvents = machines.flatMap((m) =>
			getMachineStatusEvents(m.id).map((e) => ({ ...e, machine_name: m.name, machine_code: m.code }))
		).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

		return { machines, recentEvents };
	} catch (error) {
		console.error('Failed to load machines data:', error);
		return { machines: [], recentEvents: [] };
	}
};
