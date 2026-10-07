const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');

const vessels = {
  async list(_req, res, next) {
    try { const [r] = await pool.query('SELECT * FROM vessels ORDER BY vessel_name'); res.json(r); } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const { vessel_name, registration_number = null, owner_name = null, contact_number = null } = req.body;
      if (!vessel_name) throw httpError(400, 'vessel_name is required.');
      const [r] = await pool.query('INSERT INTO vessels (vessel_name, registration_number, owner_name, contact_number) VALUES (?,?,?,?)',
        [vessel_name, registration_number, owner_name, contact_number]);
      await auditLog({ user_id: req.user.user_id, action: 'VESSEL_CREATED', entity_type: 'vessels', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
      const [[v]] = await pool.query('SELECT * FROM vessels WHERE vessel_id = ?', [r.insertId]);
      res.status(201).json(v);
    } catch (e) { next(e); }
  },
  async get(req, res, next) {
    try {
      const [[v]] = await pool.query('SELECT * FROM vessels WHERE vessel_id = ?', [req.params.id]);
      if (!v) throw httpError(404, 'Vessel not found.');
      res.json(v);
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const [[old]] = await pool.query('SELECT * FROM vessels WHERE vessel_id = ?', [req.params.id]);
      if (!old) throw httpError(404, 'Vessel not found.');
      const { vessel_name, registration_number, owner_name, contact_number, status } = req.body;
      await pool.query('UPDATE vessels SET vessel_name = COALESCE(?, vessel_name), registration_number = COALESCE(?, registration_number), owner_name = COALESCE(?, owner_name), contact_number = COALESCE(?, contact_number), status = COALESCE(?, status) WHERE vessel_id = ?',
        [vessel_name || null, registration_number || null, owner_name || null, contact_number || null, status || null, req.params.id]);
      await auditLog({ user_id: req.user.user_id, action: 'VESSEL_UPDATED', entity_type: 'vessels', entity_id: req.params.id, old_value: old, new_value: req.body, ip_address: req.ip });
      const [[v]] = await pool.query('SELECT * FROM vessels WHERE vessel_id = ?', [req.params.id]);
      res.json(v);
    } catch (e) { next(e); }
  },
};

const harbours = {
  async list(_req, res, next) {
    try { const [r] = await pool.query('SELECT * FROM harbours ORDER BY harbour_name'); res.json(r); } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const { harbour_name, location = null, district = null } = req.body;
      if (!harbour_name) throw httpError(400, 'harbour_name is required.');
      const [r] = await pool.query('INSERT INTO harbours (harbour_name, location, district) VALUES (?,?,?)', [harbour_name, location, district]);
      await auditLog({ user_id: req.user.user_id, action: 'HARBOUR_CREATED', entity_type: 'harbours', entity_id: r.insertId, new_value: req.body, ip_address: req.ip });
      const [[h]] = await pool.query('SELECT * FROM harbours WHERE harbour_id = ?', [r.insertId]);
      res.status(201).json(h);
    } catch (e) { next(e); }
  },
};

module.exports = { vessels, harbours };
