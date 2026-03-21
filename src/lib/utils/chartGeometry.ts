/** Catmull-Rom spline interpolation for smooth area/line charts. */
export function smoothPath(
	values: number[],
	w: number,
	h: number,
	pad = 10
): { line: string; area: string; points: { x: number; y: number }[] } {
	if (values.length < 2) return { line: '', area: '', points: [] as { x: number; y: number }[] };
	const min = Math.min(...values);
	const max = Math.max(...values, min + 0.01);
	const range = max - min;
	const pts = values.map((v, i) => ({
		x: pad + (i / (values.length - 1)) * (w - 2 * pad),
		y: pad + (1 - (v - min) / range) * (h - 2 * pad)
	}));
	let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(pts.length - 1, i + 2)];
		const t = 0.3;
		const c1x = (p1.x + (p2.x - p0.x) * t).toFixed(1);
		const c1y = (p1.y + (p2.y - p0.y) * t).toFixed(1);
		const c2x = (p2.x - (p3.x - p1.x) * t).toFixed(1);
		const c2y = (p2.y - (p3.y - p1.y) * t).toFixed(1);
		d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
	}
	const area = `${d} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;
	return { line: d, area, points: pts };
}

/** Compute the Y position for a horizontal target line on a chart. */
export function computeTargetY(target: number, values: number[], h: number, pad = 10): number {
	const min = Math.min(...values, target);
	const max = Math.max(...values, target, min + 0.01);
	return pad + (1 - (target - min) / (max - min)) * (h - 2 * pad);
}

/** Compute a rolling average over a sliding window. */
export function rollingAvg(values: number[], window: number): number[] {
	return values.map((_, i) => {
		const start = Math.max(0, i - window + 1);
		const slice = values.slice(start, i + 1);
		return slice.reduce((a, b) => a + b, 0) / slice.length;
	});
}

/** Map a cost-per-kg value to an RGBA color using a green→amber→red gradient. */
export function costBarColorByRange(cpk: number, allCpks: number[], isCurrent: boolean): string {
	const alpha = isCurrent ? 0.8 : 0.5;
	const valid = allCpks.filter((v) => v > 0);
	if (valid.length < 2 || cpk <= 0) return `rgba(190,242,100,${alpha})`;
	const mn = Math.min(...valid);
	const mx = Math.max(...valid);
	if (mx === mn) return `rgba(190,242,100,${alpha})`;
	const t = (cpk - mn) / (mx - mn);
	let r, g, b;
	if (t < 0.5) {
		const u = t * 2;
		r = Math.round(190 + (245 - 190) * u);
		g = Math.round(242 + (158 - 242) * u);
		b = Math.round(100 + (11 - 100) * u);
	} else {
		const u = (t - 0.5) * 2;
		r = Math.round(245 + (239 - 245) * u);
		g = Math.round(158 + (68 - 158) * u);
		b = Math.round(11 + (68 - 11) * u);
	}
	return `rgba(${r},${g},${b},${alpha})`;
}
