import { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Card, Statistic, Table, Tag, Alert, Badge,
  Button, Progress, Tooltip, Typography, Space, Spin, Divider,
} from 'antd';
import {
  DollarOutlined, FireOutlined, ShoppingCartOutlined,
  WarningOutlined, UserOutlined, ReloadOutlined,
  BankOutlined, RiseOutlined, FallOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const fmt = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

// ---- Widget: Today's Sales KPIs ----
const SalesKPIs = ({ sales, expenses, paymentsReceived, netCash }) => (
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
        <Statistic title="Net Cash Position" value={netCash} prefix="Rs" precision={2}
          valueStyle={{ color: netCash >= 0 ? '#52c41a' : '#cf1322' }} />
      </Col>
    </Row>
  </Card>
);

// ---- Widget: Cash Session Status ----
const CashSessionWidget = ({ session, yesterdayVariance }) => {
  const navigate = useNavigate();
  const sessionOpen = session?.status === 'open';
  const hasVariance = yesterdayVariance && yesterdayVariance.shortageOrExcess !== 0;

  return (
    <Card title={<><BankOutlined /> Cash Session</>} style={{ marginBottom: 16 }}>
      {!session ? (
        <Alert
          type="warning"
          message="No session opened today"
          description="Open a cash session to start recording entries."
          action={<Button size="small" onClick={() => navigate('/cash-session')}>Open Session</Button>}
          showIcon
        />
      ) : (
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Status"
              value={sessionOpen ? 'OPEN' : 'CLOSED'}
              valueStyle={{ color: sessionOpen ? '#52c41a' : '#cf1322' }}
              prefix={sessionOpen ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            />
          </Col>
          <Col span={12}>
            <Statistic title="Opening Cash" value={session.openingCash} prefix="Rs" precision={2} />
          </Col>
          {session.openedBy && (
            <Col span={24} style={{ marginTop: 8 }}>
              <Text type="secondary">Opened by: {session.openedBy}</Text>
            </Col>
          )}
        </Row>
      )}

      {hasVariance && (
        <Alert
          style={{ marginTop: 12 }}
          type={yesterdayVariance.shortageOrExcess < 0 ? 'error' : 'warning'}
          showIcon
          icon={<WarningOutlined />}
          message={`Yesterday's variance: ${fmt(yesterdayVariance.shortageOrExcess)}`}
          description={`Expected Rs ${yesterdayVariance.expectedCash?.toFixed(2)}, Counted Rs ${yesterdayVariance.closingCash?.toFixed(2)}`}
        />
      )}
    </Card>
  );
};

// ---- Widget: Stock Levels ----
const StockWidget = ({ stockData }) => {
  const navigate = useNavigate();
  const { units, lowStockAlerts, totalStockValue } = stockData;

  return (
    <Card
      title={<><FireOutlined /> Stock Levels</>}
      extra={<Text type="secondary">Total: {fmt(totalStockValue)}</Text>}
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
      <Row gutter={[12, 12]}>
        {units.map(u => {
          const pct = u.utilizationPct;
          const color = pct < 20 ? '#ff4d4f' : pct < 40 ? '#faad14' : '#52c41a';
          return (
            <Col xs={24} sm={12} key={u._id}>
              <Card size="small" style={{ border: `1px solid ${u.isLowStock ? '#ff4d4f' : '#f0f0f0'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong>{u.name}</Text>
                  <Space size={4}>
                    {u.status === 'inactive' && <Tag color="default">Inactive</Tag>}
                    {u.isLowStock && <Tag color="error">⚠ Low Stock</Tag>}
                  </Space>
                </div>
                <Tooltip title={`${u.currentStock.toFixed(1)}L / ${u.capacity}L — Avg cost: ${fmt(u.avgCost)}/L`}>
                  <Progress percent={Math.min(pct, 100)} strokeColor={color} size="small"
                    format={() => `${u.currentStock.toFixed(0)}L`} />
                </Tooltip>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Capacity: {u.capacity}L</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Value: {fmt(u.stockValue)}</Text>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
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
    <div>
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
          {/* Row 1: Session + Cash Position */}
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <CashSessionWidget
                session={data.cashSession}
                yesterdayVariance={data.yesterdayVariance}
              />
            </Col>
            <Col xs={24} md={16}>
              <SalesKPIs
                sales={data.today.sales}
                expenses={data.today.expenses}
                paymentsReceived={data.today.paymentsReceived}
                netCash={data.today.netCash}
              />
            </Col>
          </Row>

          {/* Row 2: Stock + Customer Dues */}
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <StockWidget stockData={data.stock} />
            </Col>
            <Col xs={24} md={12}>
              <TopDuesWidget duesData={data.customerDues} />
            </Col>
          </Row>

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
