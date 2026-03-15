import type { MaterialMovement } from '$lib/domain/types';

export function calculateMaterialBalance(movements: MaterialMovement[]): number {
	let balance = 0;
	for (const m of movements) {
		switch (m.movement_type) {
			case 'Received':
			case 'Recovered':
			case 'Returned':
				balance += m.quantity;
				break;
			case 'Issued':
				balance -= m.quantity;
				break;
			case 'Adjustment':
				balance += m.quantity; // can be negative
				break;
		}
	}
	return Number(balance.toFixed(2));
}
