# Catch2Export — Catch-to-Export Seafood Traceability Platform

> Every kilogram has a digital identity.

## Problem
Seafood exporters cannot prove where exported seafood came from, what quality it had,
where it was stored, or which order consumed it. Paper records break the chain of custody.

## Solution
One centralized platform tracking seafood from **Raw Batch** (already-sorted quantity entered
into the system) through processing, quality inspection, inventory, storage, importer orders,
smart allocation, export grouping, packing, shipment and QR traceability.

```
RAW BATCH -> PROCESSING -> PROCESSING GROUP -> QUALITY -> INVENTORY GROUPS
  -> COLD STORAGE -> IMPORTER ORDER -> SMART ALLOCATION -> EXPORT GROUP
  -> PACKAGES -> SHIPMENT -> QR TRACEABILITY -> DELIVERY
```

Scope starts at **Raw Batch Creation**. Fishing, navigation, harbour landing and
species sorting happen outside the system; only reference metadata is stored.

## Key Features
- 6 roles: Admin, Source Operator, Processor, Quality Inspector, Exporter, Importer (+JWT RBAC)
- Raw Batch with unique codes (RAW-SHR-20261007-001), statuses CREATED..EXHAUSTED
- Processing with `Input = Output + Waste` validation
- Quality inspection: 7 parameters, weighted 0-10 score, threshold 6 (configurable),
  multi-split results (e.g. 300kg/9, 250kg/8, 150kg/7, 60kg/4 NON-USABLE)
- Inventory Groups with original/reserved/consumed/available model, transactional allocation
- Smart FIFO allocation across fewest groups, shortage reporting
- Export Groups + packages (total must match) + QR (`/traceability/:code`)
- Shipments AIR/SEA with configurable shipping rules, packing gate before dispatch
- Storage history (never deleted), documents, audit logs, notifications, reports, dashboards

## User Roles
| Role | Main actions |
|---|---|
| Admin | users, vessels, harbours, facilities, shipping rules, settings, audit, reports |
| Source Operator | create Raw Batch from sorted seafood |
| Processor | process, create PG, storage moves, pick/pack |
| Quality Inspector | inspect PG, splits, scores |
| Exporter | accept orders, smart allocate, export groups, packages, shipments, QR |
| Importer | create/track orders, view traceability (read-only on ops) |

## Architecture
- `backend/` Node 22 + Express + mysql2 + JWT + bcryptjs + qrcode + multer
- `frontend/` Angular 17 standalone + Tailwind, nginx SPA
- `database/` MySQL 8 `schema.sql` (28 tables) + seeds
- `docker-compose.yml`: db (3307) + backend (3000) + frontend (4200)

## Database
See `database/schema.sql` and `docs/database.md`. Key chains:
`raw_batches -> processing_records -> processing_groups -> quality_inspections -> quality_results -> inventory_groups -> storage_history`, `orders -> order_items -> inventory_allocations -> inventory_groups`, `orders -> export_groups -> export_group_items -> inventory_groups`, `export_groups -> packages -> shipments`.

## API
Base `/api`. See `docs/api.md`. Auth: `Authorization: Bearer <JWT>`.

## Installation
```bash
cp .env.example backend/.env   # then fill DB_* / JWT_SECRET
docker compose up --build
# backend auto-runs init + seed + seed-demo on first start
```
Local dev:
```bash
# MySQL 8 running with db catch2export
cd backend && npm install && npm run init-db && npm run seed && node src/seed-demo.js && npm start
cd frontend && npm install && npx ng serve   # http://localhost:4200 (API http://localhost:3000/api)
```

## Environment Variables
```
PORT DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD JWT_SECRET FRONTEND_URL UPLOAD_DIR
```

## Running
- Frontend: http://localhost:4200 (landing with hero.mp4, login split with LOGIN.png)
- Backend: http://localhost:3000/health, API http://localhost:3000/api
- MySQL: localhost:3307

## Demo Credentials (password `Password123!`)
```
admin@example.com / source@example.com / processor@example.com
inspector@example.com / exporter@example.com / importer@example.com
```
Seeded chain: RAW-SHR-001 (800kg) -> 760kg PG-001 -> IG-001 400kg/9, IG-002 300kg/8,
IG-003 40kg/7, IG-004 20kg/4 NON-USABLE -> ORD-001 (700kg Shrimp, min 8, Germany SEA, PLACED).
(Splits adjusted from the 300/250/150/60 illustration so score>=8 totals exactly 700kg.)

## Demo Scenario (3-5 min)
1. Source: show RAW-SHR-001. 2. Processor: 800->760+40. 3. Inspector: 4 splits, 60kg NON-USABLE.
4. Inventory + storage F-01..F-03. 5. Importer: ORD-001. 6. Exporter: Accept -> SMART ALLOCATE
(IG-001 400 + IG-002 200 + IG-004 100) -> EXPORT-GROUP-001. 7. Packages 7x100. 8. QR.
9. Shipment Kochi->Hamburg SEA IN_TRANSIT. 10. Open QR timeline — climax.

## Future Scope
Quality anomaly AI, export-readiness score, NL traceability assistant (read-only, never mutates
inventory/quality). No fishing/IoT/GPS/payments/blockchain in hackathon scope.
