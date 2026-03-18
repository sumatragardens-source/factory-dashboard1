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
		reorderThreshold: 200,
		stageRelevance: 'Raw Leaf & Grinding'
	},
	{
		code: 'MAT-ETOH',
		name: 'Ethanol 70%',
		unit: 'L',
		reorderThreshold: 800,
		stageRelevance: 'Ethanol Extraction'
	},
	{
		code: 'MAT-H2O',
		name: 'DI Water',
		unit: 'L',
		reorderThreshold: 2000,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-NAOH',
		name: 'NaOH (lye flakes)',
		unit: 'kg',
		reorderThreshold: 150,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-LIM',
		name: 'D-Limonene',
		unit: 'L',
		reorderThreshold: 80,
		stageRelevance: 'Acid/Base Extraction and Partitioning'
	},
	{
		code: 'MAT-ACETIC',
		name: 'Acetic acid (glacial)',
		unit: 'L',
		reorderThreshold: 40,
		stageRelevance: 'Back-Extraction & Precipitation'
	},
	{
		code: 'MAT-K2CO3',
		name: 'K₂CO₃ (potassium carbonate)',
		unit: 'kg',
		reorderThreshold: 50,
		stageRelevance: 'Back-Extraction & Precipitation'
	},
	{
		code: 'MAT-DE',
		name: 'Diatomite (DE)',
		unit: 'kg',
		reorderThreshold: 30,
		stageRelevance: 'Filtration & Washing'
	}
];
