const express = require('express');
const { auth } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const authC = require('../controllers/authController');
const userC = require('../controllers/userController');
const { vessels, harbours } = require('../controllers/masterController');
const rawC = require('../controllers/rawBatchController');
const procC = require('../controllers/processingController');
const qC = require('../controllers/qualityController');
const invC = require('../controllers/inventoryController');
const storC = require('../controllers/storageController');
const ordC = require('../controllers/orderController');
const expC = require('../controllers/exportController');
const shipC = require('../controllers/shipmentController');
const trC = require('../controllers/traceabilityController');
const repC = require('../controllers/reportController');
const miscC = require('../controllers/miscController');
const upload = require('../middleware/upload');

const OP = ['ADMIN', 'SOURCE_OPERATOR', 'PROCESSOR', 'QUALITY_INSPECTOR', 'EXPORTER'];

function router() {
  const r = express.Router();

  // Auth (public register/login, logout/me authed)
  r.post('/auth/register', authC.register);
  r.post('/auth/login', authC.login);
  r.post('/auth/logout', auth, authC.logout);
  r.get('/auth/me', auth, authC.me);

  // Users — admin only
  r.get('/users', auth, rbac('ADMIN'), userC.list);
  r.post('/users', auth, rbac('ADMIN'), userC.create);
  r.get('/users/:id', auth, rbac('ADMIN'), userC.get);
  r.put('/users/:id', auth, rbac('ADMIN'), userC.update);
  r.delete('/users/:id', auth, rbac('ADMIN'), userC.remove);

  // Vessels / harbours
  r.get('/vessels', auth, vessels.list);
  r.post('/vessels', auth, rbac('ADMIN', 'SOURCE_OPERATOR'), vessels.create);
  r.get('/vessels/:id', auth, vessels.get);
  r.put('/vessels/:id', auth, rbac('ADMIN', 'SOURCE_OPERATOR'), vessels.update);
  r.get('/harbours', auth, harbours.list);
  r.post('/harbours', auth, rbac('ADMIN', 'SOURCE_OPERATOR'), harbours.create);

  // Raw batches
  r.get('/raw-batches', auth, rawC.list);
  r.post('/raw-batches', auth, rbac('ADMIN', 'SOURCE_OPERATOR'), rawC.create);
  r.get('/raw-batches/:id', auth, rawC.get);
  r.put('/raw-batches/:id', auth, rbac('ADMIN', 'SOURCE_OPERATOR'), rawC.update);

  // Processing + groups
  r.get('/processing', auth, procC.list);
  r.post('/processing', auth, rbac('ADMIN', 'PROCESSOR'), procC.create);
  r.get('/processing/:id', auth, procC.get);
  r.put('/processing/:id', auth, rbac('ADMIN', 'PROCESSOR'), procC.update);
  r.post('/processing/:id/complete', auth, rbac('ADMIN', 'PROCESSOR'), procC.complete);
  r.get('/processing-groups', auth, procC.listGroups);
  r.get('/processing-groups/:id', auth, procC.getGroup);

  // Quality
  r.get('/quality/pending', auth, rbac('ADMIN', 'QUALITY_INSPECTOR', 'PROCESSOR'), qC.pending);
  r.post('/quality/inspections', auth, rbac('ADMIN', 'QUALITY_INSPECTOR'), qC.createInspection);
  r.get('/quality/inspections/:id', auth, qC.getInspection);
  r.post('/quality/inspections/:id/results', auth, rbac('ADMIN', 'QUALITY_INSPECTOR'), qC.addResults);

  // Inventory (specific routes before :id)
  r.get('/inventory', auth, invC.list);
  r.get('/inventory/available', auth, invC.available);
  r.get('/inventory/:id', auth, invC.get);
  r.get('/inventory/:id/history', auth, invC.history);

  // Storage
  r.get('/storage', auth, storC.list);
  r.post('/storage', auth, rbac('ADMIN', 'PROCESSOR'), storC.create);
  r.post('/storage/move', auth, rbac('ADMIN', 'PROCESSOR'), storC.move);
  r.get('/storage/history/:inventoryGroupId', auth, storC.history);

  // Orders + allocation
  r.get('/orders', auth, ordC.list);
  r.post('/orders', auth, rbac('ADMIN', 'EXPORTER', 'IMPORTER'), ordC.create);
  r.get('/orders/:id', auth, ordC.get);
  r.put('/orders/:id/status', auth, rbac('ADMIN', 'EXPORTER', 'IMPORTER'), ordC.setStatus);
  r.post('/orders/:id/validate', auth, rbac('ADMIN', 'EXPORTER'), ordC.validate);
  r.post('/orders/:id/allocate', auth, rbac('ADMIN', 'EXPORTER'), ordC.allocate);
  r.get('/orders/:id/allocations', auth, ordC.allocations);

  // Export groups + packages
  r.get('/export-groups', auth, expC.list);
  r.post('/export-groups', auth, rbac('ADMIN', 'EXPORTER'), expC.create);
  r.get('/export-groups/:id', auth, expC.get);
  r.get('/export-groups/:id/packages', auth, expC.listPackages);
  r.post('/export-groups/:id/packages', auth, rbac('ADMIN', 'EXPORTER', 'PROCESSOR'), expC.createPackages);
  r.put('/packages/:id', auth, rbac('ADMIN', 'EXPORTER', 'PROCESSOR'), expC.updatePackage);

  // Shipments
  r.get('/shipments', auth, shipC.list);
  r.post('/shipments', auth, rbac('ADMIN', 'EXPORTER'), shipC.create);
  r.put('/shipments/:id/status', auth, rbac('ADMIN', 'EXPORTER'), shipC.setStatus);

  // Traceability — public read (QR scans), search needs auth
  r.get('/traceability/search', auth, trC.searchCodes);
  r.get('/traceability/package/:packageCode', trC.byPackageCode);
  r.get('/traceability/:exportGroupCode', trC.byExportCode);

  // Reports
  r.get('/reports/export/:exportGroupId', auth, repC.exportReport);
  r.get('/reports/inventory', auth, repC.inventoryReport);
  r.get('/reports/shipments', auth, repC.shipmentReport);
  r.get('/reports/dashboard', auth, repC.dashboard);

  // Shipping rules
  r.get('/shipping-rules', auth, miscC.list);
  r.post('/shipping-rules', auth, rbac('ADMIN'), miscC.create);
  r.put('/shipping-rules/:id', auth, rbac('ADMIN'), miscC.update);
  r.delete('/shipping-rules/:id', auth, rbac('ADMIN'), miscC.remove);

  // Documents
  r.get('/documents', auth, miscC.listDocs);
  r.post('/documents', auth, rbac(...OP), upload.single('file'), miscC.uploadDoc);

  // Audit / notifications / dashboards
  r.get('/audit-logs', auth, rbac('ADMIN'), miscC.auditLogs);
  r.get('/notifications', auth, miscC.notifications);
  r.get('/dashboard/:role', auth, miscC.roleDashboard);

  return r;
}

module.exports = router;
