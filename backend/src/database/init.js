require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  const candidates = [
    path.join(__dirname, '..', '..', '..', 'database', 'schema.sql'),
    path.join(__dirname, '..', '..', 'database', 'schema.sql'),
    '/database/schema.sql',
  ];
  const sqlPath = candidates.find((p) => fs.existsSync(p));
  if (!sqlPath) throw new Error(`schema.sql not found (tried ${candidates.join(', ')})`);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await conn.query(sql);
  console.log('Database initialised.');
  await conn.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
