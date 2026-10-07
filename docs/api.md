# API
Base `/api`, JWT Bearer. Full route list in `backend/src/routes/index.js`:
auth, users, vessels, harbours, raw-batches, processing, processing-groups, quality,
inventory, storage, orders (+validate/allocate/allocations), export-groups (+packages),
shipments, traceability (`/:exportGroupCode`, `/package/:packageCode`, `/search?q=`),
reports (`/export/:id`, `/inventory`, `/shipments`, `/dashboard`), shipping-rules,
documents, audit-logs, notifications, dashboard/:role.
