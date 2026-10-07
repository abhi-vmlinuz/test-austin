const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { positiveQty } = require('../utils/validators');
const { pgCode } = require('../utils/codes');

// Rule 5: input = output + waste. Rule 4: cannot consume more than remaining.
async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, rb.batch_code, rb.species FROM processing_records pr JOIN raw_batches rb ON rb.raw_batch_id = pr.raw_batch_id ORDER BY pr.processing_id DESC`);
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { raw_batch_id, processing_type, input_quantity, start_time = null, remarks = null } = req.body;
    if (!raw_batch_id || !processing_type) throw httpError(400, 'raw_batch_id and processing_type are required.');
    const input = positiveQty(input_quantity, 'Input quantity');
    await conn.beginTransaction();
    const [[rb]] = await conn.query('SELECT * FROM raw_batches WHERE raw_batch_id = ? FOR UPDATE', [raw_batch_id]);
    if (!rb) throw httpError(404, 'Raw Batch not found.');
    if (Number(rb.remaining_quantity) < input) {
      throw httpError(400, `Processing cannot consume more than the Raw Batch remaining quantity. Remaining: ${rb.remaining_quantity} kg, requested: ${input} kg.`);
    }
    const [r] = await conn.query(
      'INSERT INTO processing_records (raw_batch_id, processor_id, processing_type, input_quantity, output_quantity, waste_quantity, start_time, status, remarks) VALUES (?,?,?,?,?,?,?,?,?)',
      [raw_batch_id, req.user.user_id, processing_type, input, 0, 0, start_time, 'IN_PROGRESS', remarks]);
    await conn.query("UPDATE raw_batches SET status = 'PROCESSING' WHERE raw_batch_id = ?", [raw_batch_id]);
    await conn.commit();
    await auditLog({ user_id: req.user.user_id, action: 'PROCESSING_STARTED', entity_type: 'processing_records', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
    const [[pr]] = await pool.query('SELECT * FROM processing_records WHERE processing_id = ?', [r.insertId]);
    res.status(201).json(pr);
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
}
async function get(req, res, next) {
  try {
    const [[pr]] = await pool.query('SELECT pr.*, rb.batch_code FROM processing_records pr JOIN raw_batches rb ON rb.raw_batch_id = pr.raw_batch_id WHERE pr.processing_id = ?', [req.params.id]);
    if (!pr) throw httpError(404, 'Processing record not found.');
    const [groups] = await pool.query('SELECT * FROM processing_groups WHERE processing_id = ?', [req.params.id]);
    res.json({ ...pr, groups });
  } catch (e) { next(e); }
}
async function update(req, res, next) {
  try {
    const [[old]] = await pool.query('SELECT * FROM processing_records WHERE processing_id = ?', [req.params.id]);
    if (!old) throw httpError(404, 'Processing record not found.');
    if (old.status === 'COMPLETED') throw httpError(400, 'Completed processing cannot be edited.');
    const { processing_type, remarks, end_time } = req.body;
    await pool.query('UPDATE processing_records SET processing_type = COALESCE(?, processing_type), remarks = COALESCE(?, remarks), end_time = COALESCE(?, end_time) WHERE processing_id = ?',
      [processing_type || null, remarks !== undefined ? remarks : null, end_time || null, req.params.id]);
    const [[pr]] = await pool.query('SELECT * FROM processing_records WHERE processing_id = ?', [req.params.id]);
    res.json(pr);
  } catch (e) { next(e); }
}
// POST /api/processing/:id/complete — validate Rule 5, consume raw_batch, create PG row.
async function complete(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { output_quantity, waste_quantity, end_time = null } = req.body;
    const out = Number(output_quantity); const waste = Number(waste_quantity);
    if (!Number.isFinite(out) || !Number.isFinite(waste) || out < 0 || waste < 0) throw httpError(400, 'output_quantity and waste_quantity must be valid numbers.');
    await conn.beginTransaction();
    const [[pr]] = await conn.query('SELECT * FROM processing_records WHERE processing_id = ? FOR UPDATE', [req.params.id]);
    if (!pr) throw httpError(404, 'Processing record not found.');
    if (pr.status === 'COMPLETED') throw httpError(400, 'Processing is already completed.');
    const input = Number(pr.input_quantity);
    if (Math.abs(input - (out + waste)) > 0.001) {
      throw httpError(400, `Processing quantity mismatch. Input: ${input} kg. Output + Waste: ${out + waste} kg. Difference: ${Math.abs(input - (out + waste))} kg.`);
    }
    const [[rb]] = await conn.query('SELECT * FROM raw_batches WHERE raw_batch_id = ? FOR UPDATE', [pr.raw_batch_id]);
    const newRemaining = Number(rb.remaining_quantity) - input;
    if (newRemaining < -0.001) throw httpError(400, 'Processing cannot consume more than the Raw Batch remaining quantity.');
    await conn.query('UPDATE processing_records SET output_quantity = ?, waste_quantity = ?, end_time = COALESCE(?, NOW()), status = ? WHERE processing_id = ?',
      [out, waste, end_time, 'COMPLETED', req.params.id]);
    const rbStatus = newRemaining <= 0.001 ? 'EXHAUSTED' : 'PROCESSED';
    await conn.query('UPDATE raw_batches SET remaining_quantity = ?, status = ? WHERE raw_batch_id = ?', [Math.max(0, newRemaining), rbStatus, pr.raw_batch_id]);
    const code = pgCode();
    const [pg] = await conn.query(
      'INSERT INTO processing_groups (processing_id, processing_group_code, species, quantity, status) VALUES (?,?,?,?,?)',
      [pr.processing_id, code, rb.species, out, 'WAITING_FOR_QUALITY']);
    await conn.commit();
    const uid = req.user ? req.user.user_id : null;
    await auditLog({ user_id: uid, action: 'PROCESSING_COMPLETED', entity_type: 'processing_groups', entity_id: pg.insertId, new_value: { code, output: out }, ip_address: req.ip });
    const [[group]] = await pool.query('SELECT * FROM processing_groups WHERE processing_group_id = ?', [pg.insertId]);
    res.status(201).json(group);
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
}
async function listGroups(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT pg.*, rb.batch_code FROM processing_groups pg JOIN processing_records pr ON pr.processing_id = pg.processing_id JOIN raw_batches rb ON rb.raw_batch_id = pr.raw_batch_id ORDER BY pg.created_at DESC`);
    res.json(rows);
  } catch (e) { next(e); }
}
async function getGroup(req, res, next) {
  try {
    const [[pg]] = await pool.query('SELECT pg.*, pr.raw_batch_id, pr.processing_type, rb.batch_code FROM processing_groups pg JOIN processing_records pr ON pr.processing_id = pg.processing_id JOIN raw_batches rb ON rb.raw_batch_id = pr.raw_batch_id WHERE pg.processing_group_id = ? OR pg.processing_group_code = ?', [req.params.id, req.params.id]);
    if (!pg) throw httpError(404, 'Processing Group not found.');
    const [inspections] = await pool.query('SELECT * FROM quality_inspections WHERE processing_group_id = ?', [pg.processing_group_id]);
    res.json({ ...pg, inspections });
  } catch (e) { next(e); }
}
module.exports = { list, create, get, update, complete, listGroups, getGroup };
