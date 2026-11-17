const express = require('express');
const cors = require('cors');
const documentRoutes = require('./routes/documentRoutes');
const callbackRoutes = require('./routes/callbackRoutes');
const authRoutes = require('./routes/authRoutes');
const app = express();
const basePath = (process.env.APP_BASE_PATH || '').replace(/\/$/, '');
const apiPath = `${basePath}/api`;
const allowedOrigins = new Set((process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean));
if (process.env.ONLYOFFICE_URL) allowedOrigins.add(new URL(process.env.ONLYOFFICE_URL).origin);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(new Error('Origen no permitido por CORS.'));
} }));
app.use(express.json({ limit: '1mb' }));
app.get(`${apiPath}/health`, (_req, res) => res.json({ ok: true }));
app.use(`${apiPath}/auth`, authRoutes);
app.use(`${apiPath}/documents`, documentRoutes);
app.use(`${apiPath}/onlyoffice`, callbackRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' });
});
module.exports = app;
