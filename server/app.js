const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { getDBStatus } = require('./config/db');

const app = express();

// --------------- Middleware ---------------
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:5174',  // Vite dev server when the default port is occupied
  'http://localhost:5000',  // Same server
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://patrolpump-9cfwzf03u-haseebs-projects-afd78c25.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Electron file://, curl, Postman, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// --------------- Health Check ---------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Diesel Pump Management System',
    database: getDBStatus() ? 'connected' : 'disconnected',
  });
});

// --------------- Routes ---------------
app.use('/api/dashboard',          require('./routes/dashboard.routes'));
app.use('/api/backup',             require('./routes/backup.routes'));
app.use('/api/auth',               require('./routes/auth.routes'));
app.use('/api/units', require('./routes/units.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/suppliers', require('./routes/suppliers.routes'));
app.use('/api/setup', require('./routes/setup.routes'));
app.use('/api/purchases', require('./routes/purchases.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/stock', require('./routes/stock.routes'));
app.use('/api/payments', require('./routes/payments.routes'));
app.use('/api/expenses', require('./routes/expenses.routes'));
app.use('/api/cash-sessions',      require('./routes/cashSession.routes'));
app.use('/api/reports',            require('./routes/reports.routes'));
app.use('/api/supplier-payments',  require('./routes/supplierPayments.routes'));
app.use('/api/audit-log',          require('./routes/auditLog.routes'));

// --------------- Global Error Handler ---------------
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
