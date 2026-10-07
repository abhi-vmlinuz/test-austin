const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { packingStatus, assertDispatchable } = require('../services/shipmentService');

async function list(_req, res, next) {
  try {
    const [rows] = await pool.query('SELECT s.*, eg.export_group_code FROM shipments s JOIN export_groups eg ON eg.export_group_id = s.export_group_id ORDER BY s.shipment_id DESC');
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    const { export_group_id, shipping_method, carrier = null, tracking_number = null, container_number = null, origin = null, destination = null, departure_date = null, estimated_arrival = null } = req.body;
    if (!export_group_id || !shipping_method) throw httpError(400, 'export_group_id and shipping_method are required.');
    const [[eg]] = await pool.query('SELECT * FROM export_groups WHERE export_group_id = ?', [export_group_id]);
    if (!eg) throw httpError(404, 'Export Group not found.');
    const [r] = await pool.query(
      'INSERT INTO shipments (export_group_id, shipping_method, carrier, tracking_number, container_number, origin, destination, departure_date, estimated_arrival, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [export_group_id, shipping_method, carrier, tracking_number, container_number, origin, destination, departure_date, estimated_arrival, 'READY']);
    await auditLog({ user_id: req.user.user_id, action: 'SHIPMENT_CREATED', entity_type: 'shipments', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
    const [[s]] = await pool.query('SELECT * FROM shipments WHERE shipment_id = ?', [r.insertId]);
    res.status(201).json(s);
  } catch (e) { next(e); }
}
// Rule 17: cannot dispatch until packed + readiness complete.
async function setStatus(req, res, next) {
  try {
    const { status } = req.body;
    const allowed = ['READY', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) throw httpError(400, `Invalid status. Allowed: ${allowed.join(', ')}.`);
    const [[s]] = await pool.query('SELECT * FROM shipments WHERE shipment_id = ?', [req.params.id]);
    if (!s) throw httpError(404, 'Shipment not found.');
    if (status === 'DISPATCHED') {
      const packing = await packingStatus(pool, s.export_group_id);
      assertDispatchable(packing, status);
    }
    await pool.query('UPDATE shipments SET status = ?, actual_arrival = CASE WHEN ? = \'DELIVERED\' THEN COALESCE(actual_arrival, CURDATE()) ELSE actual_arrival END WHERE shipment_id = ?', [status, status, req.params.id]);
    await auditLog({ user_id: req.user.user_id, action: 'SHIPMENT_STATUS_CHANGED', entity_type: 'shipments', entity_id: req.params.id, old_value: { status: s.status }, new_value: { status }, ip_address: req.ip });
    const [[u]] = await pool.query('SELECT * FROM shipments WHERE shipment_id = ?', [req.params.id]);
    res.json(u);
  } catch (e) { next(e); }
}
module.exports = { list, create, setStatus };
