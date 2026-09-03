import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Select, InputNumber,
  DatePicker, Input, message, Tag, AutoComplete, Space,
} from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';

const { Option } = Select;
const { TextArea } = Input;

const MODES = [
  { value: 'cash', label: 'Cash', color: 'green' },
  { value: 'bank', label: 'Bank Transfer', color: 'purple' },
];

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/expenses');
      setExpenses(res.data.data);
    } catch {
      message.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/expenses/categories');
      setCategories(res.data.data);
    } catch {
      // Non-fatal — categories are just suggestions
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [fetchExpenses, fetchCategories]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/expenses', {
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        category: values.category,
        amount: values.amount,
        mode: values.mode,
        notes: values.notes,
      });
      message.success('Expense saved');
      setModalOpen(false);
      form.resetFields();
      fetchExpenses();
      fetchCategories(); // refresh in case new category was added
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => dayjs(d).format('DD MMM YYYY'),
      sorter: (a, b) => new Date(b.date) - new Date(a.date),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      filters: [...new Set(expenses.map((e) => e.category))].map((c) => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Amount (Rs)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) => <strong style={{ color: '#cf1322' }}>Rs {Number(v).toFixed(2)}</strong>,
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
      filters: MODES.map((m) => ({ text: m.label, value: m.value })),
      onFilter: (value, record) => record.mode === value,
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
        <h2 style={{ margin: 0 }}>📋 Expense Entry</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => { form.resetFields(); setModalOpen(true); }}
        >
          New Expense
        </Button>
      </div>

      <Table
        dataSource={expenses}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        summary={(pageData) => {
          const total = pageData.reduce((sum, row) => sum + (row.amount || 0), 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><strong>Page Total</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <strong style={{ color: '#cf1322' }}>Rs {total.toFixed(2)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={3} />
            </Table.Summary.Row>
          );
        }}
      />

      {/* Expense Entry Modal */}
      <Modal
        title={<><FileTextOutlined /> Record Expense</>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Save Expense"
        confirmLoading={submitting}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="date" label="Date">
            <DatePicker defaultValue={dayjs()} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Enter or select a category' }]}
          >
            <AutoComplete
              placeholder="Select or type a category"
              options={categories.map((c) => ({ value: c }))}
              filterOption={(inputValue, option) =>
                option.value.toLowerCase().includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>

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

          <Form.Item name="mode" label="Mode" rules={[{ required: true, message: 'Select a mode' }]}>
            <Select placeholder="Cash or Bank?">
              {MODES.map((m) => (
                <Option key={m.value} value={m.value}>{m.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional description..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
