const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { httpError } = require('../middleware/errorHandler');
const { auditLog } = require('../middleware/audit');
const { requireFields } = require('../utils/validators');

const ROLES = ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR', 'QUALITY_INSPECTOR', 'EXPORTER', 'IMPORTER'];
const sign = (u) => jwt.sign({ user_id: u.user_id, name: u.name, email: u.email, role: u.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '24h' });
const safe = (u) => ({ user_id: u.user_id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, created_at: u.created_at });

async function register(req, res, next) {
  try {
    requireFields(req.body, ['name', 'email', 'password']);
    const { name, email, password, role = 'IMPORTER', phone = null } = req.body;
    if (!ROLES.includes(role)) throw httpError(400, `Invalid role. Allowed: ${ROLES.join(', ')}.`);
    const [[exists]] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (exists) throw httpError(409, 'Email is already registered.');
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)', [name, email, hash, role, phone]);
    const [[user]] = await pool.query('SELECT * FROM users WHERE user_id = ?', [r.insertId]);
    await auditLog({ action: 'USER_CREATED', entity_type: 'users', entity_id: r.insertId, new_value: { email, role }, ip_address: req.ip });
    res.status(201).json({ token: sign(user), user: safe(user) });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    requireFields(req.body, ['email', 'password']);
    const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [req.body.email]);
    if (!user) throw httpError(401, 'Invalid email or password.');
    if (user.status !== 'ACTIVE') throw httpError(403, 'Account is inactive. Contact admin.');
    const ok = await bcrypt.compare(req.body.password, user.password_hash);
    if (!ok) throw httpError(401, 'Invalid email or password.');
    await auditLog({ user_id: user.user_id, action: 'LOGIN', entity_type: 'users', entity_id: user.user_id, ip_address: req.ip });
    res.json({ token: sign(user), user: safe(user) });
  } catch (e) { next(e); }
}

async function logout(req, res, next) {
  try {
    if (req.user) await auditLog({ user_id: req.user.user_id, action: 'LOGOUT', entity_type: 'users', entity_id: req.user.user_id, ip_address: req.ip });
    res.json({ message: 'Logged out.' });
  } catch (e) { next(e); }
}

async function me(req, res, next) {
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
    if (!user) throw httpError(404, 'User not found.');
    res.json(safe(user));
  } catch (e) { next(e); }
}

module.exports = { register, login, logout, me, ROLES };
