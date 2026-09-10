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
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PurchasePage = () => {
  const { isOwner } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  // For dynamic form state
  const paymentStatus = Form.useWatch('paymentStatus', form);
  const quantity = Form.useWatch('quantity', form);
  const rate = Form.useWatch('rate', form);
  const amountPaid = Form.useWatch('amountPaid', form);
  const selectedUnitId = Form.useWatch('unit', form);
  const totalAmount = Number(quantity || 0) * Number(rate || 0);
  const paidAmount = paymentStatus === 'Paid'
    ? totalAmount
    : paymentStatus === 'Pending'
      ? 0
      : Number(amountPaid || 0);
  const balanceDue = totalAmount - paidAmount;
  
  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/purchases');
      setPurchases(response.data.data || []);
    } catch (error) {
      message.error('Failed to fetch purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [suppliersRes, unitsRes] = await Promise.all([
        axiosInstance.get('/suppliers'),
        axiosInstance.get('/units')
      ]);
      setSuppliers((suppliersRes.data.data || []).filter(s => s.isActive !== false));
      setUnits((unitsRes.data.data || []).filter(u => u.status === 'active'));
    } catch (error) {
      message.error('Failed to fetch dependencies');
    }
  };

  useEffect(() => {
    fetchPurchases();
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
    if (paymentStatus === 'Paid' && quantity && rate) {
        form.setFieldsValue({ amountPaid: quantity * rate });
    } else if (paymentStatus === 'Pending') {
        form.setFieldsValue({ amountPaid: 0 });
    }
  }, [paymentStatus, quantity, rate, form]);

  const handleOpenModal = () => {
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      paymentStatus: 'Paid',
    });
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const submitPurchase = async (values, ownerOverride = false) => {
    setSubmitting(true);
    try {
      const payload = {
        date: values.date.toISOString(),
        supplierId: values.supplier,
        unitId: values.unit,
        quantity: values.quantity,
        rate: values.rate,
        amount: values.amount,
        invoiceNo: values.invoiceNo,
        paymentStatus: values.paymentStatus.toLowerCase(),
        amountPaid: values.paymentStatus === 'Partial' ? values.amountPaid : (values.paymentStatus === 'Paid' ? values.amount : 0),
        notes: values.notes,
        ownerOverride,
      };

      await axiosInstance.post('/purchases', payload);
      message.success('Purchase added successfully');
      handleCloseModal();
      fetchPurchases();
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.code === 'CAPACITY_EXCEEDED') {
        if (isOwner) {
          Modal.confirm({
            title: 'Capacity Exceeded',
            content: 'This purchase exceeds the tank capacity. As an owner, you can override this. Do you want to proceed?',
            onOk: () => submitPurchase(values, true),
          });
        } else {
          message.error(error.response.data.message || 'Tank capacity exceeded.');
        }
      } else {
        message.error(error.response?.data?.message || 'Failed to add purchase');
      }
    } finally {
      setSubmitting(false);
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
      title: 'Supplier',
      dataIndex: ['supplierId', 'name'],
      key: 'supplier',
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
      title: 'Rate (Rs/L)',
      dataIndex: 'rate',
      key: 'rate',
    },
    {
      title: 'Amount (Rs)',
      dataIndex: 'amount',
      key: 'amount',
    },
    {
      title: 'Invoice No',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
    },
    {
      title: 'Payment Status',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => {
        let color = 'green';
        if (status === 'partial') color = 'orange';
        if (status === 'pending') color = 'red';
        return <Tag color={color}>{status}</Tag>;
      }
    }
  ];

  const selectedUnit = units.find(u => u._id === selectedUnitId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>Purchase Entry</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal} size="large">
          New Purchase
        </Button>
      </div>

      <Table
        dataSource={purchases}
        columns={columns}
        rowKey="_id"
        loading={loading}
      />

      <Modal
        title="New Purchase Entry"
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={null}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => submitPurchase(values, false)}
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

            <Form.Item
              name="invoiceNo"
              label="Invoice Number"
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="supplier"
            label="Supplier"
            rules={[{ required: true, message: 'Please select a supplier' }]}
          >
            <Select showSearch placeholder="Select a supplier" optionFilterProp="children">
              {suppliers.map(s => (
                <Option key={s._id} value={s._id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="unit"
            label="Unit/Tank"
            rules={[{ required: true, message: 'Please select a unit' }]}
            help={selectedUnit ? `Current Stock: ${selectedUnit.currentStock} L / Capacity: ${selectedUnit.capacity} L` : ''}
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
              label="Rate (Rs/Liter)"
              rules={[{ required: true, message: 'Please enter rate' }]}
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} step={0.01} />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Total Amount (Rs)"
              style={{ flex: 1 }}
            >
              <InputNumber style={{ width: '100%' }} disabled />
            </Form.Item>
          </div>

          <Form.Item
            name="paymentStatus"
            label="Payment Status"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="Paid">Paid</Radio.Button>
              <Radio.Button value="Partial">Partial</Radio.Button>
              <Radio.Button value="Pending">Pending</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {paymentStatus === 'Partial' && (
            <Form.Item
              name="amountPaid"
              label="Paid Amount (Rs)"
              rules={[{ required: true, message: 'Please enter amount paid' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} max={totalAmount} />
            </Form.Item>
          )}

          <div
            aria-live="polite"
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 24,
              padding: '14px 16px',
              border: '1px solid #d9e2ef',
              borderLeft: '4px solid #1677ff',
              borderRadius: 8,
              background: '#f8fbff',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ color: '#667085', fontSize: 12, marginBottom: 4 }}>Paid Amount</div>
              <strong style={{ color: '#101828' }}>Rs {paidAmount.toFixed(2)}</strong>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#667085', fontSize: 12, marginBottom: 4 }}>Balance Due</div>
              <strong style={{ color: balanceDue > 0 ? '#cf1322' : '#389e0d' }}>Rs {balanceDue.toFixed(2)}</strong>
            </div>
          </div>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: 24, marginBottom: 0 }}>
            <Button onClick={handleCloseModal} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Submit Purchase
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchasePage;
