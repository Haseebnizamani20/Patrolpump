import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const UnitsPage = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form] = Form.useForm();
  const { isOwner } = useAuth();

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/units');
      setUnits(response.data);
    } catch (error) {
      message.error('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAdd = () => {
    setEditingUnit(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUnit(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/units/${id}`);
      message.success('Unit deactivated successfully');
      fetchUnits();
    } catch (error) {
      message.error('Failed to deactivate unit');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUnit) {
        await axiosInstance.put(`/units/${editingUnit._id}`, values);
        message.success('Unit updated successfully');
      } else {
        await axiosInstance.post('/units', values);
        message.success('Unit added successfully');
      }
      setIsModalVisible(false);
      fetchUnits();
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
      title: 'Capacity (L)',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (val) => val?.toLocaleString(),
    },
    {
      title: 'Current Stock (L)',
      dataIndex: 'currentStock',
      key: 'currentStock',
      render: (val) => val?.toLocaleString() || 0,
    },
    {
      title: 'Avg Cost (₹/L)',
      dataIndex: 'avgCost',
      key: 'avgCost',
      render: (val) => val?.toFixed(2) || '0.00',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'green';
        if (status === 'maintenance') color = 'orange';
        if (status === 'inactive') color = 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="large">Edit</Button>
          {isOwner && (
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
        <h2>Units / Tanks</h2>
        {isOwner && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large">
            Add Unit
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={units}
        rowKey="_id"
        loading={loading}
      />
      <Modal
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Save"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter unit name' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="capacity"
            label="Capacity (L)"
            rules={[{ required: true, message: 'Please enter capacity' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="maintenance">Maintenance</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitsPage;
