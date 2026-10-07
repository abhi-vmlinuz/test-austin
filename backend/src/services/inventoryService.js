function statusFor(quantity, reserved, consumed) {
  if (reserved <= 0 && consumed <= 0) return 'AVAILABLE';
  if (quantity - reserved - consumed <= 0.001) return 'RESERVED';
  return 'PARTIALLY_RESERVED';
}

async function availableGroups(connOrPool, { species, minScore = 0 } = {}) {
  const where = ['ig.status IN (\'AVAILABLE\',\'PARTIALLY_RESERVED\')', 'ig.available_quantity > 0'];
  const params = [];
  if (species) { where.push('ig.species = ?'); params.push(species); }
  if (minScore) { where.push('ig.quality_score >= ?'); params.push(minScore); }
  const [rows] = await connOrPool.query(
    `SELECT ig.* FROM inventory_groups ig WHERE ${where.join(' AND ')} ORDER BY ig.created_at ASC`, params
  );
  return rows;
}

module.exports = { statusFor, availableGroups };
