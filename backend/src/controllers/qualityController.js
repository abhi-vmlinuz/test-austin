const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { computeScore, resultFor } = require('../services/qualityService');
const { igCode } = require('../utils/codes');

async function pending(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT pg.*, rb.batch_code FROM processing_groups pg
       JOIN processing_records pr ON pr.processing_id = pg.processing_id
       JOIN raw_batches rb ON rb.raw_batch_id = pr.raw_batch_id
       WHERE pg.status = 'WAITING_FOR_QUALITY' ORDER BY pg.created_at ASC`);
    res.json(rows);
  } catch (e) { next(e); }
}
async function createInspection(req, res, next) {
  try {
    const { processing_group_id, temperature = null, appearance_score = null, odour_score = null, texture_score = null, size_score = null, processing_score = null, packaging_score = null, remarks = null } = req.body;
    if (!processing_group_id) throw httpError(400, 'processing_group_id is required.');
    const [[pg]] = await pool.query('SELECT * FROM processing_groups WHERE processing_group_id = ?', [processing_group_id]);
    if (!pg) throw httpError(404, 'Processing Group not found.');
    let quality_score = null;
    if ([appearance_score, odour_score, texture_score, size_score, processing_score, packaging_score].every((v) => v !== null && v !== undefined)) {
      quality_score = computeScore({ appearance: appearance_score, odour: odour_score, texture: texture_score, size: size_score, processing: processing_score, packaging: packaging_score, temperature: temperature ?? 1 });
    }
    const [r] = await pool.query(
      'INSERT INTO quality_inspections (processing_group_id, inspector_id, temperature, appearance_score, odour_score, texture_score, size_score, processing_score, packaging_score, quality_score, remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [processing_group_id, req.user.user_id, temperature, appearance_score, odour_score, texture_score, size_score, processing_score, packaging_score, quality_score, remarks]);
    const [[insp]] = await pool.query('SELECT * FROM quality_inspections WHERE inspection_id = ?', [r.insertId]);
    res.status(201).json(insp);
  } catch (e) { next(e); }
}
async function getInspection(req, res, next) {
  try {
    const [[insp]] = await pool.query('SELECT qi.*, pg.processing_group_code FROM quality_inspections qi JOIN processing_groups pg ON pg.processing_group_id = qi.processing_group_id WHERE qi.inspection_id = ?', [req.params.id]);
    if (!insp) throw httpError(404, 'Inspection not found.');
    const [results] = await pool.query('SELECT * FROM quality_results WHERE inspection_id = ?', [req.params.id]);
    res.json({ ...insp, results });
  } catch (e) { next(e); }
}
// POST /:id/results — accept splits, compute weighted score, create quality_results + inventory_groups + decomposition + storage_history.
async function addResults(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { splits } = req.body;
    if (!Array.isArray(splits) || !splits.length) throw httpError(400, 'splits array is required: [{quantity, appearance, odour, texture, size, processing, packaging, temperature}].');
    await conn.beginTransaction();
    const [[insp]] = await conn.query('SELECT * FROM quality_inspections WHERE inspection_id = ? FOR UPDATE', [req.params.id]);
    if (!insp) throw httpError(404, 'Inspection not found.');
    const [[pg]] = await conn.query('SELECT * FROM processing_groups WHERE processing_group_id = ? FOR UPDATE', [insp.processing_group_id]);
    const total = splits.reduce((s, x) => s + Number(x.quantity), 0);
    if (Math.abs(total - Number(pg.quantity)) > 0.001) {
      throw httpError(400, `Split quantities (${total} kg) must equal Processing Group quantity (${pg.quantity} kg).`);
    }
    const [existing] = await conn.query('SELECT COALESCE(SUM(quantity),0) AS done FROM quality_results WHERE inspection_id = ?', [req.params.id]);
    if (Number(existing[0].done) > 0) throw httpError(400, 'Results already recorded for this inspection.');
    const [[store]] = await conn.query("SELECT * FROM storage_locations WHERE status = 'ACTIVE' ORDER BY storage_id LIMIT 1");

    const created = [];
    for (const s of splits) {
      const qty = Number(s.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw httpError(400, 'Each split quantity must be greater than 0.');
      const score = computeScore({ appearance: s.appearance, odour: s.odour, texture: s.texture, size: s.size, processing: s.processing, packaging: s.packaging, temperature: s.temperature });
      const result = resultFor(score);
      const [qr] = await conn.query('INSERT INTO quality_results (inspection_id, quantity, quality_score, result, remarks) VALUES (?,?,?,?,?)',
        [req.params.id, qty, score, result, s.remarks || null]);
      const status = result === 'USABLE' ? 'AVAILABLE' : 'NON_USABLE';
      const [ig] = await conn.query(
        'INSERT INTO inventory_groups (processing_group_id, quality_result_id, inventory_group_code, species, quantity, quality_score, reserved_quantity, consumed_quantity, available_quantity, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [pg.processing_group_id, qr.insertId, igCode(), pg.species, qty, score, 0, 0, result === 'USABLE' ? qty : 0, status]);
      if (result === 'NON_USABLE') {
        await conn.query('INSERT INTO decomposition_records (inventory_group_id, quantity, reason, action, processed_by, remarks) VALUES (?,?,?,?,?,?)',
          [ig.insertId, qty, `Quality score ${score} below usable threshold`, 'DECOMPOSITION', req.user.user_id, s.remarks || null]);
      } else if (store) {
        await conn.query('INSERT INTO storage_history (inventory_group_id, storage_id, quantity, temperature) VALUES (?,?,?,?)',
          [ig.insertId, store.storage_id, qty, store.temperature]);
        await conn.query('UPDATE storage_locations SET current_occupancy = current_occupancy + ? WHERE storage_id = ?', [qty, store.storage_id]);
      }
      created.push({ quality_result_id: qr.insertId, inventory_group_id: ig.insertId, quantity: qty, quality_score: score, result });
    }
    await conn.query("UPDATE processing_groups SET status = 'INSPECTED' WHERE processing_group_id = ?", [pg.processing_group_id]);
    await conn.commit();
    await auditLog({ user_id: req.user.user_id, action: 'QUALITY_INSPECTION_COMPLETED', entity_type: 'quality_inspections', entity_id: req.params.id, new_value: { splits: created.length }, ip_address: req.ip });
    res.status(201).json(created);
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
}
module.exports = { pending, createInspection, getInspection, addResults };
