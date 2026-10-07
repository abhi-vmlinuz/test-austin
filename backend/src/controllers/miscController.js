const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');

async function list(_req, res, next) {
  try { const [r] = await pool.query('SELECT * FROM shipping_rules ORDER BY shipping_rule_id DESC'); res.json(r); } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    const { species = null, shipping_method, destination_country = null, allowed = true, minimum_temperature = null, maximum_temperature = null, handling_requirement = null, remarks = null } = req.body;
    if (!shipping_method) throw httpError(400, 'shipping_method is required.');
    const [r] = await pool.query(
      'INSERT INTO shipping_rules (species, shipping_method, destination_country, allowed, minimum_temperature, maximum_temperature, handling_requirement, remarks) VALUES (?,?,?,?,?,?,?,?)',
      [species, shipping_method, destination_country, allowed ? 1 : 0, minimum_temperature, maximum_temperature, handling_requirement, remarks]);
    await auditLog({ user_id: req.user.user_id, action: 'SHIPPING_RULE_CREATED', entity_type: 'shipping_rules', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
    const [[rule]] = await pool.query('SELECT * FROM shipping_rules WHERE shipping_rule_id = ?', [r.insertId]);
    res.status(201).json(rule);
  } catch (e) { next(e); }
}
async function update(req, res, next) {
  try {
    const [[old]] = await pool.query('SELECT * FROM shipping_rules WHERE shipping_rule_id = ?', [req.params.id]);
    if (!old) throw httpError(404, 'Shipping rule not found.');
    const b = req.body;
    await pool.query(
      'UPDATE shipping_rules SET species = COALESCE(?, species), shipping_method = COALESCE(?, shipping_method), destination_country = COALESCE(?, destination_country), allowed = COALESCE(?, allowed), handling_requirement = COALESCE(?, handling_requirement), remarks = COALESCE(?, remarks) WHERE shipping_rule_id = ?',
      [b.species || null, b.shipping_method || null, b.destination_country || null, b.allowed === undefined ? null : (b.allowed ? 1 : 0), b.handling_requirement !== undefined ? b.handling_requirement : null, b.remarks !== undefined ? b.remarks : null, req.params.id]);
    const [[rule]] = await pool.query('SELECT * FROM shipping_rules WHERE shipping_rule_id = ?', [req.params.id]);
    res.json(rule);
  } catch (e) { next(e); }
}
async function remove(req, res, next) {
  try {
    await pool.query('DELETE FROM shipping_rules WHERE shipping_rule_id = ?', [req.params.id]);
    await auditLog({ user_id: req.user.user_id, action: 'SHIPPING_RULE_DELETED', entity_type: 'shipping_rules', entity_id: req.params.id, ip_address: req.ip });
    res.json({ message: 'Shipping rule deleted.' });
  } catch (e) { next(e); }
}
// Documents (multer)
async function listDocs(req, res, next) {
  try {
    const { export_group_id } = req.query;
    const [rows] = await pool.query(
      `SELECT d.*, eg.export_group_code FROM export_documents d LEFT JOIN export_groups eg ON eg.export_group_id = d.export_group_id
       ${export_group_id ? 'WHERE d.export_group_id = ?' : ''} ORDER BY d.uploaded_at DESC`,
      export_group_id ? [export_group_id] : []);
    res.json(rows);
  } catch (e) { next(e); }
}
async function uploadDoc(req, res, next) {
  try {
    if (!req.file) throw httpError(400, 'File is required.');
    const { export_group_id = null, document_type = 'Other', document_number = null } = req.body;
    const [r] = await pool.query(
      'INSERT INTO export_documents (export_group_id, document_type, document_number, document_path, original_filename, status, uploaded_by) VALUES (?,?,?,?,?,?,?)',
      [export_group_id, document_type, document_number, req.file.path, req.file.originalname, 'UPLOADED', req.user.user_id]);
    await auditLog({ user_id: req.user.user_id, action: 'DOCUMENT_UPLOADED', entity_type: 'export_documents', entity_id: r.insertId, new_value: { file: req.file.originalname }, ip_address: req.ip });
    const [[d]] = await pool.query('SELECT * FROM export_documents WHERE document_id = ?', [r.insertId]);
    res.status(201).json(d);
  } catch (e) { next(e); }
}
// Audit logs
async function auditLogs(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.user_id = a.user_id ORDER BY a.`timestamp` DESC LIMIT 200');
    res.json(rows);
  } catch (e) { next(e); }
}
// Notifications derived from pending counts per role.
async function notifications(req, res, next) {
  try {
    const role = req.user.role;
    const items = [];
    const count = async (sql, p = []) => (await pool.query(sql, p))[0][0].c;
    if (['ADMIN', 'QUALITY_INSPECTOR'].includes(role)) {
      const c = await count("SELECT COUNT(*) AS c FROM processing_groups WHERE status = 'WAITING_FOR_QUALITY'");
      if (c) items.push({ type: 'QA_PENDING', message: `${c} Processing Group(s) waiting for inspection.` });
    }
    if (['ADMIN', 'EXPORTER'].includes(role)) {
      const c = await count("SELECT COUNT(*) AS c FROM orders WHERE status = 'PLACED'");
      if (c) items.push({ type: 'ORDER_NEW', message: `New importer order received (${c} placed).` });
    }
    if (['ADMIN', 'PROCESSOR'].includes(role)) {
      const c = await count("SELECT COUNT(*) AS c FROM orders WHERE status = 'ACCEPTED'");
      if (c) items.push({ type: 'PACK_PREP', message: `New order requires inventory preparation (${c} accepted).` });
    }
    if (role === 'IMPORTER') {
      const [mine] = await pool.query('SELECT order_code, status FROM orders WHERE importer_id = ? ORDER BY created_at DESC LIMIT 5', [req.user.user_id]);
      mine.forEach((o) => items.push({ type: 'ORDER_STATUS', message: `Order ${o.order_code}: ${o.status}.` }));
    }
    if (['ADMIN', 'EXPORTER', 'IMPORTER'].includes(role)) {
      const c = await count("SELECT COUNT(*) AS c FROM shipments WHERE status = 'IN_TRANSIT'");
      if (c) items.push({ type: 'SHIPMENT_TRANSIT', message: `${c} shipment(s) now in transit.` });
    }
    res.json(items);
  } catch (e) { next(e); }
}
// Role dashboards
async function roleDashboard(req, res, next) {
  try {
    const role = (req.params.role || req.user.role).toUpperCase();
    const count = async (sql, p = []) => (await pool.query(sql, p))[0][0].c;
    const sum = async (sql, p = []) => Number((await pool.query(sql, p))[0][0].s || 0);
    const cards = {};
    cards.rawBatches = await count('SELECT COUNT(*) AS c FROM raw_batches');
    cards.processing = await count("SELECT COUNT(*) AS c FROM processing_records WHERE status = 'IN_PROGRESS'");
    cards.pendingInspections = await count("SELECT COUNT(*) AS c FROM processing_groups WHERE status = 'WAITING_FOR_QUALITY'");
    cards.availableInventory = await sum("SELECT SUM(available_quantity) AS s FROM inventory_groups WHERE status IN ('AVAILABLE','PARTIALLY_RESERVED')");
    cards.pendingOrders = await count("SELECT COUNT(*) AS c FROM orders WHERE status = 'PLACED'");
    cards.exportGroups = await count('SELECT COUNT(*) AS c FROM export_groups');
    cards.inTransit = await count("SELECT COUNT(*) AS c FROM shipments WHERE status = 'IN_TRANSIT'");
    if (role === 'IMPORTER') {
      cards.myOrders = await count('SELECT COUNT(*) AS c FROM orders WHERE importer_id = ?', [req.user.user_id]);
    }
    res.json({ role, cards });
  } catch (e) { next(e); }
}
module.exports = { list, create, update, remove, listDocs, uploadDoc, auditLogs, notifications, roleDashboard };
