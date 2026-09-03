import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Select, InputNumber,
  DatePicker, Input, message, Tag, Card, Statistic, Row, Col,
  Space, Popconfirm,
} from 'antd';
import { PlusOutlined, ShopOutlined } from '@ant-design/icons';
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

const SupplierPaymentsPage = () => {
  const { isOwner } = useAuth();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState(null);
  const [form] = Form.useForm();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/supplier-payments');
      setPayments(res.data.data);
    } catch { message.error('Failed to load supplier payments'); }
    finally { setLoading(false); }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/suppliers');
      setSuppliers(res.data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchPayments(); fetchSuppliers(); }, [fetchPayments, fetchSuppliers]);

  const handleSupplierChange = (id) => {
    setSelectedSupplier(suppliers.find(s => s._id === id) || null);
  };

  const submit = async (values, override = false) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/supplier-payments', {
        supplierId: values.supplierId,
        amount: values.amount,
        mode: values.mode,
        referenceNo: values.referenceNo,
        notes: values.notes,
        date: values.date ? values.date.toISOString() : undefined,
        ...(override && { ownerOverride: true }),
      });
      message.success('Supplier payment recorded');
      setModalOpen(false);
      setOverrideOpen(false);
      setPendingValues(null);
      form.resetFields();
      setSelectedSupplier(null);
      fetchPayments();
      fetchSuppliers();
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.code === 'OVERPAYMENT' && isOwner) {
        setPendingValues(values);
        setModalOpen(false);
        setOverrideOpen(true);
      } else {
        message.error(errData?.message || 'Failed to record payment');
      }
    } finally { setSubmitting(false); }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YYYY') },
    { title: 'Supplier', dataIndex: 'supplierId', render: s => s?.name || '—' },
    {
      title: 'Amount (Rs)', dataIndex: 'amount', align: 'right',
      render: v => <strong style={{ color: '#cf1322' }}>Rs {Number(v).toFixed(2)}</strong>,
    },
    {
      title: 'Mode', dataIndex: 'mode',
      render: m => { const f = MODES.find(x => x.value === m); return <Tag color={f?.color}>{f?.label || m}</Tag>; },
    },
    { title: 'Ref No', dataIndex: 'referenceNo', render: r => r || '—' },
    { title: 'Notes', dataIndex: 'notes', render: n => n || '—', ellipsis: true },
    { title: 'Recorded By', dataIndex: 'recordedBy', render: u => u?.name || '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🏪 Supplier Payments</h2>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { form.resetFields(); setSelectedSupplier(null); setModalOpen(true); }}>
          New Payment
        </Button>
      </div>

      <Table dataSource={payments} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} />

      <Modal
        title={<><ShopOutlined /> Record Supplier Payment</>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setSelectedSupplier(null); }}
        onOk={() => form.submit()}
        okText="Save"
        confirmLoading={submitting}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={v => submit(v, false)}>
          <Form.Item name="date" label="Date">
            <DatePicker defaultValue={dayjs()} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Select a supplier' }]}>
            <Select showSearch placeholder="Select supplier" optionFilterProp="label" onChange={handleSupplierChange}
              options={suppliers.map(s => ({ value: s._id, label: s.name }))} />
          </Form.Item>

          {selectedSupplier && (
            <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Outstanding Payable" value={selectedSupplier.outstandingPayable}
                    prefix="Rs" precision={2} valueStyle={{ color: '#cf1322', fontSize: 16 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Phone" value={selectedSupplier.phone || '—'} valueStyle={{ fontSize: 14 }} />
                </Col>
              </Row>
            </Card>
          )}

          <Form.Item name="amount" label="Amount (Rs)" rules={[{ required: true, message: 'Enter amount' }, { type: 'number', min: 0.01 }]}> 
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} prefix="Rs" placeholder="0.00" />
          </Form.Item>

          <Form.Item name="mode" label="Payment Mode" rules={[{ required: true, message: 'Select mode' }]}>
            <Select placeholder="Select mode">
              {MODES.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="referenceNo" label="Reference / Cheque No">
            <Input placeholder="Optional" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="⚠️ Overpayment Warning"
        open={overrideOpen}
        onCancel={() => { setOverrideOpen(false); setPendingValues(null); }}
        onOk={() => submit(pendingValues, true)}
        okText="Override & Save"
        okButtonProps={{ danger: true }}
        confirmLoading={submitting}
      >
        <p>This payment exceeds the supplier's outstanding balance. As Owner, you can override this restriction.</p>
        <p>Do you want to proceed?</p>
      </Modal>
    </div>
  );
};

export default SupplierPaymentsPage;
