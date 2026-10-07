const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');

async function list(req, res, next) {
  try {
    const { role, status, q } = req.query;
    const where = []; const p = [];
    if (role) { where.push('role = ?'); p.push(role); }
    if (status) { where.push('status = ?'); p.push(status); }
    if (q) { where.push('(name LIKE ? OR email LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT user_id, name, email, role, phone, status, created_at FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`, p);
    res.json(rows);
  } catch (e) { next(e); }
}
async function create(req, res, next) {
  try {
    const { name, email, password, role, phone = null } = req.body;
    if (!name || !email || !password || !role) throw httpError(400, 'name, email, password and role are required.');
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)', [name, email, hash, role, phone]);
    await auditLog({ user_id: req.user.user_id, action: 'USER_CREATED', entity_type: 'users', entity_id: r.insertId, new_value: { email, role }, ip_address: req.ip });
    const [[u]] = await pool.query('SELECT user_id, name, email, role, phone, status, created_at FROM users WHERE user_id = ?', [r.insertId]);
    res.status(201).json(u);
  } catch (e) { next(e); }
}
async function get(req, res, next) {
  try {
    const [[u]] = await pool.query('SELECT user_id, name, email, role, phone, status, created_at FROM users WHERE user_id = ?', [req.params.id]);
    if (!u) throw httpError(404, 'User not found.');
    res.json(u);
  } catch (e) { next(e); }
}
async function update(req, res, next) {
  try {
    const [[old]] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
    if (!old) throw httpError(404, 'User not found.');
    const { name, phone, role, status } = req.body;
    await pool.query('UPDATE users SET name = COALESCE(?, name), phone = ?, role = COALESCE(?, role), status = COALESCE(?, status) WHERE user_id = ?',
      [name || null, phone !== undefined ? phone : old.phone, role || null, status || null, req.params.id]);
    if (req.body.password) {
      await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [await bcrypt.hash(req.body.password, 10), req.params.id]);
    }
    await auditLog({ user_id: req.user.user_id, action: 'USER_UPDATED', entity_type: 'users', entity_id: req.params.id, old_value: { role: old.role, status: old.status }, new_value: req.body, ip_address: req.ip });
    const [[u]] = await pool.query('SELECT user_id, name, email, role, phone, status, created_at FROM users WHERE user_id = ?', [req.params.id]);
    res.json(u);
  } catch (e) { next(e); }
}
async function remove(req, res, next) {
  try {
    // Soft delete: traceability records must never be physically deleted.
    const [[u]] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
    if (!u) throw httpError(404, 'User not found.');
    await pool.query("UPDATE users SET status = 'INACTIVE' WHERE user_id = ?", [req.params.id]);
    await auditLog({ user_id: req.user.user_id, action: 'USER_UPDATED', entity_type: 'users', entity_id: req.params.id, old_value: { status: u.status }, new_value: { status: 'INACTIVE' }, ip_address: req.ip });
    res.json({ message: 'User deactivated.' });
  } catch (e) { next(e); }
}
module.exports = { list, create, get, update, remove };
