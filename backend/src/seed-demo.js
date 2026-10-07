require('dotenv').config();
const pool = require('./config/db');

// Full demo chain: RAW-SHR-001 -> PG-001 -> inspection splits -> IG-001..004 -> storage -> ORD-001 (PLACED).
// Idempotent: skips if RAW-SHR-001 already exists. Allocation left for the live demo.
(async () => {
  const [[existing]] = await pool.query('SELECT raw_batch_id FROM raw_batches WHERE batch_code=?', ['RAW-SHR-001']);
  if (existing) { console.log('Demo chain already seeded.'); await pool.end(); return; }

  const [[vessel]] = await pool.query("SELECT vessel_id FROM vessels WHERE registration_number='KL-07-1024'");
  const [[harbour]] = await pool.query("SELECT harbour_id FROM harbours WHERE harbour_name='Kochi Harbour'");
  const [[source]] = await pool.query("SELECT user_id FROM users WHERE email='source@example.com'");
  const [[processor]] = await pool.query("SELECT user_id FROM users WHERE email='processor@example.com'");
  const [[inspector]] = await pool.query("SELECT user_id FROM users WHERE email='inspector@example.com'");
  const [[importer]] = await pool.query("SELECT user_id FROM users WHERE email='importer@example.com'");

  const [rb] = await pool.query(
    `INSERT INTO raw_batches (batch_code, species, original_quantity, remaining_quantity, unit, status, vessel_id, harbour_id, landing_date, notes, created_by)
     VALUES ('RAW-SHR-001','Shrimp',800,0,'kg','PROCESSED',?,?,CURDATE(),'Demo batch: already-sorted shrimp',?)`,
    [vessel?.vessel_id ?? null, harbour?.harbour_id ?? null, source?.user_id ?? null]
  );
  const [pr] = await pool.query(
    `INSERT INTO processing_records (raw_batch_id, processor_id, processing_type, input_quantity, output_quantity, waste_quantity, start_time, end_time, status, remarks)
     VALUES (?,?,'Cleaning + De-heading + Peeling + Freezing',800,760,40,NOW(),NOW(),'COMPLETED','Demo processing')`,
    [rb.insertId, processor?.user_id ?? null]
  );
  const [pg] = await pool.query(
    `INSERT INTO processing_groups (processing_id, processing_group_code, species, quantity, status)
     VALUES (?, 'PG-001','Shrimp',760,'SPLIT')`,
    [pr.insertId]
  );
  const [insp] = await pool.query(
    `INSERT INTO quality_inspections (processing_group_id, inspector_id, temperature, appearance_score, odour_score, texture_score, size_score, processing_score, packaging_score, quality_score, remarks)
     VALUES (?,?,-18,2,2,1.5,1.5,1,1,9,'Demo inspection with 4 splits')`,
    [pg.insertId, inspector?.user_id ?? null]
  );
  // NOTE: PROMPT section 14 illustrates splits 300/250/150/60, but that yields only
  // 550kg at score>=8, which cannot fulfil the 700kg min-8 demo order (ORD-001).
  // Seed uses 400/300/40/20 so score>=8 totals exactly 700kg (total still 760).
  const splits = [
    [400, 9, 'USABLE'], [300, 8, 'USABLE'], [40, 7, 'USABLE'], [20, 4, 'NON_USABLE'],
  ];
  const igCodes = ['IG-001', 'IG-002', 'IG-003', 'IG-004'];
  const igIds = [];
  for (let i = 0; i < splits.length; i++) {
    const [qty, score, result] = splits[i];
    const [qr] = await pool.query(
      'INSERT INTO quality_results (inspection_id, quantity, quality_score, result) VALUES (?,?,?,?)',
      [insp.insertId, qty, score, result]
    );
    const status = result === 'USABLE' ? 'AVAILABLE' : 'NON_USABLE';
    const [ig] = await pool.query(
      `INSERT INTO inventory_groups (processing_group_id, quality_result_id, inventory_group_code, species, quantity, quality_score, reserved_quantity, consumed_quantity, available_quantity, status)
       VALUES (?,?,?,?,?,?,0,0,?,?)`,
      [pg.insertId, qr.insertId, igCodes[i], 'Shrimp', qty, score, qty, status]
    );
    igIds.push(ig.insertId);
    if (result === 'NON_USABLE') {
      await pool.query(
        "INSERT INTO decomposition_records (inventory_group_id, quantity, reason, action, processed_by, remarks) VALUES (?,?, 'Quality score 4 below threshold', 'DECOMPOSITION', ?, 'Demo non-usable handling')",
        [ig.insertId, qty, inspector?.user_id ?? null]
      );
    }
  }
  const freezers = await pool.query("SELECT storage_id, freezer_code FROM storage_locations WHERE freezer_code IN ('F-01','F-02','F-03') ORDER BY freezer_code");
  const fmap = Object.fromEntries(freezers[0].map((f) => [f.freezer_code, f.storage_id]));
  const placements = [['IG-001', 'F-01', 400], ['IG-002', 'F-02', 300], ['IG-003', 'F-03', 40]];
  for (let i = 0; i < 3; i++) {
    await pool.query('INSERT INTO storage_history (inventory_group_id, storage_id, quantity, temperature, remarks) VALUES (?,?,?,?,?)',
      [igIds[i], fmap[placements[i][1]] ?? null, placements[i][2], -18, 'Demo cold storage']);
  }
  const [ord] = await pool.query(
    `INSERT INTO orders (order_code, importer_id, destination_country, destination_address, shipping_method, required_date, status)
     VALUES ('ORD-001',?,'Germany','Hamburg Port','SEA',DATE_ADD(CURDATE(), INTERVAL 13 DAY),'PLACED')`,
    [importer?.user_id ?? null]
  );
  await pool.query('INSERT INTO order_items (order_id, species, required_quantity, minimum_quality_score) VALUES (?,?,?,?)', [ord.insertId, 'Shrimp', 700, 8]);

  console.log('Demo chain seeded: RAW-SHR-001 -> PG-001 -> IG-001..004 -> ORD-001 (PLACED).');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
