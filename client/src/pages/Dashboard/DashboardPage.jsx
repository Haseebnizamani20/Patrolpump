import { useState, useEffect, useCallback, useId } from 'react';
import {
  Row, Col, Card, Statistic, Table, Tag, Alert, Badge,
  Button, Tooltip, Typography, Space, Spin,
} from 'antd';
import {
  DollarOutlined, FireOutlined, ShoppingCartOutlined,
  WarningOutlined, UserOutlined, ReloadOutlined,
  RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import './DashboardPage.css';

const { Title, Text } = Typography;
const fmt = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

const FuelTank = ({ percentage, fuelType }) => {
  const clipId = useId().replace(/:/g, '');
  const pct = Math.max(0, Math.min(Number(percentage) || 0, 100));
  const isEmpty = pct === 0;
  const liquidTop = 140 - ((125 * pct) / 100);
  const liquidColor = { petrol: '#C9720E', diesel: '#7A4B2A', cng: '#1677ff' }[fuelType] || '#7A4B2A';

  return (
    <svg className="fuel-tank" viewBox="0 0 100 150" role="img" aria-label={`${pct.toFixed(0)}% full`}>
      <defs>
        <clipPath id={clipId}><rect x="10" y="15" width="80" height="125" rx="16" /></clipPath>
      </defs>
      <rect x="10" y="15" width="80" height="125" rx="16" fill="#EDF2F0" />
      {!isEmpty && (
        <g clipPath={`url(#${clipId})`}>
          <path
            d={`M10,${liquidTop} C28,${liquidTop - 7} 46,${liquidTop + 6} 64,${liquidTop - 1} C74,${liquidTop - 5} 84,${liquidTop + 2} 90,${liquidTop - 1} L90,140 L10,140 Z`}
            fill={liquidColor}
          />
        </g>
      )}
      {[109, 77, 46].map((y) => <line key={y} x1="5" y1={y} x2="10" y2={y} stroke="#CDD7D3" strokeWidth="2" />)}
      <rect
        x="10" y="15" width="80" height="125" rx="16" fill="none"
        stroke={isEmpty ? '#ff4d4f' : '#0D1417'} strokeWidth="2"
        strokeDasharray={isEmpty ? '5 4' : undefined} opacity="0.85"
      />
      <text x="50" y="80" textAnchor="middle" dominantBaseline="middle" className="fuel-tank-label" fill={pct >= 45 ? '#FFFFFF' : '#0D1417'}>
        {isEmpty ? 'Empty' : `${pct.toFixed(0)}%`}
      </text>
    </svg>
  );
};

// ---- Widget: Today's Sales KPIs ----
const SalesKPIs = ({ sales, expenses, paymentsReceived, cashPaidToSuppliers }) => (
  <Card title={<><ShoppingCartOutlined /> Today's Sales</>} style={{ marginBottom: 16 }}>
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Revenue" value={sales.totalAmount} prefix="Rs" precision={2}
          valueStyle={{ color: '#1677ff' }} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Liters Sold" value={sales.totalLiters} suffix="L" precision={2} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Gross Profit" value={sales.grossProfit} prefix="Rs" precision={2}
          valueStyle={{ color: '#52c41a' }} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Transactions" value={sales.count} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Cash Sales" value={sales.cashSales} prefix="Rs" precision={2} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Credit Sales" value={sales.creditSales} prefix="Rs" precision={2} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Expenses" value={expenses} prefix="Rs" precision={2}
          valueStyle={{ color: '#cf1322' }} />
      </Col>
      <Col xs={12} sm={8} md={6}>
        <Statistic title="Paid to Suppliers" value={cashPaidToSuppliers} prefix="Rs" precision={2}
          valueStyle={{ color: '#cf1322' }} />
      </Col>
    </Row>
  </Card>
);

// ---- Widget: Stock Levels ----
const StockWidget = ({ stockData }) => {
  const navigate = useNavigate();
  const { units, lowStockAlerts, totalStockValue } = stockData;

  return (
    <Card
      title={<><FireOutlined /> Stock Levels</>}
      extra={<Text type="secondary">Total: <span className="dashboard-numeric">{fmt(totalStockValue)}</span></Text>}
      style={{ marginBottom: 16 }}
    >
      {lowStockAlerts.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={`${lowStockAlerts.length} unit${lowStockAlerts.length > 1 ? 's' : ''} below 20% capacity`}
          style={{ marginBottom: 12 }}
        />
      )}
      <div className="stock-tank-grid">
        {units.map(u => {
          const pct = u.utilizationPct;
          return (
            <div key={u._id}>
              <Card size="small" style={{ border: `1px solid ${u.isLowStock ? '#ff4d4f' : '#f0f0f0'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong>{u.name}</Text>
                  <Space size={4}>
                    {u.status === 'inactive' && <Tag color="default">Inactive</Tag>}
                    {u.isLowStock && <Tag color="error">⚠ Low Stock</Tag>}
                  </Space>
                </div>
                <Tooltip title={`${u.currentStock.toFixed(1)}L / ${u.capacity}L — Avg cost: ${fmt(u.avgCost)}/L`}>
                  <div className="fuel-tank-wrap">
                    <FuelTank percentage={pct} fuelType={u.fuelType} />
                  </div>
                </Tooltip>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Capacity: <span className="dashboard-numeric">{u.capacity}L</span> · Current: <span className="dashboard-numeric">{u.currentStock.toFixed(0)}L</span>
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Value: <span className="dashboard-numeric">{fmt(u.stockValue)}</span></Text>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
      <Button type="link" style={{ paddingLeft: 0, marginTop: 8 }} onClick={() => navigate('/reports')}>
        Full Stock Report →
      </Button>
    </Card>
  );
};

// ---- Widget: Top Customer Dues ----
const TopDuesWidget = ({ duesData }) => {
  const navigate = useNavigate();
  const { top5, totalDues, customersWithDues } = duesData;

  const columns = [
    { title: 'Customer', dataIndex: 'name', ellipsis: true },
    { title: 'Phone', dataIndex: 'phone', render: p => p || '—', width: 110 },
    {
      title: 'Balance',
      dataIndex: 'currentBalance',
      align: 'right',
      render: v => <strong style={{ color: '#cf1322' }}>{fmt(v)}</strong>,
    },
    {
      title: 'Limit Used',
      render: (_, r) => {
        const pct = r.creditLimit > 0 ? Math.round((r.currentBalance / r.creditLimit) * 100) : null;
        return pct !== null ? (
          <Tag color={pct >= 100 ? 'red' : pct >= 80 ? 'orange' : 'green'}>{pct}%</Tag>
        ) : '—';
      },
      width: 90,
    },
  ];

  return (
    <Card
      title={<><UserOutlined /> Top Customer Dues</>}
      extra={
        <Space>
          <Badge count={customersWithDues} overflowCount={99} color="red" />
          <Text type="secondary">Total: {fmt(totalDues)}</Text>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {top5.length === 0 ? (
        <Text type="secondary">No outstanding customer dues 🎉</Text>
      ) : (
        <>
          <Table dataSource={top5} columns={columns} rowKey="_id"
            pagination={false} size="small" />
          {customersWithDues > 5 && (
            <Button type="link" style={{ paddingLeft: 0, marginTop: 4 }}
              onClick={() => navigate('/reports')}>
              +{customersWithDues - 5} more — View Customer Dues Report →
            </Button>
          )}
        </>
      )}
    </Card>
  );
};

// ---- Main DashboardPage ----
const DashboardPage = () => {
  const { user, logout, isOwner } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/dashboard');
      setData(res.data.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard load failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchDashboard, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>⛽ Dashboard</Title>
          <Text type="secondary">
            {dayjs().format('dddd, DD MMMM YYYY')}
            {lastRefresh && ` — Last updated ${dayjs(lastRefresh).format('HH:mm:ss')}`}
          </Text>
        </div>
        <Space>
          <Text>Welcome, <strong>{user?.name}</strong></Text>
          <Tag color={isOwner ? 'green' : 'blue'} style={{ textTransform: 'capitalize' }}>
            {user?.role}
          </Tag>
          <Button icon={<ReloadOutlined />} onClick={fetchDashboard} loading={loading}>
            Refresh
          </Button>
        </Space>
      </div>

      {loading && !data ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
          <br /><Text type="secondary" style={{ marginTop: 16, display: 'block' }}>Loading dashboard…</Text>
        </div>
      ) : data ? (
        <>
          {/* Row 1: Today's Sales */}
          <Row>
            <Col span={24}>
              <SalesKPIs
                sales={data.today.sales}
                expenses={data.today.expenses}
                paymentsReceived={data.today.paymentsReceived}
                cashPaidToSuppliers={data.today.cashPaidToSuppliers}
              />
            </Col>
          </Row>

          {/* Row 2: Stock, then customer dues */}
          <StockWidget stockData={data.stock} />
          <TopDuesWidget duesData={data.customerDues} />

          {/* Row 3: Today's Purchases summary (owner only) */}
          {isOwner && data.today.purchases.count > 0 && (
            <Card title={<><RiseOutlined /> Today's Purchases</>} style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Entries" value={data.today.purchases.count} />
                </Col>
                <Col span={8}>
                  <Statistic title="Liters Received" value={data.today.purchases.totalLiters}
                    suffix="L" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="Amount Paid/Due" value={data.today.purchases.totalAmount}
                    prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} />
                </Col>
              </Row>
            </Card>
          )}
        </>
      ) : (
        <Alert type="error" message="Failed to load dashboard data. Please refresh." showIcon />
      )}
    </div>
  );
};

export default DashboardPage;
