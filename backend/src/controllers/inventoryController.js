const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');

async function list(req, res, next) {
  try {
    const { species, status, minScore, q } = req.query;
    const where = []; const p = [];
    if (species) { where.push('ig.species = ?'); p.push(species); }
    if (status) { where.push('ig.status = ?'); p.push(status); }
    if (minScore) { where.push('ig.quality_score >= ?'); p.push(minScore); }
    if (q) { where.push('(ig.inventory_group_code LIKE ? OR ig.species LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT ig.*, pg.processing_group_code FROM inventory_groups ig JOIN processing_groups pg ON pg.processing_group_id = ig.processing_group_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ig.created_at DESC`, p);
    res.json(rows);
  } catch (e) { next(e); }
}
async function available(req, res, next) {
  try {
    const { species, minScore = 0 } = req.query;
    const where = ["ig.status IN ('AVAILABLE','PARTIALLY_RESERVED')", 'ig.available_quantity > 0'];
    const p = [];
    if (species) { where.push('ig.species = ?'); p.push(species); }
    if (Number(minScore)) { where.push('ig.quality_score >= ?'); p.push(Number(minScore)); }
    const [rows] = await pool.query(`SELECT * FROM inventory_groups ig WHERE ${where.join(' AND ')} ORDER BY ig.created_at ASC`, p);
    res.json(rows);
  } catch (e) { next(e); }
}
async function get(req, res, next) {
  try {
    const [[ig]] = await pool.query('SELECT * FROM inventory_groups WHERE inventory_group_id = ? OR inventory_group_code = ?', [req.params.id, req.params.id]);
    if (!ig) throw httpError(404, 'Inventory Group not found.');
    const [allocs] = await pool.query('SELECT * FROM inventory_allocations WHERE inventory_group_id = ?', [ig.inventory_group_id]);
    res.json({ ...ig, allocations: allocs });
  } catch (e) { next(e); }
}
async function history(req, res, next) {
  try {
    const [[ig]] = await pool.query('SELECT * FROM inventory_groups WHERE inventory_group_id = ? OR inventory_group_code = ?', [req.params.id, req.params.id]);
    if (!ig) throw httpError(404, 'Inventory Group not found.');
    const [storage] = await pool.query(
      'SELECT sh.*, sl.facility_name, sl.freezer_code FROM storage_history sh LEFT JOIN storage_locations sl ON sl.storage_id = sh.storage_id WHERE sh.inventory_group_id = ? ORDER BY sh.entry_time ASC', [ig.inventory_group_id]);
    const [allocs] = await pool.query('SELECT ia.*, o.order_code FROM inventory_allocations ia JOIN orders o ON o.order_id = ia.order_id WHERE ia.inventory_group_id = ?', [ig.inventory_group_id]);
    const [decomp] = await pool.query('SELECT * FROM decomposition_records WHERE inventory_group_id = ?', [ig.inventory_group_id]);
    res.json({ inventoryGroup: ig, storageHistory: storage, allocations: allocs, decomposition: decomp });
  } catch (e) { next(e); }
}
module.exports = { list, available, get, history };
