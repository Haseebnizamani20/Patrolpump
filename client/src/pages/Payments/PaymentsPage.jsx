import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Select, InputNumber,
  DatePicker, Input, message, Tag, Card, Statistic, Row, Col, Space,
} from 'antd';
import { PlusOutlined, WalletOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Option } = Select;
const { TextArea } = Input;

const MODES = [
  { value: 'cash', label: 'Cash', color: 'green' },
  { value: 'upi', label: 'UPI', color: 'blue' },
  { value: 'bank', label: 'Bank Transfer', color: 'purple' },
];

const PaymentsPage = () => {
  const { isOwner } = useAuth();
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [overrideConfirmOpen, setOverrideConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [form] = Form.useForm();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/payments');
      setPayments(res.data.data);
    } catch {
      message.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/customers?type=credit');
      setCustomers(res.data.data);
    } catch {
      message.error('Failed to load customers');
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, [fetchPayments, fetchCustomers]);

  const handleCustomerChange = (id) => {
    const cust = customers.find((c) => c._id === id);
    setSelectedCustomer(cust || null);
  };

  const submitPayment = async (values, override = false) => {
    setSubmitting(true);
    try {
      const payload = {
        customerId: values.customerId,
        amount: values.amount,
        mode: values.mode,
        notes: values.notes,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        ...(override && { ownerOverride: true }),
      };
      await axiosInstance.post('/payments', payload);
      message.success('Payment recorded successfully');
      setModalOpen(false);
      setOverrideConfirmOpen(false);
      setPendingValues(null);
      form.resetFields();
      setSelectedCustomer(null);
      fetchPayments();
      fetchCustomers(); // refresh balance display
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'OVERPAYMENT' && isOwner) {
        setPendingValues(values);
        setModalOpen(false);
        setOverrideConfirmOpen(true);
      } else {
        message.error(errData?.message || 'Failed to record payment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onFinish = (values) => submitPayment(values, false);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => dayjs(d).format('DD MMM YYYY'),
      sorter: (a, b) => new Date(b.date) - new Date(a.date),
    },
    {
      title: 'Customer',
      dataIndex: 'customerId',
      key: 'customer',
      render: (c) => c?.name || '—',
    },
    {
      title: 'Amount (Rs)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) => <strong style={{ color: '#389e0d' }}>Rs {Number(v).toFixed(2)}</strong>,
      align: 'right',
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      key: 'mode',
      render: (m) => {
        const found = MODES.find((x) => x.value === m);
        return <Tag color={found?.color}>{found?.label || m}</Tag>;
      },
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (n) => n || '—',
      ellipsis: true,
    },
    {
      title: 'Recorded By',
      dataIndex: 'recordedBy',
      key: 'recordedBy',
      render: (u) => u?.name || '—',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>💰 Payment / Receipt Entry</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => { form.resetFields(); setSelectedCustomer(null); setModalOpen(true); }}
        >
          New Payment
        </Button>
      </div>

      <Table
        dataSource={payments}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />

      {/* Payment Entry Modal */}
      <Modal
        title={<><WalletOutlined /> Record Payment</>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setSelectedCustomer(null); }}
        onOk={() => form.submit()}
        okText="Save Payment"
        confirmLoading={submitting}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="date" label="Date">
            <DatePicker defaultValue={dayjs()} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="customerId" label="Customer" rules={[{ required: true, message: 'Select a customer' }]}>
            <Select
              showSearch
              placeholder="Select credit customer"
              optionFilterProp="label"
              onChange={handleCustomerChange}
              options={customers.map((c) => ({
                value: c._id,
                label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
              }))}
            />
          </Form.Item>

          {selectedCustomer && (
            <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Current Due"
                    value={selectedCustomer.currentBalance}
                    prefix="Rs"
                    precision={2}
                    valueStyle={{ color: selectedCustomer.currentBalance > 0 ? '#cf1322' : '#389e0d', fontSize: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Credit Limit"
                    value={selectedCustomer.creditLimit}
                    prefix="Rs"
                    precision={2}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Form.Item
            name="amount"
            label="Amount (Rs)"
            rules={[
              { required: true, message: 'Enter amount' },
              { type: 'number', min: 0.01, message: 'Amount must be positive' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              prefix="Rs"
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="mode" label="Payment Mode" rules={[{ required: true, message: 'Select a mode' }]}>
            <Select placeholder="Select mode">
              {MODES.map((m) => (
                <Option key={m.value} value={m.value}>{m.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Owner override confirm for overpayment */}
      <Modal
        title="⚠️ Overpayment Warning"
        open={overrideConfirmOpen}
        onCancel={() => { setOverrideConfirmOpen(false); setPendingValues(null); }}
        onOk={() => submitPayment(pendingValues, true)}
        okText="Override & Save"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
      >
        <p>
          This payment exceeds the customer's current balance. As Owner, you can override this restriction.
        </p>
        <p>Do you want to proceed?</p>
      </Modal>
    </div>
  );
};

export default PaymentsPage;
