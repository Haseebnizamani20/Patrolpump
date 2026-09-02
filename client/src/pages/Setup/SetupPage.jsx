import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Form, InputNumber, Table, Popconfirm, message, Space } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;

const SetupPage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setupStatus, setSetupStatus] = useState(null);
  const [units, setUnits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  useEffect(() => {
    if (!isOwner) {
      navigate('/');
      return;
    }

    const checkStatusAndFetchData = async () => {
      try {
        const statusRes = await axiosInstance.get('/setup/status');
        setSetupStatus(statusRes.data.isComplete);

        if (!statusRes.data.isComplete) {
          const [unitsRes, customersRes] = await Promise.all([
            axiosInstance.get('/units'),
            axiosInstance.get('/customers')
          ]);
          setUnits(unitsRes.data);
          setCustomers(customersRes.data.filter(c => c.type === 'credit'));
        }
      } catch (error) {
        message.error('Failed to load setup data');
      } finally {
        setLoading(false);
      }
    };

    checkStatusAndFetchData();
  }, [isOwner, navigate]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        units: Object.keys(values.units || {}).map(id => ({
          unitId: id,
          openingStock: values.units[id].openingStock || 0,
          avgCost: values.units[id].avgCost || 0
        })),
        customers: Object.keys(values.customers || {}).map(id => ({
          customerId: id,
          openingBalance: values.customers[id].openingBalance || 0
        }))
      };

      await axiosInstance.post('/setup/opening-balances', payload);
      message.success('Setup completed successfully!');
      navigate('/');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save setup');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (setupStatus) {
    return (
      <Card style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <Title level={3}>Setup has been completed</Title>
        <Text type="secondary">Initial balances and stocks are already locked.</Text>
        <div style={{ marginTop: 24 }}>
          <Link to="/">
            <Button type="primary" size="large">Go to Dashboard</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const unitColumns = [
    { title: 'Unit Name', dataIndex: 'name', key: 'name' },
    { 
      title: 'Opening Stock (L)', 
      key: 'stock',
      render: (_, record) => (
        <Form.Item name={['units', record._id, 'openingStock']} initialValue={0} noStyle>
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
      )
    },
    { 
      title: 'Average Cost (₹/L)', 
      key: 'cost',
      render: (_, record) => (
        <Form.Item name={['units', record._id, 'avgCost']} initialValue={0} noStyle>
          <InputNumber min={0} step={0.01} style={{ width: 120 }} />
        </Form.Item>
      )
    },
  ];

  const customerColumns = [
    { title: 'Customer Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { 
      title: 'Opening Balance (₹)', 
      key: 'balance',
      render: (_, record) => (
        <Form.Item name={['customers', record._id, 'openingBalance']} initialValue={0} noStyle>
          <InputNumber style={{ width: 120 }} />
        </Form.Item>
      )
    },
  ];

  return (
    <div>
      <Title level={2}>System Setup</Title>
      <Text type="secondary">Enter initial stocks and balances. This action is one-time.</Text>
      
      <Form form={form} onFinish={onFinish} layout="vertical" style={{ marginTop: 24 }}>
        <Card title="Section 1: Opening Stock" style={{ marginBottom: 24 }}>
          <Table 
            columns={unitColumns} 
            dataSource={units} 
            rowKey="_id" 
            pagination={false}
            size="small"
          />
        </Card>

        <Card title="Section 2: Customer Opening Balances (Credit Customers)" style={{ marginBottom: 24 }}>
          <Table 
            columns={customerColumns} 
            dataSource={customers} 
            rowKey="_id" 
            pagination={false}
            size="small"
          />
        </Card>

        <div style={{ textAlign: 'right' }}>
          <Popconfirm 
            title="Lock Opening Balances" 
            description="This action cannot be undone. Opening balances will be locked. Continue?"
            onConfirm={() => form.submit()}
            okText="Yes, Lock"
            cancelText="Cancel"
          >
            <Button type="primary" size="large" loading={submitting}>
              Save & Lock
            </Button>
          </Popconfirm>
        </div>
      </Form>
    </div>
  );
};

export default SetupPage;
