const { httpError } = require('../middleware/errorHandler');

function requireFields(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw httpError(400, `Field '${f}' is required.`);
    }
  }
}
function positiveQty(v, name = 'Quantity') {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw httpError(400, `${name} must be greater than 0.`);
  return n;
}
const ORDER_FLOW = ['PLACED', 'ACCEPTED', 'ALLOCATED', 'PACKED', 'SHIPPED', 'COMPLETED'];
const SHIP_FLOW = ['READY', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];

module.exports = { requireFields, positiveQty, ORDER_FLOW, SHIP_FLOW };
