# Database
MySQL 8, 28 tables in `database/schema.sql`. Field names follow PROMPT section 37.
Integrity: PK/FK/unique/NOT NULL + indexes on batch_code, processing_group_code,
inventory_group_code, export_group_code, species, status, order_id, tracking_number, created_at.
Allocation runs in transactions with row locks. Traceability rows never hard-deleted.
Seeds: `backend/src/seed.js` (users+master), `backend/src/seed-demo.js` (demo chain).
