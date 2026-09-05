import { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Modal, Form, InputNumber, Input,
  Descriptions, Tag, Alert, Statistic, Row, Col,
  Table, Divider, message, Popconfirm, Space, Typography,
} from 'antd';
import {
  LockOutlined, UnlockOutlined, PlayCircleOutlined,
  CheckCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CashSessionPage = () => {
  const { isOwner } = useAuth();

  // Today's session state
  const [todaySession, setTodaySession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // All sessions list
  const [sessions, setSessions] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  // Modals
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  // ---- Fetchers ----
  const fetchTodaySession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await axiosInstance.get('/cash-sessions/today');
      const session = res.data.data;
      setTodaySession(session);

      // If open, also fetch the live summary
      if (session && session.status === 'open') {
        const sumRes = await axiosInstance.get(`/cash-sessions/${session._id}/summary`);
        setSummary(sumRes.data.data.summary);
      } else {
        setSummary(null);
      }
    } catch {
      message.error('Failed to load today\'s session');
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await axiosInstance.get('/cash-sessions');
      setSessions(res.data.data);
    } catch {
      message.error('Failed to load sessions history');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaySession();
    fetchSessions();
  }, [fetchTodaySession, fetchSessions]);

  // ---- Actions ----
  const handleOpenSession = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/cash-sessions/open', {
        openingCash: values.openingCash || 0,
      });
      message.success('Cash session opened for today');
      setOpenModalVisible(false);
      openForm.resetFields();
      fetchTodaySession();
      fetchSessions();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to open session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefreshSummary = async () => {
    if (!todaySession) return;
    try {
      const sumRes = await axiosInstance.get(`/cash-sessions/${todaySession._id}/summary`);
      setSummary(sumRes.data.data.summary);
      message.success('Summary refreshed');
    } catch {
      message.error('Failed to refresh summary');
    }
  };

  const handleCloseSession = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post(`/cash-sessions/${todaySession._id}/close`, {
        closingCash: values.closingCash,
        notes: values.notes,
      });
      message.success('Day closed successfully');
      setCloseModalVisible(false);
      closeForm.resetFields();
      fetchTodaySession();
      fetchSessions();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to close session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopenSession = async (sessionId) => {
    try {
      await axiosInstance.post(`/cash-sessions/${sessionId}/reopen`);
      message.success('Session reopened');
      fetchTodaySession();
      fetchSessions();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to reopen session');
    }
  };

  // ---- Helpers ----
  const fmtCurrency = (v) => `Rs ${Number(v || 0).toFixed(2)}`;

  const shortageColor = (val) => {
    if (val > 0) return '#389e0d'; // surplus
    if (val < 0) return '#cf1322'; // shortage
    return '#000';
  };

  // ---- Sessions History Table ----
  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => dayjs(d).format('DD MMM YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={s === 'open' ? 'green' : 'red'} icon={s === 'open' ? <UnlockOutlined /> : <LockOutlined />}>
          {s === 'open' ? 'Open' : 'Closed'}
        </Tag>
      ),
    },
    { title: 'Opening Cash', dataIndex: 'openingCash', key: 'openingCash', render: fmtCurrency, align: 'right' },
    { title: 'Cash Sales', dataIndex: 'totalCashSales', key: 'cashSales', render: fmtCurrency, align: 'right' },
    { title: 'Payments In', dataIndex: 'totalCashPaymentsReceived', key: 'payIn', render: fmtCurrency, align: 'right' },
    { title: 'Cash Expenses', dataIndex: 'totalCashExpenses', key: 'cashExp', render: fmtCurrency, align: 'right' },
    { title: 'Paid to Suppliers', dataIndex: 'totalCashPaidToSuppliers', key: 'supplierPay', render: fmtCurrency, align: 'right' },
    { title: 'Expected', dataIndex: 'expectedCash', key: 'expected', render: fmtCurrency, align: 'right' },
    { title: 'Actual', dataIndex: 'closingCash', key: 'actual', render: fmtCurrency, align: 'right' },
    {
      title: 'Diff',
      dataIndex: 'shortageOrExcess',
      key: 'diff',
      align: 'right',
      render: (v) =>
        v !== 0 ? (
          <span style={{ color: shortageColor(v), fontWeight: 'bold' }}>
            {v > 0 ? '+' : ''}{fmtCurrency(v)}
          </span>
        ) : <span>—</span>,
    },
    {
      title: 'Closed By',
      dataIndex: 'closedBy',
      key: 'closedBy',
      render: (u) => u?.name || '—',
    },
    ...(isOwner ? [{
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.status === 'closed' ? (
          <Popconfirm
            title="Reopen this closed day?"
            description="New entries will be allowed again."
            onConfirm={() => handleReopenSession(record._id)}
            okText="Reopen"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" icon={<UnlockOutlined />}>Reopen</Button>
          </Popconfirm>
        ) : null,
    }] : []),
  ];

  // ---- Render: Today's Session Panel ----
  const renderTodayPanel = () => {
    if (sessionLoading) return <Card loading />;

    if (!todaySession) {
      return (
        <Card
          title="📅 Today's Cash Session"
          style={{ marginBottom: 24 }}
          extra={
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => setOpenModalVisible(true)}
            >
              Open Day
            </Button>
          }
        >
          <Alert
            type="warning"
            showIcon
            message="No session started for today"
            description="Open a cash session to begin recording sales, purchases, payments, and expenses for today."
          />
        </Card>
      );
    }

    if (todaySession.status === 'closed') {
      const s = todaySession;
      return (
        <Card
          title={<><LockOutlined /> Today's Session — CLOSED</>}
          style={{ marginBottom: 24 }}
          extra={isOwner && (
            <Popconfirm
              title="Reopen today's session?"
              description="This allows adding new entries for today."
              onConfirm={() => handleReopenSession(s._id)}
              okText="Reopen"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<UnlockOutlined />} danger>Reopen Day</Button>
            </Popconfirm>
          )}
        >
          <Row gutter={16}>
            <Col span={4}><Statistic title="Opening Cash" value={s.openingCash} prefix="Rs" precision={2} /></Col>
            <Col span={4}><Statistic title="Cash Sales" value={s.totalCashSales} prefix="Rs" precision={2} valueStyle={{ color: '#389e0d' }} /></Col>
            <Col span={4}><Statistic title="Payments In (Cash)" value={s.totalCashPaymentsReceived} prefix="Rs" precision={2} valueStyle={{ color: '#1890ff' }} /></Col>
            <Col span={4}><Statistic title="Cash Expenses" value={s.totalCashExpenses} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Col>
            <Col span={4}><Statistic title="Paid to Suppliers" value={s.totalCashPaidToSuppliers} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Col>
          </Row>
          <Divider />
          <Row gutter={16}>
            <Col span={8}><Statistic title="Expected Cash" value={s.expectedCash} prefix="Rs" precision={2} /></Col>
            <Col span={8}><Statistic title="Actual Cash (Counted)" value={s.closingCash} prefix="Rs" precision={2} /></Col>
            <Col span={8}>
              <Statistic
                title={s.shortageOrExcess >= 0 ? '✅ Excess' : '⚠️ Shortage'}
                value={Math.abs(s.shortageOrExcess)}
                prefix="Rs"
                precision={2}
                valueStyle={{ color: shortageColor(s.shortageOrExcess) }}
              />
            </Col>
          </Row>
          {s.notes && <><Divider /><Text type="secondary">Notes: {s.notes}</Text></>}
        </Card>
      );
    }

    // Session is OPEN
    return (
      <Card
        title={<><UnlockOutlined style={{ color: '#52c41a' }} /> Today's Session — OPEN</>}
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Button onClick={handleRefreshSummary}>Refresh</Button>
            <Button
              type="primary"
              danger
              icon={<LockOutlined />}
              onClick={() => setCloseModalVisible(true)}
            >
              Close Day
            </Button>
          </Space>
        }
      >
        <Text type="secondary">Opened by: <strong>{todaySession.openedBy?.name}</strong> · Opening Cash: <strong>{fmtCurrency(todaySession.openingCash)}</strong></Text>

        {summary && (
          <>
            <Divider orientation="left">Live Cash Summary</Divider>
            <Row gutter={16}>
              <Col span={4}><Statistic title="Cash Sales" value={summary.totalCashSales} prefix="Rs" precision={2} valueStyle={{ color: '#389e0d' }} /></Col>
              <Col span={4}><Statistic title="Payments In (Cash)" value={summary.totalCashPaymentsReceived} prefix="Rs" precision={2} valueStyle={{ color: '#1890ff' }} /></Col>
              <Col span={4}><Statistic title="Cash Expenses" value={summary.totalCashExpenses} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Col>
              <Col span={4}><Statistic title="Paid to Suppliers" value={summary.totalCashPaidToSuppliers} prefix="Rs" precision={2} valueStyle={{ color: '#cf1322' }} /></Col>
              <Col span={4}><Statistic title="Expected in Drawer" value={summary.expectedCash} prefix="Rs" precision={2} valueStyle={{ fontWeight: 'bold' }} /></Col>
            </Row>
            <Alert
              style={{ marginTop: 16 }}
              type="info"
              showIcon
              message={`When you close the day, count the actual cash and enter it below. Expected: ${fmtCurrency(summary.expectedCash)}`}
            />
          </>
        )}
      </Card>
    );
  };

  return (
    <div>
      <Title level={3}>🏦 Cash Session & Day Closing</Title>

      {renderTodayPanel()}

      <Card title="📋 Session History" loading={listLoading}>
        <Table
          dataSource={sessions}
          columns={historyColumns}
          rowKey="_id"
          pagination={{ pageSize: 15 }}
          scroll={{ x: true }}
          rowClassName={(record) => record.status === 'closed' ? '' : 'ant-table-row-selected'}
        />
      </Card>

      {/* Open Session Modal */}
      <Modal
        title={<><PlayCircleOutlined /> Open Cash Session</>}
        open={openModalVisible}
        onCancel={() => { setOpenModalVisible(false); openForm.resetFields(); }}
        onOk={() => openForm.submit()}
        okText="Open Day"
        confirmLoading={submitting}
        width={420}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="Opening a session marks the start of today's business day."
          style={{ marginBottom: 16 }}
        />
        <Form form={openForm} layout="vertical" onFinish={handleOpenSession}>
          <Form.Item
            name="openingCash"
            label="Opening Cash in Drawer (Rs)"
            rules={[{ type: 'number', min: 0, message: 'Must be non-negative' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="Rs"
              placeholder="0.00 (enter yesterday's closing cash)"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Close Session Modal */}
      <Modal
        title={<><LockOutlined /> Close Day</>}
        open={closeModalVisible}
        onCancel={() => { setCloseModalVisible(false); closeForm.resetFields(); }}
        onOk={() => closeForm.submit()}
        okText="Close Day"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
        width={460}
        destroyOnClose
      >
        {summary && (
          <Alert
            type="warning"
            showIcon
            message={`Expected cash in drawer: ${fmtCurrency(summary.expectedCash)}`}
            description="Count the actual cash and enter below. Any difference will be recorded as shortage/excess."
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={closeForm} layout="vertical" onFinish={handleCloseSession}>
          <Form.Item
            name="closingCash"
            label="Actual Cash Counted (Rs)"
            rules={[
              { required: true, message: 'Enter the actual cash count' },
              { type: 'number', min: 0, message: 'Must be non-negative' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="Rs"
              placeholder="0.00"
              autoFocus
            />
          </Form.Item>
          <Form.Item name="notes" label="Notes (optional)">
            <TextArea rows={2} placeholder="Any remarks about today's session..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CashSessionPage;
