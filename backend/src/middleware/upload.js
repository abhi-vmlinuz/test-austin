const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`),
});

module.exports = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
