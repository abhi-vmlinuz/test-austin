const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { pkgCode } = require('../utils/codes');
const { qrDataUrl, traceUrl } = require('../utils/qr');

async function list(_req, res, next) {
  try {
    const [rows] = await pool.query('SELECT eg.*, o.order_code FROM export_groups eg LEFT JOIN orders o ON o.order_id = eg.order_id ORDER BY eg.created_at DESC');
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    // Manual creation (allocation flow creates groups automatically). Enforce Rule 15.
    const { order_id = null, species = null, items } = req.body;
    if (!Array.isArray(items) || !items.length) throw httpError(400, 'items required: [{inventory_group_id, quantity}].');
    const total = items.reduce((s, i) => s + Number(i.quantity), 0);
    if (total <= 0) throw httpError(400, 'Total quantity must be greater than 0.');
    const { exportCode } = require('../utils/codes');
    const code = exportCode();
    const qr = await qrDataUrl(traceUrl(code));
    const [r] = await pool.query('INSERT INTO export_groups (order_id, export_group_code, species, total_quantity, status, qr_code) VALUES (?,?,?,?,?,?)',
      [order_id, code, species, total, 'CREATED', qr]);
    for (const i of items) {
      await pool.query('INSERT INTO export_group_items (export_group_id, inventory_group_id, quantity) VALUES (?,?,?)', [r.insertId, i.inventory_group_id, i.quantity]);
    }
    await auditLog({ user_id: req.user.user_id, action: 'EXPORT_GROUP_CREATED', entity_type: 'export_groups', entity_id: r.insertId, new_value: { code, total }, ip_address: req.ip });
    const [[eg]] = await pool.query('SELECT * FROM export_groups WHERE export_group_id = ?', [r.insertId]);
    res.status(201).json(eg);
  } catch (e) { next(e); }
}
async function get(req, res, next) {
  try {
    const [[eg]] = await pool.query('SELECT eg.*, o.order_code FROM export_groups eg LEFT JOIN orders o ON o.order_id = eg.order_id WHERE eg.export_group_id = ? OR eg.export_group_code = ?', [req.params.id, req.params.id]);
    if (!eg) throw httpError(404, 'Export Group not found.');
    const [items] = await pool.query('SELECT egi.*, ig.inventory_group_code, ig.quality_score FROM export_group_items egi JOIN inventory_groups ig ON ig.inventory_group_id = egi.inventory_group_id WHERE egi.export_group_id = ?', [eg.export_group_id]);
    const [packages] = await pool.query('SELECT * FROM packages WHERE export_group_id = ?', [eg.export_group_id]);
    res.json({ ...eg, items, packages });
  } catch (e) { next(e); }
}
async function listPackages(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM packages WHERE export_group_id = ?', [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
}
// Rule 16: package total must equal export group quantity.
async function createPackages(req, res, next) {
  try {
    const { packages } = req.body;
    if (!Array.isArray(packages) || !packages.length) throw httpError(400, 'packages required: [{weight}].');
    const [[eg]] = await pool.query('SELECT * FROM export_groups WHERE export_group_id = ?', [req.params.id]);
    if (!eg) throw httpError(404, 'Export Group not found.');
    const [[row]] = await pool.query('SELECT COALESCE(SUM(weight),0) AS packed FROM packages WHERE export_group_id = ?', [req.params.id]);
    const newTotal = Number(row.packed) + packages.reduce((s, p) => s + Number(p.weight), 0);
    if (Math.abs(newTotal - Number(eg.total_quantity)) > 0.001) {
      throw httpError(400, `Package total (${newTotal} kg) must equal Export Group quantity (${eg.total_quantity} kg). Already packed: ${row.packed} kg.`);
    }
    const created = [];
    for (const p of packages) {
      if (Number(p.weight) <= 0) throw httpError(400, 'Package weight must be greater than 0.');
      const code = pkgCode();
      const qr = await qrDataUrl(traceUrl(code));
      const [r] = await pool.query('INSERT INTO packages (export_group_id, package_number, weight, qr_code, status) VALUES (?,?,?,?,?)',
        [req.params.id, code, p.weight, qr, 'PACKED']);
      created.push({ package_id: r.insertId, package_number: code, weight: p.weight });
    }
    await pool.query("UPDATE export_groups SET status = 'PACKED' WHERE export_group_id = ?", [req.params.id]);
    await auditLog({ user_id: req.user.user_id, action: 'PACKAGE_CREATED', entity_type: 'export_groups', entity_id: req.params.id, new_value: { count: created.length }, ip_address: req.ip });
    res.status(201).json(created);
  } catch (e) { next(e); }
}
async function updatePackage(req, res, next) {
  try {
    const [[p]] = await pool.query('SELECT * FROM packages WHERE package_id = ?', [req.params.id]);
    if (!p) throw httpError(404, 'Package not found.');
    const { status } = req.body;
    await pool.query('UPDATE packages SET status = COALESCE(?, status) WHERE package_id = ?', [status || null, req.params.id]);
    const [[u]] = await pool.query('SELECT * FROM packages WHERE package_id = ?', [req.params.id]);
    res.json(u);
  } catch (e) { next(e); }
}
module.exports = { list, create, get, listPackages, createPackages, updatePackage };
