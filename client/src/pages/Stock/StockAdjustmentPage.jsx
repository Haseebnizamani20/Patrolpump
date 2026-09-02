import React, { useEffect, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';

const { Title } = Typography;
const { Option } = Select;

const StockAdjustmentPage = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const selectedUnitId = Form.useWatch('unitId', form);
  const selectedUnit = units.find((unit) => unit._id === selectedUnitId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adjustmentsResponse, unitsResponse] = await Promise.all([
        axiosInstance.get('/stock/adjustments'),
        axiosInstance.get('/units'),
      ]);
      setAdjustments(adjustmentsResponse.data.data || []);
      setUnits((unitsResponse.data.data || []).filter((unit) => unit.status === 'active'));
    } catch (error) {
      message.error('Failed to load stock adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const submitAdjustment = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/stock/adjustment', values);
      message.success('Stock adjustment recorded');
      setOpen(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to record adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      render: (value) => dayjs(value).format('DD MMM YYYY, hh:mm A'),
    },
    { title: 'Unit/Tank', dataIndex: ['unitId', 'name'] },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type) => <Tag color={type === 'excess' ? 'green' : 'red'}>{type.toUpperCase()}</Tag>,
    },
    { title: 'Quantity (L)', dataIndex: 'quantity' },
    { title: 'Reason', dataIndex: 'reason' },
    { title: 'Adjusted By', dataIndex: ['adjustedBy', 'name'] },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>Stock Adjustments</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Adjustment
        </Button>
      </div>
      <Table dataSource={adjustments} columns={columns} rowKey="_id" loading={loading} />
      <Modal title="New Stock Adjustment" open={open} footer={null} onCancel={() => setOpen(false)}>
        <Form form={form} layout="vertical" onFinish={submitAdjustment}>
          <Form.Item name="unitId" label="Unit/Tank" rules={[{ required: true }]} help={selectedUnit ? `Current stock: ${selectedUnit.currentStock} L` : undefined}>
            <Select placeholder="Select a unit/tank">
              {units.map((unit) => <Option key={unit._id} value={unit._id}>{unit.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="Adjustment Type" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="shortage">Shortage</Radio.Button>
              <Radio.Button value="excess">Excess</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="quantity" label="Quantity (Liters)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, whitespace: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Button onClick={() => setOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Record Adjustment</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockAdjustmentPage;
