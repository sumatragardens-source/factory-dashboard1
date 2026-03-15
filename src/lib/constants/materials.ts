export interface MaterialDefinition {
	code: string;
	name: string;
	unit: string;
	reorderThreshold: number;
	stageRelevance: string;
}

export const MATERIALS: MaterialDefinition[] = [
	{
		code: 'MAT-LEAF',
		name: 'Dried Leaf',
		unit: 'kg',
		reorderThreshold: 50,
		stageRelevance: 'Stage 1'
	},
	{
		code: 'MAT-ETOH',
		name: 'Ethanol 96%',
		unit: 'L',
		reorderThreshold: 100,
		stageRelevance: 'Stage 2'
	},
	{
		code: 'MAT-H2O',
		name: 'DI Water',
		unit: 'L',
		reorderThreshold: 200,
		stageRelevance: 'Stage 3'
	},
	{
		code: 'MAT-HCL',
		name: 'HCl',
		unit: 'L',
		reorderThreshold: 10,
		stageRelevance: 'Stage 3'
	},
	{
		code: 'MAT-NAOH',
		name: 'NaOH',
		unit: 'kg',
		reorderThreshold: 40,
		stageRelevance: 'Stage 3'
	},
	{
		code: 'MAT-LIM',
		name: 'Limonene',
		unit: 'L',
		reorderThreshold: 20,
		stageRelevance: 'Stage 3,4'
	}
];
