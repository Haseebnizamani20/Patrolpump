import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form] = Form.useForm();
  const { isOwner } = useAuth();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/suppliers');
      setSuppliers(response.data.data);
    } catch (error) {
      message.error('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAdd = () => {
    setEditingSupplier(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/suppliers/${id}`);
      message.success('Supplier deactivated successfully');
      fetchSuppliers();
    } catch (error) {
      message.error('Failed to deactivate supplier');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingSupplier) {
        await axiosInstance.put(`/suppliers/${editingSupplier._id}`, values);
        message.success('Supplier updated successfully');
      } else {
        await axiosInstance.post('/suppliers', values);
        message.success('Supplier added successfully');
      }
      setIsModalVisible(false);
      fetchSuppliers();
    } catch (error) {
      if (error.response) {
        message.error(error.response.data.message || 'Action failed');
      }
    }
  };

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
      title: 'GST No',
      dataIndex: 'gstNumber',
      key: 'gstNumber',
    },
    {
      title: 'Outstanding Payable (Rs)',
      dataIndex: 'outstandingPayable',
      key: 'outstandingPayable',
      render: (val) => val?.toLocaleString() || 0,
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
          {isOwner && <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="large">Edit</Button>}
          {isOwner && record.status !== 'inactive' && (
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
        <h2>Suppliers</h2>
        {isOwner && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
            Add Supplier
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={suppliers}
        rowKey="_id"
        loading={loading}
      />
      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="gstNumber"
            label="GST Number"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;
