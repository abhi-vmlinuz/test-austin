require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT || 3000);
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('MySQL connected.');
  } catch (e) {
    console.warn('MySQL not reachable at startup:', e.message);
  }
  app.listen(PORT, () => console.log(`Catch2Export backend on :${PORT}`));
})();
