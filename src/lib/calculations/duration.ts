/** Spec §2 Stage 4: batch_duration = end_timestamp - start_timestamp in hours */
export function calculateBatchDuration(startedAt: string, completedAt: string): number {
	const start = new Date(startedAt).getTime();
	const end = new Date(completedAt).getTime();
	if (isNaN(start) || isNaN(end) || end <= start) return 0;
	return Number(((end - start) / (1000 * 60 * 60)).toFixed(1));
}
