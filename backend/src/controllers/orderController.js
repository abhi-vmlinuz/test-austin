const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { orderCode } = require('../utils/codes');
const { getOrder, validateOrder, allocateOrder, releaseOrder } = require('../services/allocationService');

async function list(req, res, next) {
  try {
    const { status, q } = req.query;
    const where = []; const p = [];
    if (req.user.role === 'IMPORTER') { where.push('o.importer_id = ?'); p.push(req.user.user_id); }
    if (status) { where.push('o.status = ?'); p.push(status); }
    if (q) { where.push('o.order_code LIKE ?'); p.push(`%${q}%`); }
    const [rows] = await pool.query(
      `SELECT o.*, u.name AS importer_name FROM orders o LEFT JOIN users u ON u.user_id = o.importer_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY o.created_at DESC`, p);
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { destination_country, destination_address = null, shipping_method, required_date = null, items } = req.body;
    if (!destination_country || !shipping_method) throw httpError(400, 'destination_country and shipping_method are required.');
    if (!['AIR', 'SEA'].includes(shipping_method)) throw httpError(400, 'shipping_method must be AIR or SEA.');
    if (!Array.isArray(items) || !items.length) throw httpError(400, 'Order must include at least one item: [{species, required_quantity, minimum_quality_score}].');
    await conn.beginTransaction();
    const code = orderCode();
    const [o] = await conn.query(
      'INSERT INTO orders (order_code, importer_id, destination_country, destination_address, shipping_method, required_date, status) VALUES (?,?,?,?,?,?,?)',
      [code, req.user.user_id, destination_country, destination_address, shipping_method, required_date, 'PLACED']);
    for (const it of items) {
      if (!it.species || !it.required_quantity) throw httpError(400, 'Each item needs species and required_quantity.');
      if (Number(it.required_quantity) <= 0) throw httpError(400, 'Item quantity must be greater than 0.');
      await conn.query('INSERT INTO order_items (order_id, species, required_quantity, minimum_quality_score) VALUES (?,?,?,?)',
        [o.insertId, it.species, it.required_quantity, it.minimum_quality_score ?? 6]);
    }
    await conn.commit();
    await auditLog({ user_id: req.user.user_id, action: 'ORDER_PLACED', entity_type: 'orders', entity_id: o.insertId, new_value: { code }, ip_address: req.ip });
    const order = await getOrder(pool, o.insertId);
    res.status(201).json(order);
  } catch (e) { await conn.rollback(); next(e); } finally { conn.release(); }
}
async function get(req, res, next) {
  try {
    const order = await getOrder(pool, req.params.id);
    if (req.user.role === 'IMPORTER' && order.importer_id !== req.user.user_id) throw httpError(403, 'Access denied.');
    const [allocs] = await pool.query('SELECT * FROM inventory_allocations WHERE order_id = ?', [req.params.id]);
    const [egs] = await pool.query('SELECT * FROM export_groups WHERE order_id = ?', [req.params.id]);
    res.json({ ...order, allocations: allocs, exportGroups: egs });
  } catch (e) { next(e); }
}
const STATUS_ACTIONS = { ACCEPTED: 'ORDER_ACCEPTED', REJECTED: 'ORDER_REJECTED', CANCELLED: 'ORDER_CANCELLED', PACKED: 'ORDER_PACKED', SHIPPED: 'ORDER_SHIPPED', COMPLETED: 'ORDER_COMPLETED' };
async function setStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!Object.keys(STATUS_ACTIONS).includes(status)) throw httpError(400, `Invalid status. Allowed: ${Object.keys(STATUS_ACTIONS).join(', ')}.`);
    const [[order]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    if (!order) throw httpError(404, 'Order not found.');
    if (req.user.role === 'IMPORTER' && order.importer_id !== req.user.user_id && status !== 'CANCELLED') throw httpError(403, 'Access denied.');
    await pool.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, req.params.id]);
    if (status === 'CANCELLED') await releaseOrder(pool, req.params.id, req.user.user_id);
    await auditLog({ user_id: req.user.user_id, action: STATUS_ACTIONS[status], entity_type: 'orders', entity_id: req.params.id, old_value: { status: order.status }, new_value: { status }, ip_address: req.ip });
    const [[updated]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [req.params.id]);
    res.json(updated);
  } catch (e) { next(e); }
}
async function validate(req, res, next) {
  try { res.json(await validateOrder(pool, req.params.id)); } catch (e) { next(e); }
}
async function allocate(req, res, next) {
  try {
    const { exportGroup, allocations } = await allocateOrder(pool, req.params.id, req.user.user_id);
    res.status(201).json({ message: 'Inventory allocated. Export Group created.', exportGroup, allocations });
  } catch (e) { next(e); }
}
async function allocations(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT ia.*, ig.inventory_group_code, ig.quality_score FROM inventory_allocations ia JOIN inventory_groups ig ON ig.inventory_group_id = ia.inventory_group_id WHERE ia.order_id = ?', [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
}
module.exports = { list, create, get, setStatus, validate, allocate, allocations };
