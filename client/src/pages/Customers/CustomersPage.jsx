import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, message, Space, Radio } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [form] = Form.useForm();
  const { isOwner } = useAuth();
  
  const customerType = Form.useWatch('type', form);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/customers');
      setCustomers(response.data.data);
    } catch (error) {
      message.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAdd = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({ type: 'retail', openingBalance: 0, creditLimit: 0 });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCustomer(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/customers/${id}`);
      message.success('Customer deactivated successfully');
      fetchCustomers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to deactivate customer');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingCustomer) {
        await axiosInstance.put(`/customers/${editingCustomer._id}`, values);
        message.success('Customer updated successfully');
      } else {
        await axiosInstance.post('/customers', values);
        message.success('Customer added successfully');
      }
      setIsModalVisible(false);
      fetchCustomers();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Action failed');
      }
    }
  };

  const filteredCustomers = customers.filter(c => filterType === 'all' || c.type === filterType);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'credit' ? 'blue' : 'green'}>{type.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Credit Limit (Rs)',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      render: (val, record) => record.type === 'credit' ? (val?.toLocaleString() || 0) : '-',
    },
    {
      title: 'Current Balance (Rs)',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (val, record) => {
        if (record.type !== 'credit') return '-';
        const num = val || 0;
        return <span style={{ color: num > 0 ? 'red' : 'inherit' }}>{num.toLocaleString()}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>{status?.toUpperCase() || 'ACTIVE'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="large">Edit</Button>
          {isOwner && record.name !== 'Walk-in' && record.status !== 'inactive' && (
            <Popconfirm title="Are you sure?" onConfirm={() => handleDelete(record._id)}>
              <Button danger icon={<DeleteOutlined />} size="large">Deactivate</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Customers</h2>
        <div>
          <Radio.Group value={filterType} onChange={e => setFilterType(e.target.value)} style={{ marginRight: 16 }}>
            <Radio.Button value="all">All</Radio.Button>
            <Radio.Button value="retail">Retail</Radio.Button>
            <Radio.Button value="credit">Credit</Radio.Button>
          </Radio.Group>
          {isOwner && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
              Add Customer
            </Button>
          )}
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={filteredCustomers}
        rowKey="_id"
        loading={loading}
      />
      <Modal
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter customer name' }]}
          >
            <Input disabled={editingCustomer?.name === 'Walk-in'} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select disabled={editingCustomer?.name === 'Walk-in'}>
              <Select.Option value="retail">Retail</Select.Option>
              <Select.Option value="credit">Credit</Select.Option>
            </Select>
          </Form.Item>
          {customerType === 'credit' && (
            <>
              <Form.Item
                name="creditLimit"
                label="Credit Limit (Rs)"
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
              {!editingCustomer && (
                <Form.Item
                  name="openingBalance"
                  label="Opening Balance (Rs) [Amount customer owes]"
                >
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              )}
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CustomersPage;
