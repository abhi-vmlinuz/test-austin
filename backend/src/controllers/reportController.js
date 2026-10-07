const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { fullTrace } = require('../services/traceabilityService');

async function exportReport(req, res, next) {
  try {
    const [[eg]] = await pool.query('SELECT export_group_code FROM export_groups WHERE export_group_id = ?', [req.params.exportGroupId]);
    if (!eg) throw httpError(404, 'Export Group not found.');
    const trace = await fullTrace(pool, eg.export_group_code);
    const report = {
      generatedAt: new Date().toISOString(),
      export: { code: trace.exportGroup.export_group_code, quantity: Number(trace.exportGroup.total_quantity), status: trace.exportGroup.status, order: trace.exportGroup.order_code, destination: trace.exportGroup.destination_country, shippingMethod: trace.exportGroup.shipping_method },
      sources: trace.sources.map((s) => ({
        species: s.inventoryGroup.species,
        inventoryGroup: s.inventoryGroup.inventory_group_code,
        quantity: Number(s.inventoryGroup.quantity),
        qualityScore: Number(s.inventoryGroup.quality_score),
        rawBatch: s.rawBatch ? s.rawBatch.batch_code : null,
        vessel: s.rawBatch ? s.rawBatch.vessel_name : null,
        harbour: s.rawBatch ? s.rawBatch.harbour_name : null,
        landingDate: s.rawBatch ? s.rawBatch.landing_date : null,
        processingGroup: s.processingGroup.processing_group_code,
        processingType: s.processingRecord.processing_type,
        input: Number(s.processingRecord.input_quantity),
        output: Number(s.processingRecord.output_quantity),
        waste: Number(s.processingRecord.waste_quantity),
        inspection: s.qualityResult ? { score: Number(s.qualityResult.quality_score), result: s.qualityResult.result, temperature: s.qualityResult.temperature } : null,
        storage: s.storageHistory.map((h) => ({ freezer: h.freezer_code, facility: h.facility_name, entry: h.entry_time, exit: h.exit_time, temperature: h.temperature })),
      })),
      packages: trace.packages,
      shipments: trace.shipments,
      documents: trace.documents,
    };
    res.json(report);
  } catch (e) { next(e); }
}
async function inventoryReport(_req, res, next) {
  try {
    const [[totals]] = await pool.query(
      'SELECT COUNT(*) AS groups, COALESCE(SUM(quantity),0) AS total, COALESCE(SUM(reserved_quantity),0) AS reserved, COALESCE(SUM(available_quantity),0) AS available FROM inventory_groups');
    const [bySpecies] = await pool.query('SELECT species, COUNT(*) AS groups, SUM(quantity) AS total, SUM(available_quantity) AS available FROM inventory_groups GROUP BY species');
    const [byScore] = await pool.query(
      `SELECT CASE WHEN quality_score <= 5 THEN '0-5' WHEN quality_score <= 7 THEN '6-7' WHEN quality_score <= 9 THEN '8-9' ELSE '10' END AS band, COUNT(*) AS groups, SUM(quantity) AS qty FROM inventory_groups GROUP BY band`);
    res.json({ totals, bySpecies, qualityDistribution: byScore });
  } catch (e) { next(e); }
}
async function shipmentReport(_req, res, next) {
  try {
    const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM shipments GROUP BY status');
    const [rows] = await pool.query('SELECT s.*, eg.export_group_code FROM shipments s JOIN export_groups eg ON eg.export_group_id = s.export_group_id ORDER BY s.shipment_id DESC LIMIT 100');
    res.json({ byStatus, shipments: rows });
  } catch (e) { next(e); }
}
async function dashboard(_req, res, next) {
  try {
    const q = async (sql) => (await pool.query(sql))[0][0];
    const rawBatches = await q('SELECT COUNT(*) AS c FROM raw_batches');
    const processed = await q('SELECT COALESCE(SUM(output_quantity),0) AS s FROM processing_records WHERE status = \'COMPLETED\'');
    const usable = await q("SELECT COALESCE(SUM(quantity),0) AS s FROM inventory_groups WHERE status != 'NON_USABLE'");
    const nonUsable = await q("SELECT COALESCE(SUM(quantity),0) AS s FROM inventory_groups WHERE status = 'NON_USABLE'");
    const reserved = await q('SELECT COALESCE(SUM(reserved_quantity),0) AS s FROM inventory_groups');
    const pendingOrders = await q("SELECT COUNT(*) AS c FROM orders WHERE status = 'PLACED'");
    const exportGroups = await q('SELECT COUNT(*) AS c FROM export_groups');
    const activeShip = await q("SELECT COUNT(*) AS c FROM shipments WHERE status IN ('READY','DISPATCHED','IN_TRANSIT')");
    const delivered = await q("SELECT COUNT(*) AS c FROM shipments WHERE status = 'DELIVERED'");
    const pendingQA = await q("SELECT COUNT(*) AS c FROM processing_groups WHERE status = 'WAITING_FOR_QUALITY'");
    const [bySpecies] = await pool.query('SELECT species, SUM(available_quantity) AS available FROM inventory_groups GROUP BY species');
    const [orderStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
    const [shipStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM shipments GROUP BY status');
    res.json({
      cards: {
        totalRawBatches: rawBatches.c, totalProcessedQty: Number(processed.s), usableQty: Number(usable.s),
        nonUsableQty: Number(nonUsable.s), reservedQty: Number(reserved.s), pendingOrders: pendingOrders.c,
        exportGroups: exportGroups.c, activeShipments: activeShip.c, deliveredShipments: delivered.c, pendingInspections: pendingQA.c,
      },
      charts: { inventoryBySpecies: bySpecies, orderStatus, shipmentStatus: shipStatus },
    });
  } catch (e) { next(e); }
}
module.exports = { exportReport, inventoryReport, shipmentReport, dashboard };
