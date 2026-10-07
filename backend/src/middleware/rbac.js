function rbac(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (allowed.length && !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied for role ${req.user.role}.` });
    }
    next();
  };
}

// Importer is read-only on operations: block non-GET except order creation & own order views.
function importerReadOnly(req, res, next) {
  if (req.user && req.user.role === 'IMPORTER' && req.method !== 'GET') {
    const ok = req.path.startsWith('/orders') && req.method === 'POST';
    if (!ok) return res.status(403).json({ message: 'Importers cannot modify processing, inventory, quality or shipment records.' });
  }
  next();
}

module.exports = { rbac, importerReadOnly };
