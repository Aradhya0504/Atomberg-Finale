require('dotenv').config();
const express = require('express');
const http    = require('http');
const https   = require('https');
const fs      = require('fs');
const { Server } = require('socket.io');
const cors   = require('cors');
const path   = require('path');

const config = require('./config');
const { connectDB }         = require('./db/database');
const { createWorker }      = require('./mediasoup');
const { setupSocketHandlers } = require('./socket');
const authRoutes    = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const adminRoutes   = require('./routes/admin');

const app = express();

// ── HTTPS: load cert if present (production VPS), else HTTP (local dev) ──────
const certFile = path.join(__dirname, '../ssl/cert.pem');
const keyFile  = path.join(__dirname, '../ssl/key.pem');
const useHttps = fs.existsSync(certFile) && fs.existsSync(keyFile);

const httpServer = useHttps
  ? https.createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }, app)
  : http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? true   // same-origin in prod (client served by Express)
  : config.clientUrl;

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin',    adminRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Serve built frontend in production ────────────────────────────────────────
const distPath = path.join(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

setupSocketHandlers(io);

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    await connectDB();
    await createWorker();
    httpServer.listen(config.port, '0.0.0.0', () => {
      const proto = useHttps ? 'https' : 'http';
      console.log(`\n🚀 Atomberg Video Server`);
      console.log(`   URL   : ${proto}://0.0.0.0:${config.port}`);
      console.log(`   Mode  : ${useHttps ? 'HTTPS (SSL)' : 'HTTP (dev)'}`);
      console.log(`   Env   : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Stack : MERN + mediasoup SFU`);
      console.log(`   Creds : agent@demo.com / admin@demo.com  |  pass: password123\n`);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

main();
