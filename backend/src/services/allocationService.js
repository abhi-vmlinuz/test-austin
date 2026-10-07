const { httpError } = require('../middleware/errorHandler');
const { exportCode } = require('../utils/codes');
const { qrDataUrl, traceUrl } = require('../utils/qr');

async function getOrder(pool, orderId) {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
  if (!order) throw httpError(404, 'Order not found.');
  const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return { ...order, items };
}

async function checkShipping(pool, species, method, destination) {
  const [rules] = await pool.query(
    'SELECT * FROM shipping_rules WHERE shipping_method = ? AND (species IS NULL OR species = ?) AND (destination_country IS NULL OR destination_country = ?)',
    [method, species, destination]
  );
  const blocked = rules.find((r) => Number(r.allowed) === 0);
  return { ok: !blocked, rule: blocked || null };
}

// Validate availability + quality + shipping rule without mutating.
async function validateOrder(pool, orderId) {
  const order = await getOrder(pool, orderId);
  if (order.status === 'REJECTED') throw httpError(400, 'Rejected orders cannot be validated or allocated.');
  if (order.status === 'CANCELLED') throw httpError(400, 'Cancelled orders cannot be validated or allocated.');
  const details = [];
  let ok = true;
  for (const item of order.items) {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(available_quantity),0) AS avail FROM inventory_groups
       WHERE species = ? AND quality_score >= ? AND status IN ('AVAILABLE','PARTIALLY_RESERVED') AND available_quantity > 0`,
      [item.species, item.minimum_quality_score]
    );
    const avail = Number(rows[0].avail);
    const ship = await checkShipping(pool, item.species, order.shipping_method, order.destination_country);
    const shortage = Math.max(0, Number(item.required_quantity) - avail);
    if (shortage > 0 || !ship.ok) ok = false;
    details.push({ order_item_id: item.order_item_id, species: item.species, required: Number(item.required_quantity), available: avail, shortage, shipping_ok: ship.ok, blocked_rule: ship.rule });
  }
  return { ok, order_id: orderId, details };
}

// FIFO smart allocation in one transaction; creates export_groups + items.
async function allocateOrder(pool, orderId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query('SELECT * FROM orders WHERE order_id = ? FOR UPDATE', [orderId]);
    if (!order) throw httpError(404, 'Order not found.');
    if (order.status === 'REJECTED') throw httpError(400, 'Rejected orders cannot create Export Groups.');
    if (order.status === 'CANCELLED') throw httpError(400, 'Cancelled orders cannot be allocated.');
    if (['ALLOCATED', 'PACKED', 'SHIPPED', 'COMPLETED'].includes(order.status)) throw httpError(400, 'Order is already allocated.');
    const [items] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    if (!items.length) throw httpError(400, 'Order has no items to allocate.');

    const allocations = [];
    for (const item of items) {
      const ship = await checkShipping(conn, item.species, order.shipping_method, order.destination_country);
      if (!ship.ok) throw httpError(400, `Shipping ${order.shipping_method} to ${order.destination_country} is not allowed for ${item.species}.`);
      const [groups] = await conn.query(
        `SELECT * FROM inventory_groups WHERE species = ? AND quality_score >= ?
         AND status IN ('AVAILABLE','PARTIALLY_RESERVED') AND available_quantity > 0
         ORDER BY created_at ASC FOR UPDATE`, [item.species, item.minimum_quality_score]
      );
      let need = Number(item.required_quantity);
      const avail = groups.reduce((s, g) => s + Number(g.available_quantity), 0);
      if (avail < need) {
        throw httpError(400, `Insufficient inventory. Requested: ${need} kg ${item.species}. Available suitable inventory: ${avail} kg. Shortage: ${need - avail} kg.`);
      }
      for (const g of groups) {
        if (need <= 0.001) break;
        const take = Math.min(Number(g.available_quantity), need);
        const newReserved = Number(g.reserved_quantity) + take;
        const newAvail = Number(g.quantity) - newReserved - Number(g.consumed_quantity);
        const status = newAvail <= 0.001 ? 'RESERVED' : 'PARTIALLY_RESERVED';
        await conn.query('UPDATE inventory_groups SET reserved_quantity = ?, available_quantity = ?, status = ? WHERE inventory_group_id = ?',
          [newReserved, Math.max(0, newAvail), status, g.inventory_group_id]);
        await conn.query('INSERT INTO inventory_allocations (order_id, order_item_id, inventory_group_id, allocated_quantity) VALUES (?,?,?,?)',
          [orderId, item.order_item_id, g.inventory_group_id, take]);
        allocations.push({ order_item_id: item.order_item_id, inventory_group_id: g.inventory_group_id, quantity: take });
        need -= take;
      }
    }

    const total = allocations.reduce((s, a) => s + a.quantity, 0);
    const code = exportCode();
    const qr = await qrDataUrl(traceUrl(code));
    const [eg] = await conn.query(
      'INSERT INTO export_groups (order_id, export_group_code, total_quantity, status, qr_code) VALUES (?,?,?,?,?)',
      [orderId, code, total, 'CREATED', qr]
    );
    const exportGroupId = eg.insertId;
    for (const a of allocations) {
      await conn.query('INSERT INTO export_group_items (export_group_id, inventory_group_id, quantity) VALUES (?,?,?)',
        [exportGroupId, a.inventory_group_id, a.quantity]);
    }
    await conn.query("UPDATE orders SET status = 'ALLOCATED' WHERE order_id = ?", [orderId]);
    await conn.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value) VALUES (?,?,?,?,?)',
      [userId || null, 'EXPORT_GROUP_CREATED', 'export_groups', String(exportGroupId), JSON.stringify({ order_id: orderId, total })]
    );
    await conn.commit();
    const [[exportGroup]] = await conn.query('SELECT * FROM export_groups WHERE export_group_id = ?', [exportGroupId]);
    return { exportGroup, allocations };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Release reservations on cancel.
async function releaseOrder(pool, orderId, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [allocs] = await conn.query('SELECT * FROM inventory_allocations WHERE order_id = ?', [orderId]);
    for (const a of allocs) {
      const [[g]] = await conn.query('SELECT * FROM inventory_groups WHERE inventory_group_id = ? FOR UPDATE', [a.inventory_group_id]);
      if (g) {
        const newReserved = Math.max(0, Number(g.reserved_quantity) - Number(a.allocated_quantity));
        const newAvail = Number(g.quantity) - newReserved - Number(g.consumed_quantity);
        const status = g.status === 'NON_USABLE' ? 'NON_USABLE' : (newReserved <= 0 ? 'AVAILABLE' : 'PARTIALLY_RESERVED');
        await conn.query('UPDATE inventory_groups SET reserved_quantity = ?, available_quantity = ?, status = ? WHERE inventory_group_id = ?',
          [newReserved, Math.max(0, newAvail), status, g.inventory_group_id]);
      }
    }
    await conn.query('DELETE FROM inventory_allocations WHERE order_id = ?', [orderId]);
    await conn.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?,?,?,?)',
      [userId || null, 'INVENTORY_RELEASED', 'orders', String(orderId)]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { getOrder, validateOrder, allocateOrder, releaseOrder, checkShipping };
