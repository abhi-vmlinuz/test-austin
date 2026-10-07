const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const buildRouter = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', buildRouter());
app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` }));
app.use(errorHandler);

module.exports = app;
