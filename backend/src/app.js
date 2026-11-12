const express = require('express');
const cors = require('cors');
const documentRoutes = require('./routes/documentRoutes');
const callbackRoutes = require('./routes/callbackRoutes');
const authRoutes = require('./routes/authRoutes');
const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/onlyoffice', callbackRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' });
});
module.exports = app;
