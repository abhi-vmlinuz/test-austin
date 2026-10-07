// Weights: appearance/2 odour/2 texture/2 size/2 processing/1 packaging/1 temp/1 = max 11 -> normalize to /10.
const MAX = { appearance: 2, odour: 2, texture: 2, size: 2, processing: 1, packaging: 1, temperature: 1 };
const TOTAL_MAX = 11;
const USABLE_THRESHOLD = 6;

function computeScore(p) {
  let sum = 0;
  for (const k of Object.keys(MAX)) {
    const v = Number(p[k]);
    if (!Number.isFinite(v) || v < 0 || v > MAX[k]) {
      throw Object.assign(new Error(`Score '${k}' must be between 0 and ${MAX[k]}.`), { status: 400 });
    }
    sum += v;
  }
  return Math.round((sum / TOTAL_MAX) * 10 * 10) / 10;
}
function resultFor(score) {
  return Number(score) >= USABLE_THRESHOLD ? 'USABLE' : 'NON_USABLE';
}

module.exports = { MAX, USABLE_THRESHOLD, computeScore, resultFor };
