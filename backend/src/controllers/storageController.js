const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');

async function list(_req, res, next) {
  try { const [r] = await pool.query('SELECT * FROM storage_locations ORDER BY freezer_code'); res.json(r); } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    const { facility_name, freezer_code, temperature = null, capacity = null } = req.body;
    if (!facility_name || !freezer_code) throw httpError(400, 'facility_name and freezer_code are required.');
    const [r] = await pool.query('INSERT INTO storage_locations (facility_name, freezer_code, temperature, capacity) VALUES (?,?,?,?)',
      [facility_name, freezer_code, temperature, capacity]);
    await auditLog({ user_id: req.user.user_id, action: 'STORAGE_CREATED', entity_type: 'storage_locations', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
    const [[s]] = await pool.query('SELECT * FROM storage_locations WHERE storage_id = ?', [r.insertId]);
    res.status(201).json(s);
  } catch (e) { next(e); }
}
// POST /api/storage/move — close old entry (exit_time), open new entry. Never delete history.
async function move(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { inventory_group_id, to_storage_id, quantity, temperature = null, remarks = null } = req.body;
    if (!inventory_group_id || !to_storage_id || !quantity) throw httpError(400, 'inventory_group_id, to_storage_id and quantity are required.');
    await conn.beginTransaction();
    await conn.query('UPDATE storage_history SET exit_time = NOW() WHERE inventory_group_id = ? AND exit_time IS NULL', [inventory_group_id]);
    await conn.query('INSERT INTO storage_history (inventory_group_id, storage_id, quantity, temperature, remarks) VALUES (?,?,?,?,?)',
      [inventory_group_id, to_storage_id, quantity, temperature, remarks]);
    await conn.commit();
    await auditLog({ user_id: req.user.user_id, action: 'STORAGE_MOVED', entity_type: 'inventory_groups', entity_id: inventory_group_id, new_value: req.body, ip_address: req.ip });
    res.status(201).json({ message: 'Inventory moved. History preserved.' });
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
}
async function history(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT sh.*, sl.facility_name, sl.freezer_code FROM storage_history sh LEFT JOIN storage_locations sl ON sl.storage_id = sh.storage_id WHERE sh.inventory_group_id = ? ORDER BY sh.entry_time ASC',
      [req.params.inventoryGroupId]);
    res.json(rows);
  } catch (e) { next(e); }
}
module.exports = { list, create, move, history };
