require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const USERS = [
  ['Admin', 'admin@example.com', 'ADMIN'],
  ['Source Operator', 'source@example.com', 'SOURCE_OPERATOR'],
  ['Processor', 'processor@example.com', 'PROCESSOR'],
  ['Inspector', 'inspector@example.com', 'QUALITY_INSPECTOR'],
  ['Exporter', 'exporter@example.com', 'EXPORTER'],
  ['Importer', 'importer@example.com', 'IMPORTER'],
];

(async () => {
  const hash = await bcrypt.hash('Password123!', 10);
  for (const [name, email, role] of USERS) {
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [name, email, hash, role]
    );
  }
  await pool.query(
    "INSERT IGNORE INTO vessels (vessel_name, registration_number, owner_name) VALUES ('Ocean Star','KL-07-1024','Kerala Fisheries')"
  );
  await pool.query(
    "INSERT IGNORE INTO harbours (harbour_name, location, district) VALUES ('Kochi Harbour','Kochi','Ernakulam')"
  );
  await pool.query(
    "INSERT IGNORE INTO storage_locations (facility_name, freezer_code, temperature, capacity) VALUES ('Kerala Seafood Processing Centre','F-01',-18,2000),('Kerala Seafood Processing Centre','F-02',-18,2000),('Kerala Seafood Processing Centre','F-03',-18,2000)"
  );
  await pool.query(
    "INSERT IGNORE INTO shipping_rules (species, shipping_method, destination_country, allowed, handling_requirement) VALUES ('Shrimp','SEA','Germany',1,'Keep frozen at -18C'),('Shrimp','AIR','Germany',1,'Cold chain required')"
  );
  console.log('Seeded demo users (password Password123!) + master data.');
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
