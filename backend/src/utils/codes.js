function dateTag() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
function rand(n = 3) {
  return String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
}
function speciesTag(species = '') {
  return (species.slice(0, 3) || 'GEN').toUpperCase().replace(/[^A-Z]/g, 'X');
}
async function uniqueCode(connOrPool, table, column, base) {
  for (let i = 0; i < 10; i++) {
    const code = `${base}-${rand(3)}`;
    const [rows] = await connOrPool.query(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [code]);
    if (!rows.length) return code;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}
const batchCode = () => `RAW-${dateTag()}-${rand(4)}`;
const pgCode = () => `PG-${dateTag()}-${rand(3)}`;
const igCode = () => `IG-${rand(4)}`;
const exportCode = () => `EXPORT-${dateTag()}-${rand(3)}`;
const pkgCode = () => `PKG-${rand(5)}`;
const orderCode = () => `ORD-${dateTag()}-${rand(3)}`;

module.exports = { dateTag, speciesTag, uniqueCode, batchCode, pgCode, igCode, exportCode, pkgCode, orderCode };
