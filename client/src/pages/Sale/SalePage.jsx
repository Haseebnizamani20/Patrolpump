import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Tag,
  Typography,
  message,
  Card,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const SalePage = () => {
  const { isOwner } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [walkInCustomer, setWalkInCustomer] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [saleToVoid, setSaleToVoid] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  
  const [form] = Form.useForm();
  
  // For dynamic form state
  const customerType = Form.useWatch('customerType', form);
  const paymentType = Form.useWatch('paymentType', form);
  const quantity = Form.useWatch('quantity', form);
  const rate = Form.useWatch('rate', form);
  const selectedCustomerId = Form.useWatch('customer', form);
  const selectedUnitId = Form.useWatch('unit', form);
  
  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/sales');
      setSales(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [customersRes, unitsRes] = await Promise.all([
        axiosInstance.get('/customers'),
        axiosInstance.get('/units')
      ]);
      
      const allCustomers = customersRes.data;
      setCustomers((allCustomers.data || []).filter(c => c.type === 'credit' && c.isActive !== false));
      setWalkInCustomer((allCustomers.data || []).find(c => c.type === 'retail' && c.isActive !== false));
      setUnits((unitsRes.data.data || []).filter(u => u.status === 'active'));
    } catch (error) {
      message.error('Failed to fetch dependencies');
    }
  };

  useEffect(() => {
    fetchSales();
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (quantity && rate) {
      form.setFieldsValue({ amount: quantity * rate });
    } else {
      form.setFieldsValue({ amount: 0 });
    }
  }, [quantity, rate, form]);
  
  useEffect(() => {
    if (customerType === 'Walk-in (Cash)') {
      form.setFieldsValue({
        paymentType: 'Cash',
        customer: walkInCustomer?._id
      });
    } else if (customerType === 'Credit Customer') {
      form.setFieldsValue({ customer: undefined });
    }
  }, [customerType, walkInCustomer, form]);

  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      customerType: 'Walk-in (Cash)',
      paymentType: 'Cash',
      customer: walkInCustomer?._id
    });
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const submitSale = async (values, ownerOverride = false) => {
    setSubmitting(true);
    try {
      const amount = values.quantity * values.rate;
      let amountPaid = 0;
      let dueAmount = 0;
      
      if (values.paymentType === 'Cash') {
        amountPaid = amount;
      } else if (values.paymentType === 'Credit') {
        dueAmount = amount;
      } else if (values.paymentType === 'Partial') {
        amountPaid = values.cashPaid || 0;
        dueAmount = amount - amountPaid;
      }

      const payload = {
        date: values.date.toISOString(),
        customerId: values.customer,
        unitId: values.unit,
        quantity: values.quantity,
        rate: values.rate,
        amount,
        paymentType: values.paymentType.toLowerCase(),
        amountPaid,
        dueAmount,
        ownerOverride,
      };

      const response = await axiosInstance.post('/sales', payload);
      if (response.data.creditLimitWarning) {
        message.warning('Sale saved, but it exceeds the customer credit limit');
      } else {
        message.success('Sale added successfully');
      }
      handleCloseModal();
      fetchSales();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'INSUFFICIENT_STOCK') {
        if (isOwner) {
          Modal.confirm({
            title: 'Insufficient Stock',
            content: 'Not enough stock in the tank. As an owner, you can override this. Proceed?',
            onOk: () => submitSale(values, true),
          });
        } else {
          message.error(error.response.data.message || 'Insufficient stock.');
        }
      } else {
        message.error(error.response?.data?.message || 'Failed to add sale');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidSale = async () => {
    if (!voidReason) {
      message.error('Please provide a reason to void');
      return;
    }
    
    try {
      await axiosInstance.post(`/sales/${saleToVoid}/void`, { voidReason });
      message.success('Sale voided successfully');
      setVoidModalVisible(false);
      setSaleToVoid(null);
      setVoidReason('');
      fetchSales();
    } catch (error) {
      message.error('Failed to void sale');
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('DD MMM YYYY'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Customer Name',
      dataIndex: ['customerId', 'name'],
      key: 'customer',
    },
    {
      title: 'Unit/Tank',
      dataIndex: ['unitId', 'name'],
      key: 'unit',
    },
    {
      title: 'Quantity (L)',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Rate (₹/L)',
      dataIndex: 'rate',
      key: 'rate',
    },
    {
      title: 'Amount (₹)',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: 'Payment Type',
      dataIndex: 'paymentType',
      key: 'paymentType',
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: 'Amount Paid (₹)',
      dataIndex: 'amountPaid',
      key: 'amountPaid',
    },
    {
      title: 'Due Amount (₹)',
      dataIndex: 'dueAmount',
      key: 'dueAmount',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (status === 'voided') {
          return <Tag color="red" style={{ textDecoration: 'line-through' }}>Voided</Tag>;
        }
        return <Tag color="green">Active</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        if (record.status === 'active' && isOwner) {
          return (
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => {
                setSaleToVoid(record._id);
                setVoidModalVisible(true);
              }}
            >
              Void
            </Button>
          );
        }
        return null;
      }
    }
  ];

  const selectedCustomer = customers.find(c => c._id === selectedCustomerId);
  const selectedUnit = units.find(u => u._id === selectedUnitId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>Sale Entry</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal} size="large">
          New Sale
        </Button>
      </div>

      <Table
        dataSource={sales}
        columns={columns}
        rowKey="_id"
        loading={loading}
        rowClassName={(record) => record.status === 'voided' ? 'voided-row' : ''}
      />

      <Modal
        title="New Sale Entry"
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => submitSale(values, false)}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="date"
              label="Date"
              rules={[{ required: true, message: 'Please select a date' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          
          <Form.Item
            name="customerType"
            label="Customer Type"
          >
            <Radio.Group>
              <Radio.Button value="Walk-in (Cash)">Walk-in (Cash)</Radio.Button>
              <Radio.Button value="Credit Customer">Credit Customer</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {customerType === 'Credit Customer' ? (
            <Form.Item
              name="customer"
              label="Customer"
              rules={[{ required: true, message: 'Please select a customer' }]}
            >
              <Select showSearch placeholder="Select a credit customer" optionFilterProp="children">
                {customers.map(c => (
                  <Option key={c._id} value={c._id}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>
          ) : (
             <Form.Item
                name="customer"
                hidden
             >
                <Input />
             </Form.Item>
          )}

          {customerType === 'Credit Customer' && selectedCustomer && (
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f0f2f5' }}>
              <Text strong>Current Due: </Text><Text type="danger">₹{selectedCustomer.currentBalance || 0}</Text> | 
              <Text strong> Credit Limit: </Text><Text>₹{selectedCustomer.creditLimit || 0}</Text> | 
              <Text strong> Available: </Text><Text type="success">₹{(selectedCustomer.creditLimit || 0) - (selectedCustomer.currentBalance || 0)}</Text>
            </Card>
          )}

          <Form.Item
            name="unit"
            label="Unit/Tank"
            rules={[{ required: true, message: 'Please select a unit' }]}
            help={selectedUnit ? `Current Stock: ${selectedUnit.currentStock} L` : ''}
          >
            <Select placeholder="Select a unit/tank">
              {units.map(u => (
                <Option key={u._id} value={u._id}>{u.name} ({u.fuelType})</Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: '16px' }}>
            <Form.Item
              name="quantity"
              label="Quantity (Liters)"
              rules={[{ required: true, message: 'Please enter quantity' }]}
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
            </Form.Item>

            <Form.Item
              name="rate"
              label="Rate (₹/Liter)"
              rules={[{ required: true, message: 'Please enter rate' }]}
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Total Amount (₹)"
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} disabled />
            </Form.Item>
          </div>

          <Form.Item
            name="paymentType"
            label="Payment Type"
            rules={[{ required: true }]}
          >
            <Radio.Group disabled={customerType === 'Walk-in (Cash)'}>
              <Radio.Button value="Cash">Cash</Radio.Button>
              <Radio.Button value="Credit" disabled={customerType === 'Walk-in (Cash)'}>Credit</Radio.Button>
              <Radio.Button value="Partial" disabled={customerType === 'Walk-in (Cash)'}>Partial</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {paymentType === 'Partial' && (
            <Form.Item
              name="cashPaid"
              label="Cash Paid (₹)"
              rules={[{ required: true, message: 'Please enter cash paid' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} max={form.getFieldValue('amount')} />
            </Form.Item>
          )}

          <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Submit Sale
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Void Sale"
        open={voidModalVisible}
        onOk={handleVoidSale}
        onCancel={() => {
          setVoidModalVisible(false);
          setVoidReason('');
        }}
        okText="Void Sale"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to void this sale? This action will revert the stock and customer balance.</p>
        <Input.TextArea
          rows={3}
          placeholder="Reason for voiding"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default SalePage;
