const { httpError } = require('../middleware/errorHandler');

async function getExportGroup(pool, idOrCode) {
  const [[eg]] = await pool.query(
    'SELECT eg.*, o.order_code, o.destination_country, o.shipping_method, o.status AS order_status FROM export_groups eg LEFT JOIN orders o ON o.order_id = eg.order_id WHERE eg.export_group_id = ? OR eg.export_group_code = ?',
    [idOrCode, idOrCode]
  );
  if (!eg) throw httpError(404, 'Export Group not found.');
  return eg;
}

async function fullTrace(pool, exportGroupCode) {
  const [[eg]] = await pool.query(
    'SELECT eg.*, o.order_code, o.destination_country, o.shipping_method, o.importer_id FROM export_groups eg LEFT JOIN orders o ON o.order_id = eg.order_id WHERE eg.export_group_code = ?',
    [exportGroupCode]
  );
  if (!eg) throw httpError(404, 'Export Group not found.');
  const [items] = await pool.query('SELECT egi.*, ig.inventory_group_code, ig.species, ig.quality_score FROM export_group_items egi JOIN inventory_groups ig ON ig.inventory_group_id = egi.inventory_group_id WHERE egi.export_group_id = ?', [eg.export_group_id]);
  const sources = [];
  for (const it of items) {
    const [[ig]] = await pool.query('SELECT * FROM inventory_groups WHERE inventory_group_id = ?', [it.inventory_group_id]);
    const [[qr]] = await pool.query('SELECT qr.*, qi.inspection_id, qi.processing_group_id, qi.inspector_id, qi.inspection_date, qi.temperature FROM quality_results qr JOIN quality_inspections qi ON qi.inspection_id = qr.inspection_id WHERE qr.quality_result_id = ?', [ig.quality_result_id]);
    const [[pg]] = await pool.query('SELECT * FROM processing_groups WHERE processing_group_id = ?', [ig.processing_group_id]);
    const [[pr]] = await pool.query('SELECT * FROM processing_records WHERE processing_id = ?', [pg.processing_id]);
    const [[rb]] = await pool.query(
      `SELECT rb.*, v.vessel_name, h.harbour_name FROM raw_batches rb
       LEFT JOIN vessels v ON v.vessel_id = rb.vessel_id LEFT JOIN harbours h ON h.harbour_id = rb.harbour_id WHERE rb.raw_batch_id = ?`,
      [pr.raw_batch_id]
    );
    const [storage] = await pool.query(
      'SELECT sh.*, sl.facility_name, sl.freezer_code FROM storage_history sh LEFT JOIN storage_locations sl ON sl.storage_id = sh.storage_id WHERE sh.inventory_group_id = ? ORDER BY sh.entry_time ASC',
      [ig.inventory_group_id]
    );
    sources.push({ inventoryGroup: ig, allocatedQuantity: Number(it.quantity), qualityResult: qr || null, processingGroup: pg, processingRecord: pr, rawBatch: rb, storageHistory: storage });
  }
  const [packages] = await pool.query('SELECT * FROM packages WHERE export_group_id = ?', [eg.export_group_id]);
  const [shipments] = await pool.query('SELECT * FROM shipments WHERE export_group_id = ?', [eg.export_group_id]);
  const [documents] = await pool.query('SELECT document_id, document_type, document_number, status, uploaded_at FROM export_documents WHERE export_group_id = ?', [eg.export_group_id]);
  return { exportGroup: eg, sources, packages, shipments, documents };
}

async function forwardTrace(pool, rawBatchId) {
  const [[rb]] = await pool.query('SELECT * FROM raw_batches WHERE raw_batch_id = ? OR batch_code = ?', [rawBatchId, rawBatchId]);
  if (!rb) throw httpError(404, 'Raw Batch not found.');
  const [processing] = await pool.query('SELECT * FROM processing_records WHERE raw_batch_id = ?', [rb.raw_batch_id]);
  const pIds = processing.map((p) => p.processing_id);
  let groups = [];
  if (pIds.length) {
    const [g] = await pool.query(`SELECT * FROM processing_groups WHERE processing_id IN (${pIds.map(() => '?').join(',')})`, pIds);
    groups = g;
  }
  const gIds = groups.map((g) => g.processing_group_id);
  let inventory = [];
  if (gIds.length) {
    const [ig] = await pool.query(`SELECT * FROM inventory_groups WHERE processing_group_id IN (${gIds.map(() => '?').join(',')})`, gIds);
    inventory = ig;
  }
  const igIds = inventory.map((g) => g.inventory_group_id);
  let exports_ = [];
  if (igIds.length) {
    const [egi] = await pool.query(`SELECT egi.*, eg.export_group_code FROM export_group_items egi JOIN export_groups eg ON eg.export_group_id = egi.export_group_id WHERE egi.inventory_group_id IN (${igIds.map(() => '?').join(',')})`, igIds);
    exports_ = egi;
  }
  return { rawBatch: rb, processing, processingGroups: groups, inventoryGroups: inventory, exportItems: exports_ };
}

async function search(pool, q) {
  const like = `%${q}%`;
  const [raw] = await pool.query('SELECT raw_batch_id AS id, batch_code AS code, species, status FROM raw_batches WHERE batch_code LIKE ? LIMIT 10', [like]);
  const [pg] = await pool.query('SELECT processing_group_id AS id, processing_group_code AS code, species, status FROM processing_groups WHERE processing_group_code LIKE ? LIMIT 10', [like]);
  const [ig] = await pool.query('SELECT inventory_group_id AS id, inventory_group_code AS code, species, status FROM inventory_groups WHERE inventory_group_code LIKE ? LIMIT 10', [like]);
  const [eg] = await pool.query('SELECT export_group_id AS id, export_group_code AS code, total_quantity, status FROM export_groups WHERE export_group_code LIKE ? LIMIT 10', [like]);
  const [pkg] = await pool.query('SELECT package_id AS id, package_number AS code, weight, status FROM packages WHERE package_number LIKE ? LIMIT 10', [like]);
  return [
    ...raw.map((r) => ({ type: 'RAW_BATCH', ...r })),
    ...pg.map((r) => ({ type: 'PROCESSING_GROUP', ...r })),
    ...ig.map((r) => ({ type: 'INVENTORY_GROUP', ...r })),
    ...eg.map((r) => ({ type: 'EXPORT_GROUP', ...r })),
    ...pkg.map((r) => ({ type: 'PACKAGE', ...r })),
  ];
}

module.exports = { getExportGroup, fullTrace, forwardTrace, search };
