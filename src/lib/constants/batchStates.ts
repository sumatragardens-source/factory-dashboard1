export const BATCH_STATES = [
	'Draft',
	'In Progress',
	'Pending Review',
	'Completed',
	'Rejected'
] as const;

export type BatchState = (typeof BATCH_STATES)[number];

export const BATCH_TRANSITIONS: Record<BatchState, BatchState[]> = {
	Draft: ['In Progress'],
	'In Progress': ['Pending Review'],
	'Pending Review': ['Completed', 'Rejected'],
	Completed: [],
	Rejected: ['In Progress']
};

export function canTransition(from: BatchState, to: BatchState): boolean {
	return BATCH_TRANSITIONS[from].includes(to);
}
