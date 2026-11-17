require('dotenv').config();

const app = require('./src/app');
const { validateConfig } = require('./src/config/env');
const http = require('node:http');
const { initializeSocketServer } = require('./src/realtime/socketServer');

validateConfig();

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);
const io = initializeSocketServer(server);
app.set('io', io);
server.listen(port, host, () => console.log(`Backend escuchando en http://${host}:${port}`));
