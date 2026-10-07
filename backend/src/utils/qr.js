const QRCode = require('qrcode');

async function qrDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, { width: 256, margin: 1 });
  } catch {
    return null;
  }
}
function traceUrl(code) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  return `${base}/traceability/${code}`;
}

module.exports = { qrDataUrl, traceUrl };
