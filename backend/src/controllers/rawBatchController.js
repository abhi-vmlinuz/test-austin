const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { positiveQty } = require('../utils/validators');
const { batchCode } = require('../utils/codes');
const { forwardTrace } = require('../services/traceabilityService');

async function list(req, res, next) {
  try {
    const { species, status, q } = req.query;
    const where = []; const p = [];
    if (species) { where.push('rb.species = ?'); p.push(species); }
    if (status) { where.push('rb.status = ?'); p.push(status); }
    if (q) { where.push('(rb.batch_code LIKE ? OR rb.species LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT rb.*, v.vessel_name, h.harbour_name FROM raw_batches rb
       LEFT JOIN vessels v ON v.vessel_id = rb.vessel_id LEFT JOIN harbours h ON h.harbour_id = rb.harbour_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY rb.created_at DESC`, p);
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    const { species, quantity, unit = 'kg', vessel_id = null, harbour_id = null, landing_date = null, notes = null, landing_item_id = null } = req.body;
    if (!species) throw httpError(400, 'Species is mandatory.');
    const qty = positiveQty(quantity, 'Quantity');
    const code = req.body.batch_code || batchCode();
    const [r] = await pool.query(
      'INSERT INTO raw_batches (landing_item_id, batch_code, species, original_quantity, remaining_quantity, unit, status, vessel_id, harbour_id, landing_date, notes, created_by) VALUES (?,?,?,?,?,?,?, ?,?,?,?,?)',
      [landing_item_id, code, species, qty, qty, unit, 'AVAILABLE', vessel_id, harbour_id, landing_date, notes, req.user.user_id]);
    await auditLog({ user_id: req.user.user_id, action: 'RAW_BATCH_CREATED', entity_type: 'raw_batches', entity_id: r.insertId, new_value: { batch_code: code, species, qty }, ip_address: req.ip });
    const [[rb]] = await pool.query('SELECT * FROM raw_batches WHERE raw_batch_id = ?', [r.insertId]);
    res.status(201).json(rb);
  } catch (e) { next(e); }
}
async function get(req, res, next) {
  try {
    const trace = req.query.trace === 'true';
    const [[rb]] = await pool.query(
      `SELECT rb.*, v.vessel_name, h.harbour_name FROM raw_batches rb
       LEFT JOIN vessels v ON v.vessel_id = rb.vessel_id LEFT JOIN harbours h ON h.harbour_id = rb.harbour_id
       WHERE rb.raw_batch_id = ? OR rb.batch_code = ?`, [req.params.id, req.params.id]);
    if (!rb) throw httpError(404, 'Raw Batch not found.');
    if (!trace) return res.json(rb);
    const fwd = await forwardTrace(pool, rb.raw_batch_id);
    res.json({ ...rb, forward: fwd });
  } catch (e) { next(e); }
}
async function update(req, res, next) {
  try {
    const [[old]] = await pool.query('SELECT * FROM raw_batches WHERE raw_batch_id = ?', [req.params.id]);
    if (!old) throw httpError(404, 'Raw Batch not found.');
    if (['PROCESSING', 'PROCESSED', 'EXHAUSTED'].includes(old.status) && (req.body.species || req.body.original_quantity)) {
      throw httpError(400, 'Source information cannot be edited once processing has begun.');
    }
    const { status, notes } = req.body;
    await pool.query('UPDATE raw_batches SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE raw_batch_id = ?', [status || null, notes !== undefined ? notes : null, req.params.id]);
    await auditLog({ user_id: req.user.user_id, action: 'RAW_BATCH_UPDATED', entity_type: 'raw_batches', entity_id: req.params.id, old_value: old, new_value: req.body, ip_address: req.ip });
    const [[rb]] = await pool.query('SELECT * FROM raw_batches WHERE raw_batch_id = ?', [req.params.id]);
    res.json(rb);
  } catch (e) { next(e); }
}
module.exports = { list, create, get, update };
