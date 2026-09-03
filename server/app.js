const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { getDBStatus } = require('./config/db');

const app = express();

// --------------- Middleware ---------------
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());
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
