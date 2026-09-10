import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Tabs, DatePicker, Button, Select, Table, Card, Statistic,
  Row, Col, Divider, Tag, Space, Typography, Descriptions,
  Radio, Empty, Spin, message,
} from 'antd';
import {
  FileTextOutlined, UserOutlined, DatabaseOutlined,
  RiseOutlined, SearchOutlined, PrinterOutlined,
  TeamOutlined, ShopOutlined, DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import defaultBusinessLogo from '../../assets/Niaz-logo.svg';
import './ReportsPage.css';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const currencyFormatter = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt = (v) => `Rs ${currencyFormatter.format(Number(v || 0))}`;
const fmtL = (v) => `${numberFormatter.format(Number(v || 0))} L`;

const ReportPrintContext = createContext(false);
const useReportPrinting = () => useContext(ReportPrintContext);

const ReportPrintView = ({ reportId, title, type, active, children, businessProfile, generatedBy }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('All available records');

  useEffect(() => {
    const resetPrintState = () => {
      setIsPrinting(false);
      delete document.documentElement.dataset.printingReport;
    };
    window.addEventListener('afterprint', resetPrintState);
    return () => window.removeEventListener('afterprint', resetPrintState);
  }, []);

  const handlePrint = () => {
    const selectedDates = Array.from(
      document.querySelectorAll('.report-print-view.is-active .ant-picker-input input')
    ).map((input) => input.value).filter(Boolean);
    setReportPeriod(selectedDates.length ? selectedDates.join(' to ') : 'All available records');
    setGeneratedAt(new Date());
    setIsPrinting(true);
    document.documentElement.dataset.printingReport = reportId;
    window.setTimeout(() => window.print(), 100);
  };

  const stamp = generatedAt ? dayjs(generatedAt) : null;
  const businessName = businessProfile?.name || 'Niaz Gohram Petrol Pump';
  // The bundled logo is the initial business logo. Owners can replace it (or remove it)
  // from Business Profile; a removed/unavailable image leaves the text header intact.
  const logo = businessProfile?.logo || defaultBusinessLogo;

  return (
    <section className={`report-print-view${active ? ' is-active' : ''}`} data-report-id={reportId}>
      <header className="report-print-header">
        <div className="report-print-brand">
          {logo && <img src={logo} alt="Business logo" className="report-print-logo" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
          <div>
            <h1>{businessName}</h1>
            <p className="report-print-tagline">Business Operations Report</p>
          </div>
        </div>
        <div className="report-print-document">
          <strong>{title}</strong>
          <span>{type}</span>
          <span>Period: {reportPeriod}</span>
        </div>
      </header>
      <div className="report-print-toolbar no-print">
        <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Print / Export PDF
        </Button>
      </div>
      <ReportPrintContext.Provider value={isPrinting}>{children}</ReportPrintContext.Provider>
      <footer className="report-print-footer">
        Generated on {stamp?.format('DD MMMM YYYY, hh:mm A') || '—'} by {generatedBy || 'System'}
        <span className="report-footer-page">Page <span className="report-page-number" /></span>
      </footer>
    </section>
  );
};

// ============================================================
// Tab 1: Daily Summary
// ============================================================
const DailyReport = () => {
  const [date, setDate] = useState(dayjs());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async (d) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/reports/daily?date=${d.format('YYYY-MM-DD')}`);
      setData(res.data.data);
    } catch {
      message.error('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(date); }, []);

  const salesColumns = [
    { title: 'Customer', dataIndex: ['customerId', 'name'], render: (_, r) => r.customerId?.name || '—' },
    { title: 'Unit', dataIndex: ['unitId', 'name'], render: (_, r) => r.unitId?.name || '—' },
    { title: 'Qty (L)', dataIndex: 'quantity', align: 'right' },
    { title: 'Rate', dataIndex: 'rate', render: fmt, align: 'right' },
    { title: 'Amount', dataIndex: 'amount', render: fmt, align: 'right' },
    { title: 'Payment', dataIndex: 'paymentType', render: (v) => <Tag color={v === 'cash' ? 'green' : v === 'credit' ? 'red' : 'orange'}>{v}</Tag> },
    { title: 'Due', dataIndex: 'dueAmount', render: (v) => v > 0 ? <span style={{ color: '#cf1322' }}>{fmt(v)}</span> : '—', align: 'right' },
  ];

  const expenseColumns = [
    { title: 'Category', dataIndex: 'category' },
    { title: 'Amount', dataIndex: 'amount', render: fmt, align: 'right' },
    { title: 'Mode', dataIndex: 'mode', render: (m) => <Tag color={m === 'cash' ? 'green' : 'purple'}>{m}</Tag> },
    { title: 'Notes', dataIndex: 'notes', render: (n) => n || '—' },
  ];

  return (
    <div className="daily-report">
      <Space className="report-filter-controls" style={{ marginBottom: 16 }}>
        <DatePicker value={date} onChange={(d) => { setDate(d); fetchReport(d); }} />
        <Button icon={<SearchOutlined />} type="primary" onClick={() => fetchReport(date)}>Load</Button>
      </Space>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <Row gutter={[16, 16]} className="report-summary-cards">
            <Col xs={24} sm={12} lg={6}><Card><Statistic title="Total Sales" value={data.sales.totalAmount} prefix="Rs" precision={2} valueStyle={{ color: '#389e0d' }} /></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Statistic title="Cash Sales" value={data.sales.cashSales} prefix="Rs" precision={2} /></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Statistic title="Credit Sales" value={data.sales.creditSales} prefix="Rs" precision={2} /></Card></Col>
            <Col xs={24} sm={12} lg={6}><Card><Statistic title="Gross Profit" value={data.sales.grossProfit} prefix="Rs" precision={2} valueStyle={{ color: data.sales.grossProfit >= 0 ? '#389e0d' : '#cf1322' }} /></Card></Col>
          </Row>
          <Row gutter={[16, 16]} className="report-summary-cards">
            <Col xs={24} sm={8}><Card><Statistic title="Liters Sold" value={data.sales.totalLiters} suffix="L" precision={2} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Payments Received" value={data.payments.totalReceived} prefix="Rs" precision={2} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Total Expenses" value={data.expenses.totalExpenses} prefix="Rs" precision={2} valueStyle={{ color: '#fa8c16' }} /></Card></Col>
          </Row>

          {/* Cash Session */}
          {data.cashSession && (
            <Card className="daily-cash-session" title="Cash Session" size="small">
              <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }} bordered>
                <Descriptions.Item label="Opening">{fmt(data.cashSession.openingCash)}</Descriptions.Item>
                <Descriptions.Item label="Expected">{fmt(data.cashSession.expectedCash)}</Descriptions.Item>
                <Descriptions.Item label="Actual">{fmt(data.cashSession.closingCash)}</Descriptions.Item>
                <Descriptions.Item label="Difference">
                  <span style={{ color: data.cashSession.shortageOrExcess >= 0 ? '#389e0d' : '#cf1322', fontWeight: 'bold' }}>
                    {data.cashSession.shortageOrExcess >= 0 ? '+' : ''}{fmt(data.cashSession.shortageOrExcess)}
                  </span>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Divider orientation="left">Sales ({data.sales.count})</Divider>
          <Table className="report-data-table" dataSource={data.sales.items} columns={salesColumns} rowKey="_id" pagination={false} size="small" />

          <Divider orientation="left">Expenses ({data.expenses.count})</Divider>
          <Table className="report-data-table" dataSource={data.expenses.items} columns={expenseColumns} rowKey="_id" pagination={false} size="small" />
        </>
      )}
    </div>
  );
};

// ============================================================
// Tab 2: Customer Ledger
// ============================================================
const CustomerLedger = () => {
  const isPrinting = useReportPrinting();
  const [customers, setCustomers] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosInstance.get('/customers?type=credit').then(r => setCustomers(r.data.data)).catch(() => {});
  }, []);

  const fetchLedger = async () => {
    if (!selectedCust) { message.warning('Select a customer'); return; }
    setLoading(true);
    try {
      let url = `/reports/ledger/${selectedCust}`;
      const params = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      if (params.length) url += '?' + params.join('&');
      const res = await axiosInstance.get(url);
      setData(res.data.data);
    } catch {
      message.error('Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  const ledgerColumns = [
    { title: 'Date', dataIndex: 'date', render: (d) => dayjs(d).format('DD MMM YYYY'), width: 110 },
    { title: 'Type', dataIndex: 'type', render: (t) => <Tag color={t === 'sale' ? 'orange' : 'green'}>{t === 'sale' ? 'Sale' : 'Payment'}</Tag>, width: 90 },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Debit (Rs)', dataIndex: 'debit', render: (v) => v > 0 ? <span style={{ color: '#cf1322' }}>{fmt(v)}</span> : '—', align: 'right', width: 110 },
    { title: 'Credit (Rs)', dataIndex: 'credit', render: (v) => v > 0 ? <span style={{ color: '#389e0d' }}>{fmt(v)}</span> : '—', align: 'right', width: 110 },
    { title: 'Balance (Rs)', dataIndex: 'balance', render: (v) => <strong style={{ color: v > 0 ? '#cf1322' : '#389e0d' }}>{fmt(v)}</strong>, align: 'right', width: 120 },
  ];

  return (
    <div>
      <Space className="report-filter-controls" style={{ marginBottom: 16 }} wrap>
        <Select
          showSearch placeholder="Select credit customer" style={{ width: 240 }}
          optionFilterProp="label"
          onChange={setSelectedCust}
          options={customers.map(c => ({ value: c._id, label: `${c.name}${c.phone ? ` (${c.phone})` : ''}` }))}
        />
        <RangePicker onChange={setDateRange} placeholder={['From date', 'To date']} />
        <Button icon={<SearchOutlined />} type="primary" onClick={fetchLedger}>Load Ledger</Button>
      </Space>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {!loading && data && (
        <>
          <section className="customer-ledger-billed-to" aria-label="Customer details">
            <div className="customer-ledger-billed-to-label">Billed To</div>
            <Descriptions className="customer-ledger-details" column={{ xs: 1, sm: 3 }} size="small" colon={false}>
              <Descriptions.Item label="Customer">{data.customer.name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{data.customer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Credit Limit">{fmt(data.customer.creditLimit)}</Descriptions.Item>
            </Descriptions>
          </section>

          <Row gutter={[16, 16]} className="customer-ledger-balance-cards">
            <Col xs={24} sm={12}><Card><Statistic title="Opening Balance" value={data.openingBalance} prefix="Rs" precision={2} /></Card></Col>
            <Col xs={24} sm={12}><Card><Statistic title="Current Balance" value={data.currentBalance} prefix="Rs" precision={2} valueStyle={{ color: data.currentBalance > 0 ? '#cf1322' : '#389e0d' }} /></Card></Col>
          </Row>

          <Table className="customer-ledger-table"
            dataSource={data.transactions} columns={ledgerColumns} rowKey={(r, i) => `${r.type}-${i}`}
            pagination={isPrinting ? false : { pageSize: 30 }} size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={3}><strong>Totals</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong style={{ color: '#cf1322' }}>{fmt(data.summary.totalDebit)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong style={{ color: '#389e0d' }}>{fmt(data.summary.totalCredit)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{fmt(data.currentBalance)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}
      {!loading && !data && <Empty description="Select a customer and load ledger" />}
    </div>
  );
};

// ============================================================
// Tab 3: Stock Report
// ============================================================
const StockReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/reports/stock')
      .then(r => setData(r.data.data))
      .catch(() => message.error('Failed to load stock report'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Unit / Tank', dataIndex: 'name', key: 'name' },
    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'active' ? 'green' : s === 'maintenance' ? 'orange' : 'red'}>{s}</Tag> },
    { title: 'Capacity (L)', dataIndex: 'capacity', render: fmtL, align: 'right' },
    { title: 'Current Stock (L)', dataIndex: 'currentStock', render: fmtL, align: 'right' },
    { title: 'Avg Cost (Rs/L)', dataIndex: 'avgCost', render: fmt, align: 'right' },
    { title: 'Stock Value (Rs)', dataIndex: 'stockValue', render: (v) => <strong>{fmt(v)}</strong>, align: 'right' },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />;

  return (
    <div className="stock-report">
      {data && (
        <>
          <Row gutter={[16, 16]} className="report-summary-cards">
            <Col xs={24} sm={8}><Card><Statistic title="Total Stock" value={data.summary.totalLiters} suffix="L" precision={2} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Total Stock Value" value={data.summary.totalStockValue} prefix="Rs" precision={2} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Active Units" value={data.units.filter(u => u.status === 'active').length} suffix={`/ ${data.units.length}`} /></Card></Col>
          </Row>
          <Table className="report-data-table" dataSource={data.units} columns={columns} rowKey="_id" pagination={false}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={3}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{fmtL(data.summary.totalLiters)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell />
                <Table.Summary.Cell align="right"><strong>{fmt(data.summary.totalStockValue)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </>
      )}
    </div>
  );
};

// ============================================================
// Tab 4: Profit Report
// ============================================================
const ProfitReport = () => {
  const isPrinting = useReportPrinting();
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = [`groupBy=${groupBy}`];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      const res = await axiosInstance.get(`/reports/profit?${params.join('&')}`);
      setData(res.data.data);
    } catch {
      message.error('Failed to load profit report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const dayColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Revenue', dataIndex: 'totalRevenue', render: fmt, align: 'right' },
    { title: 'Cost', dataIndex: 'totalCost', render: fmt, align: 'right' },
    { title: 'Gross Profit', dataIndex: 'totalProfit', render: (v) => <strong style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>{fmt(v)}</strong>, align: 'right' },
  ];

  const unitColumns = [
    { title: 'Unit', dataIndex: 'unit', render: (u) => u?.name || u || '—' },
    { title: 'Revenue', dataIndex: 'totalRevenue', render: fmt, align: 'right' },
    { title: 'Cost', dataIndex: 'totalCost', render: fmt, align: 'right' },
    { title: 'Gross Profit', dataIndex: 'totalProfit', render: (v) => <strong style={{ color: v >= 0 ? '#389e0d' : '#cf1322' }}>{fmt(v)}</strong>, align: 'right' },
  ];

  const summary = data?.summary;

  return (
    <div className="profit-report">
      <Space className="report-filter-controls" style={{ marginBottom: 16 }} wrap>
        <RangePicker value={dateRange} onChange={setDateRange} />
        <Radio.Group value={groupBy} onChange={(e) => setGroupBy(e.target.value)} buttonStyle="solid">
          <Radio.Button value="day">By Day</Radio.Button>
          <Radio.Button value="unit">By Unit</Radio.Button>
        </Radio.Group>
        <Button icon={<SearchOutlined />} type="primary" onClick={fetchReport}>Generate</Button>
      </Space>

      {loading && <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />}

      {!loading && data && (
        <>
          {summary && (
            <Row gutter={[16, 16]} className="report-summary-cards">
              <Col xs={24} sm={8}><Card><Statistic title="Total Revenue" value={summary.totalRevenue} prefix="Rs" precision={2} valueStyle={{ color: '#389e0d' }} /></Card></Col>
              <Col xs={24} sm={8}><Card><Statistic title="Total Cost" value={summary.totalCost} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col xs={24} sm={8}><Card><Statistic title="Gross Profit" value={summary.totalProfit} prefix="Rs" precision={2} valueStyle={{ color: summary.totalProfit >= 0 ? '#389e0d' : '#cf1322' }} /></Card></Col>
            </Row>
          )}

          <Table className="report-data-table"
            dataSource={data.rows}
            columns={groupBy === 'day' ? dayColumns : unitColumns}
            rowKey={(r) => r.date || r.unit?._id || r.unit}
            pagination={isPrinting ? false : { pageSize: 30 }}
            size="small"
          />
        </>
      )}
      {!loading && !data && <Empty description="Set a date range and generate the report" />}
    </div>
  );
};

// ============================================================
// Tab 5: Customer Dues
// ============================================================
const CustomerDues = () => {
  const isPrinting = useReportPrinting();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchDues = useCallback(async (all = showAll) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/reports/customer-dues?all=${all}`);
      setData(res.data.data);
    } catch { message.error('Failed to load customer dues'); }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => { fetchDues(false); }, []);

  const columns = [
    { title: 'Customer', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone', render: p => p || '—' },
    { title: 'Credit Limit', dataIndex: 'creditLimit', render: fmt, align: 'right' },
    { title: 'Balance Due', dataIndex: 'currentBalance', render: v => <strong style={{ color: '#cf1322' }}>{fmt(v)}</strong>, align: 'right' },
    { title: 'Available Credit', dataIndex: 'availableCredit', render: v => <span style={{ color: v < 0 ? '#cf1322' : '#389e0d' }}>{fmt(v)}</span>, align: 'right' },
    { title: 'Last Payment', dataIndex: 'lastPaymentDate', render: d => d ? dayjs(d).format('DD MMM YY') : '—' },
  ];

  const summary = data?.summary;

  return (
    <div className="customer-dues-report">
      <Space className="report-filter-controls customer-dues-controls" style={{ marginBottom: 16 }}>
        <Radio.Group
          value={showAll ? 'all' : 'dues'}
          onChange={e => { const a = e.target.value === 'all'; setShowAll(a); fetchDues(a); }}
          buttonStyle="solid"
        >
          <Radio.Button value="dues">With Balance Only</Radio.Button>
          <Radio.Button value="all">All Credit Customers</Radio.Button>
        </Radio.Group>
      </Space>

      {summary && (
        <Row gutter={[16, 16]} className="customer-dues-balance-cards">
          <Col xs={24} sm={12}><Card><Statistic title="Total Balance Due" value={summary.totalDues} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          <Col xs={24} sm={12}><Card><Statistic title="Customers with Balance" value={summary.count} /></Card></Col>
        </Row>
      )}
      {loading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : (
        <Table className="customer-dues-table"
          dataSource={data?.customers} columns={columns} rowKey="_id"
          pagination={isPrinting ? false : { pageSize: 30 }} size="small"
          rowClassName={(record) => Number(record.currentBalance || 0) > Number(record.creditLimit || 0) ? 'customer-dues-over-limit' : ''}
          summary={() => summary && (
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={3}><strong>Total ({summary.count} customers)</strong></Table.Summary.Cell>
              <Table.Summary.Cell align="right"><strong style={{ color: '#cf1322' }}>{fmt(summary.totalDues)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      )}
    </div>
  );
};

// ============================================================
// Tab 6: Supplier Dues
// ============================================================
const SupplierDues = () => {
  const isPrinting = useReportPrinting();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchDues = useCallback(async (all = showAll) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/reports/supplier-dues?all=${all}`);
      setData(res.data.data);
    } catch { message.error('Failed to load supplier dues'); }
    finally { setLoading(false); }
  }, [showAll]);

  useEffect(() => { fetchDues(false); }, []);

  const columns = [
    { title: 'Supplier', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone', render: p => p || '—' },
    { title: 'Outstanding Payable', dataIndex: 'outstandingPayable', render: v => <strong style={{ color: '#cf1322' }}>{fmt(v)}</strong>, align: 'right' },
    { title: 'Last Purchase', dataIndex: 'lastPurchaseDate', render: d => d ? dayjs(d).format('DD MMM YY') : '—' },
    { title: 'Last Payment', dataIndex: 'lastPaymentDate', render: d => d ? dayjs(d).format('DD MMM YY') : '—' },
  ];

  return (
    <div className="supplier-dues-report">
      <Space className="report-filter-controls supplier-dues-controls" style={{ marginBottom: 16 }}>
        <Radio.Group
          value={showAll ? 'all' : 'dues'}
          onChange={e => { const a = e.target.value === 'all'; setShowAll(a); fetchDues(a); }}
          buttonStyle="solid"
        >
          <Radio.Button value="dues">With Balance Only</Radio.Button>
          <Radio.Button value="all">All Suppliers</Radio.Button>
        </Radio.Group>
      </Space>

      {data?.summary && (
        <Row gutter={[16, 16]} className="supplier-dues-balance-cards">
          <Col xs={24} sm={12}><Card><Statistic title="Total Payable" value={data.summary.totalPayable} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          <Col xs={24} sm={12}><Card><Statistic title="Suppliers with Balance" value={data.summary.count} /></Card></Col>
        </Row>
      )}

      {loading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : (
        <Table className="supplier-dues-table"
          dataSource={data?.suppliers} columns={columns} rowKey="_id"
          pagination={isPrinting ? false : { pageSize: 20 }} size="small"
          summary={() => data?.summary && (
            <Table.Summary.Row>
              <Table.Summary.Cell colSpan={2}><strong>Total ({data.summary.count} suppliers)</strong></Table.Summary.Cell>
              <Table.Summary.Cell align="right"><strong style={{ color: '#cf1322' }}>{fmt(data.summary.totalPayable)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      )}
    </div>
  );
};

// ============================================================
// Tab 7: Expense Summary
// ============================================================
const ExpenseSummaryReport = () => {
  const isPrinting = useReportPrinting();
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs()]);
  const [groupBy, setGroupBy] = useState('category');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = [`groupBy=${groupBy}`];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      const res = await axiosInstance.get(`/reports/expenses?${params.join('&')}`);
      setData(res.data.data);
    } catch { message.error('Failed to load expense report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const groupColumns = [
    { title: groupBy === 'day' ? 'Date' : groupBy === 'mode' ? 'Mode' : 'Category', dataIndex: 'label' },
    { title: 'Count', dataIndex: 'count', align: 'right' },
    { title: 'Cash', dataIndex: 'cashAmount', render: fmt, align: 'right' },
    { title: 'Bank', dataIndex: 'bankAmount', render: fmt, align: 'right' },
    { title: 'Total', dataIndex: 'totalAmount', render: v => <strong>{fmt(v)}</strong>, align: 'right' },
  ];

  const itemColumns = [
    { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY'), width: 100 },
    { title: 'Category', dataIndex: 'category' },
    { title: 'Mode', dataIndex: 'mode', render: m => <Tag color={m === 'cash' ? 'green' : 'purple'}>{m}</Tag> },
    { title: 'Amount', dataIndex: 'amount', render: fmt, align: 'right' },
    { title: 'Notes', dataIndex: 'notes', render: n => n || '—', ellipsis: true },
  ];

  const summary = data?.summary;

  return (
    <div>
      <Space className="report-filter-controls" wrap style={{ marginBottom: 16 }}>
        <RangePicker value={dateRange} onChange={setDateRange} />
        <Radio.Group value={groupBy} onChange={e => setGroupBy(e.target.value)} buttonStyle="solid">
          <Radio.Button value="category">By Category</Radio.Button>
          <Radio.Button value="day">By Day</Radio.Button>
          <Radio.Button value="mode">By Mode</Radio.Button>
        </Radio.Group>
        <Button type="primary" icon={<SearchOutlined />} onClick={fetchReport}>Generate</Button>
      </Space>

      {loading ? <Spin size="large" style={{ display: 'block', margin: '40px auto' }} /> : (
        <>
          {summary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="Total Expenses" value={summary.grandTotal} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Card></Col>
              <Col span={6}><Card><Statistic title="Cash Expenses" value={summary.totalCash} prefix="Rs" precision={2} /></Card></Col>
              <Col span={6}><Card><Statistic title="Bank Expenses" value={summary.totalBank} prefix="Rs" precision={2} /></Card></Col>
              <Col span={6}><Card><Statistic title="Total Entries" value={summary.itemCount} /></Card></Col>
            </Row>
          )}
          <Divider orientation="left">Grouped Summary</Divider>
          <Table dataSource={data?.rows} columns={groupColumns} rowKey="label" pagination={false} size="small"
            summary={() => summary && (
              <Table.Summary.Row>
                <Table.Summary.Cell><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{summary.itemCount}</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{fmt(summary.totalCash)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{fmt(summary.totalBank)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell align="right"><strong>{fmt(summary.grandTotal)}</strong></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
          <Divider orientation="left">All Entries</Divider>
          <Table dataSource={data?.items} columns={itemColumns} rowKey="_id" pagination={isPrinting ? false : { pageSize: 30 }} size="small" />
        </>
      )}
      {!loading && !data && <Empty description="Set a date range and generate the report" />}
    </div>
  );
};

// ============================================================
// Main ReportsPage
// ============================================================
const ReportsPage = () => {
  const [activeKey, setActiveKey] = useState('daily');
  const [businessProfile, setBusinessProfile] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    axiosInstance.get('/setup/business-profile')
      .then((res) => setBusinessProfile(res.data.data))
      .catch(() => setBusinessProfile({ name: '', logo: '' }));
  }, []);
  const tabs = [
    { key: 'daily', label: <span><FileTextOutlined /> Daily Summary</span>, title: 'Daily Summary', type: 'Daily operations', content: <DailyReport /> },
    { key: 'ledger', label: <span><UserOutlined /> Customer Ledger</span>, title: 'Customer Ledger', type: 'Customer account statement', content: <CustomerLedger /> },
    { key: 'custDues', label: <span><TeamOutlined /> Customer Dues</span>, title: 'Customer Dues', type: 'Accounts receivable', content: <CustomerDues /> },
    { key: 'suppDues', label: <span><ShopOutlined /> Supplier Dues</span>, title: 'Supplier Dues', type: 'Accounts payable', content: <SupplierDues /> },
    { key: 'stock', label: <span><DatabaseOutlined /> Stock Report</span>, title: 'Stock Report', type: 'Current inventory', content: <StockReport /> },
    { key: 'profit', label: <span><RiseOutlined /> Profit Report</span>, title: 'Profit Report', type: 'Sales margin analysis', content: <ProfitReport /> },
    { key: 'expenses', label: <span><DollarOutlined /> Expense Summary</span>, title: 'Expense Summary', type: 'Operating expenses', content: <ExpenseSummaryReport /> },
  ].map(({ key, label, title, type, content }) => ({
    key,
    label,
    children: <ReportPrintView reportId={key} title={title} type={type} active={activeKey === key} businessProfile={businessProfile} generatedBy={user?.name || user?.username}>{content}</ReportPrintView>,
  }));

  return (
    <div className="reports-page">
      <Title level={3}>📊 Reports</Title>
      <Tabs items={tabs} activeKey={activeKey} onChange={setActiveKey} destroyInactiveTabPane={false} />
    </div>
  );
};

export default ReportsPage;
