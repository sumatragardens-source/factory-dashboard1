// ============================================================
// COST & PRICING CONFIGURATION
// Edit this file to change currency, prices, suppliers, etc.
// All seed data and display formatting reads from here.
// ============================================================

// --- Currency ---
export const CURRENCY_SYMBOL = '$';

// --- Suppliers ---
export const SUPPLIERS = ['Supplier A - Kalimantan', 'Supplier B - Kalimantan'] as const;

// --- Unit Rates (USD) ---
// Source: Price_Reference sheet from SG_3Month_Final_v2.xlsx
export const UNIT_RATES = {
	driedLeaf:      { name: 'Raw leaf (dried)',           unit: 'kg',    rate: 0.304,  notes: '$304/ton from supplier' },
	ethanol70:      { name: 'Ethanol 70%',                unit: 'L',     rate: 0.83,   notes: 'Industrial grade' },
	dLimonene:      { name: 'D-Limonene',                 unit: 'L',     rate: 13.00,  notes: 'Food grade' },
	aceticAcid:     { name: 'Acetic acid (glacial)',       unit: 'L',     rate: 0.50,   notes: 'SE Asia market' },
	naoh:           { name: 'NaOH flakes (lye)',           unit: 'kg',    rate: 0.40,   notes: 'Asia $290-400/MT' },
	k2co3:          { name: 'K₂CO₃ (potassium carbonate)', unit: 'kg',   rate: 1.50,   notes: 'SE Asia $924/MT' },
	testing:        { name: 'Testing (per lot)',            unit: 'lot',   rate: 110.00, notes: '$110/ton, allocated per lot (÷10 for per-batch)' },
	electricity:    { name: 'Electricity',                 unit: 'month', rate: 720,    notes: 'PLN industrial' },
	labor:          { name: 'All employees (5 total)',     unit: 'month', rate: 1048,   notes: 'Pay + stipend combined' },
	shipping:       { name: 'Shipping (finished product)', unit: 'kg',    rate: 80.00,  notes: 'International' },
} as const;

// --- Target / Budget Constants (USD) ---
export const TARGETS = {
	costPerKg: 350,              // target cost per kg of final product
	dailyBudget: 200,            // daily operational budget
	sellingPricePerKg: 4800,     // selling price per kg (for GP calculation)
} as const;

// --- Formatting Helper ---
// Use this everywhere you display a monetary value.
// Example: fmt(25.5) → "$25.50"    fmt(1234) → "$1,234"
export function fmt(value: number): string {
	if (Math.abs(value) >= 100) {
		return `${CURRENCY_SYMBOL}${Math.round(value).toLocaleString()}`;
	}
	return `${CURRENCY_SYMBOL}${value.toFixed(2)}`;
}
