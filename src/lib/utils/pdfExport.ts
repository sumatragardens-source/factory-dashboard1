import { jsPDF } from 'jspdf';
import type {
	Batch,
	BatchStage,
	Stage1Record,
	Stage2Record,
	Stage3Record,
	Stage4Record,
	BatchCost,
	LabResult,
	Deviation
} from '$lib/domain/types';

export function generateBatchPDF(
	batch: Batch,
	stages: BatchStage[],
	stage1: Stage1Record | null,
	stage2: Stage2Record | null,
	stage3: Stage3Record | null,
	stage4: Stage4Record | null,
	costs: BatchCost[],
	totalCost: number,
	costPerKg: number | null,
	labResults: LabResult[],
	deviations: Deviation[]
): void {
	const doc = new jsPDF();
	let y = 20;
	const leftMargin = 15;
	const pageWidth = 180;

	function addSection(title: string) {
		if (y > 250) {
			doc.addPage();
			y = 20;
		}
		y += 6;
		doc.setFontSize(11);
		doc.setFont('helvetica', 'bold');
		doc.text(title.toUpperCase(), leftMargin, y);
		y += 2;
		doc.setDrawColor(100, 100, 100);
		doc.line(leftMargin, y, leftMargin + pageWidth, y);
		y += 6;
	}

	function addRow(label: string, value: string | number | null | undefined) {
		if (y > 275) {
			doc.addPage();
			y = 20;
		}
		doc.setFontSize(9);
		doc.setFont('helvetica', 'normal');
		doc.text(label, leftMargin, y);
		doc.setFont('helvetica', 'bold');
		doc.text(String(value ?? '—'), leftMargin + 80, y);
		y += 5;
	}

	function addSpacer() {
		y += 4;
	}

	// Header
	doc.setFontSize(16);
	doc.setFont('helvetica', 'bold');
	doc.text(`BATCH REPORT — ${batch.batch_number}`, leftMargin, y);
	y += 8;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.text(
		`Status: ${batch.status}  |  Operator: ${batch.operator_name ?? '—'}  |  Supplier: ${batch.supplier ?? '—'}`,
		leftMargin,
		y
	);
	y += 5;
	doc.text(
		`Leaf Input: ${batch.leaf_input_kg} kg  |  Started: ${batch.started_at ? new Date(batch.started_at).toLocaleDateString() : '—'}`,
		leftMargin,
		y
	);
	y += 5;
	doc.text(`Generated: ${new Date().toLocaleString()}`, leftMargin, y);
	y += 4;

	// Stage 1
	addSection('Stage 1 — Raw Leaf to Powder');
	if (stage1) {
		addRow('Net Leaf Input', `${stage1.net_leaf_kg} kg`);
		addRow('Moisture', `${stage1.moisture_pct}%`);
		addRow('Powder Output', `${stage1.powder_output_kg} kg`);
		addRow('Dust Loss', `${stage1.dust_loss_kg} kg`);
		addRow('Mass Balance Error', `${stage1.mass_balance_err_pct}%`);
		addRow('Throughput', `${stage1.throughput_kg_hr} kg/hr`);
		addRow('Runtime', `${stage1.runtime_min} min`);
	} else {
		addRow('Data', 'Not recorded');
	}

	// Stage 2
	addSection('Stage 2 — Ethanol Extraction');
	if (stage2) {
		addRow('EtOH Volume Issued', `${stage2.etoh_vol_L} L`);
		addRow('EtOH Purity', `${stage2.etoh_purity_pct}%`);
		addRow('EtOH Recovered', `${stage2.etoh_recovered_L} L`);
		addRow('EtOH Recovery %', `${stage2.etoh_recovery_pct}%`);
		addRow('EtOH Lost', `${stage2.etoh_lost_L} L`);
		addRow('Crude Extract', `${stage2.crude_extract_wt_kg} kg`);
		addRow('Filtrate Volume', `${stage2.filtrate_vol_L} L`);
		addRow('Spent Cake', `${stage2.spent_cake_kg} kg`);
	} else {
		addRow('Data', 'Not recorded');
	}

	// Stage 3
	addSection('Stage 3 — Acid/Base Extraction');
	if (stage3) {
		addRow('Initial pH', stage3.initial_ph);
		addRow('Basified pH', stage3.basified_ph);
		addRow('NaOH Added', `${stage3.naoh_added_g} g`);
		addRow('D-Limonene Issued', `${stage3.dlimo_vol_L} L`);
		addRow('D-Limonene Recovered', `${stage3.dlimo_recovered_L} L`);
		addRow('D-Limonene Lost', `${stage3.dlimo_lost_L} L`);
		addRow('Organic Phase', `${stage3.organic_phase_mL} mL`);
		addRow('Acidic Aq Vol', `${stage3.acidic_aq_vol_L} L`);
		addRow('Acidic pH', stage3.acidic_ph);
	} else {
		addRow('Data', 'Not recorded');
	}

	// Stage 4
	addSection('Stage 4 — Precipitation & Drying');
	if (stage4) {
		addRow('K2CO3 Added', `${stage4.k2co3_added_g} g`);
		addRow('Precipitation pH', stage4.precip_ph);
		addRow('Wet Precipitate', `${stage4.wet_precipitate_g} g`);
		addRow('Final Product', `${stage4.final_product_g} g`);
		addRow('Overall Yield', `${stage4.overall_yield_pct}%`);
		addRow('Final Moisture', `${stage4.final_moisture_pct}%`);
		addRow('Dry Method', stage4.dry_method);
		addRow('Batch Duration', `${stage4.batch_duration_hr} hr`);
	} else {
		addRow('Data', 'Not recorded');
	}

	// Cost Summary
	addSection('Cost Summary');
	if (costs.length > 0) {
		for (const cost of costs) {
			addRow(`${cost.cost_category} — ${cost.item_name}`, `$${cost.total_cost.toFixed(2)}`);
		}
		addSpacer();
		addRow('TOTAL COST', `$${totalCost.toFixed(2)}`);
		if (costPerKg) {
			addRow('Cost per kg', `$${costPerKg.toFixed(2)}`);
		}
	} else {
		addRow('Costs', 'None recorded');
	}

	// Lab Results
	addSection('Lab Results');
	if (labResults.length > 0) {
		for (const result of labResults) {
			addRow(`${result.test_type} (${result.status})`, result.lab_reference ?? 'No Ref');
			if (result.test_type === 'HPLC' && result.status === 'Completed') {
				addRow('  Mitragynine', `${result.mitragynine_pct}%`);
				addRow('  7-OH-Mitragynine', `${result.hydroxy_mitragynine_pct}%`);
				addRow('  Paynantheine', `${result.paynantheine_pct}%`);
				addRow('  Speciogynine', `${result.speciogynine_pct}%`);
				addRow('  Speciociliatine', `${result.speciociliatine_pct}%`);
				addRow('  Total Purity', `${result.hplc_purity_pct}%`);
			}
			addSpacer();
		}
	} else {
		addRow('Results', 'Pending');
	}

	// Deviations
	addSection('Deviations');
	if (deviations.length > 0) {
		for (const dev of deviations) {
			addRow(`${dev.parameter} (${dev.severity})`, `Actual: ${dev.actual_value} / Expected: ${dev.expected_value}`);
			addRow('  Status', `${dev.status} — Stage ${dev.stage_number}`);
			addSpacer();
		}
	} else {
		addRow('Deviations', 'None recorded');
	}

	doc.save(`batch-${batch.batch_number}.pdf`);
}
