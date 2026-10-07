# Architecture
Layers: (1) Source traceability Raw Batch, (2) Processing & Quality, (3) Inventory+Storage,
(4) Commercial export (orders, allocation, export groups, packages, documents),
(5) Logistics & traceability (shipments, QR).
Backend service layer: allocationService (FIFO transactional), qualityService (weights 2/2/2/2/1/1/1
sum/11*10), traceabilityService (backward+forward), inventoryService, shipmentService (packing gate).
Frontend: Angular standalone, role shell, guards, interceptors.
