const pool = require('../config/db');

async function auditLog({ user_id = null, action, entity_type = null, entity_id = null, old_value = null, new_value = null, ip_address = null }) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address) VALUES (?,?,?,?,?,?,?)',
      [user_id, action, entity_type, entity_id ? String(entity_id) : null,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null, ip_address]
    );
  } catch { /* audit must never break the request */ }
}

function audit(action, entity_type) {
  return (req, _res, next) => {
    req.audit = (extra = {}) => auditLog({
      user_id: req.user ? req.user.user_id : null,
      action: extra.action || action,
      entity_type: extra.entity_type || entity_type,
      entity_id: extra.entity_id != null ? extra.entity_id : (req.params.id || null),
      old_value: extra.old_value || null,
      new_value: extra.new_value || req.body || null,
      ip_address: req.ip,
    });
    next();
  };
}

module.exports = { auditLog, audit };
