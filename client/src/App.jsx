import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import UnitsPage from './pages/Units/UnitsPage';
import CustomersPage from './pages/Customers/CustomersPage';
import SuppliersPage from './pages/Suppliers/SuppliersPage';
import PurchasePage from './pages/Purchase/PurchasePage';
import SalePage from './pages/Sale/SalePage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import ExpensesPage from './pages/Expenses/ExpensesPage';
import CashSessionPage from './pages/CashSession/CashSessionPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SupplierPaymentsPage from './pages/SupplierPayments/SupplierPaymentsPage';
import AuditLogPage from './pages/AuditLog/AuditLogPage';
import UsersPage from './pages/Users/UsersPage';
import BackupPage from './pages/Backup/BackupPage';
import SetupPage from './pages/Setup/SetupPage';
import StockAdjustmentPage from './pages/Stock/StockAdjustmentPage';
import BusinessProfilePage from './pages/Settings/BusinessProfilePage';
import './App.css';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/units" element={<UnitsPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases" element={<PurchasePage />} />
        <Route path="/sales" element={<SalePage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/cash-session" element={<CashSessionPage />} />
        <Route path="/supplier-payments" element={<SupplierPaymentsPage />} />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute requiredRole="owner">
              <AuditLogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="owner">
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/backup"
          element={
            <ProtectedRoute requiredRole="owner">
              <BackupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRole="owner">
              <BusinessProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="owner">
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-adjustments"
          element={
            <ProtectedRoute requiredRole="owner">
              <StockAdjustmentPage />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/setup" 
          element={
            <ProtectedRoute requiredRole="owner">
              <SetupPage />
            </ProtectedRoute>
          } 
        />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
