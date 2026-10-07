const pool = require('../config/db');
const { fullTrace, forwardTrace, search } = require('../services/traceabilityService');
const { httpError } = require('../middleware/errorHandler');

async function byExportCode(req, res, next) {
  try { res.json(await fullTrace(pool, req.params.exportGroupCode)); } catch (e) { next(e); }
}
async function byPackageCode(req, res, next) {
  try {
    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE package_number = ?', [req.params.packageCode]);
    if (!pkg) throw httpError(404, 'Package not found.');
    const [[eg]] = await pool.query('SELECT export_group_code FROM export_groups WHERE export_group_id = ?', [pkg.export_group_id]);
    const trace = await fullTrace(pool, eg.export_group_code);
    res.json({ package: pkg, ...trace });
  } catch (e) { next(e); }
}
async function searchCodes(req, res, next) {
  try {
    const q = req.query.q || '';
    if (!q) throw httpError(400, 'Query param ?q= is required.');
    res.json(await search(pool, q));
  } catch (e) { next(e); }
}
async function rawForward(req, res, next) {
  try { res.json(await forwardTrace(pool, req.params.id)); } catch (e) { next(e); }
}
module.exports = { byExportCode, byPackageCode, searchCodes, rawForward };
