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
		stageRelevance: 'Raw Leaf to Powder'
	},
	{
		code: 'MAT-ETOH',
		name: 'Ethanol 96%',
		unit: 'L',
		reorderThreshold: 100,
		stageRelevance: 'Ethanol Extraction'
	},
	{
		code: 'MAT-H2O',
		name: 'DI Water',
		unit: 'L',
		reorderThreshold: 200,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-HCL',
		name: 'HCl',
		unit: 'L',
		reorderThreshold: 10,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-NAOH',
		name: 'NaOH',
		unit: 'kg',
		reorderThreshold: 40,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-LIM',
		name: 'Limonene',
		unit: 'L',
		reorderThreshold: 20,
		stageRelevance: 'Acid/Base Extraction and Partitioning, Back Extraction, Precipitation, Drying, and Final Product'
	}
];
