const { httpError } = require('../middleware/errorHandler');

async function packingStatus(pool, exportGroupId) {
  const [[eg]] = await pool.query('SELECT * FROM export_groups WHERE export_group_id = ?', [exportGroupId]);
  if (!eg) throw httpError(404, 'Export Group not found.');
  const [[row]] = await pool.query('SELECT COALESCE(SUM(weight),0) AS packed FROM packages WHERE export_group_id = ?', [exportGroupId]);
  const packed = Number(row.packed);
  return { exportGroup: eg, packed, complete: Math.abs(packed - Number(eg.total_quantity)) < 0.001 };
}

function assertDispatchable(packing, shipmentStatus) {
  if (!packing.complete) {
    throw httpError(400, `Shipment cannot be dispatched. Packing is incomplete. Packed: ${packing.packed} kg, Export Group: ${packing.exportGroup.total_quantity} kg.`);
  }
  return true;
}

module.exports = { packingStatus, assertDispatchable };
