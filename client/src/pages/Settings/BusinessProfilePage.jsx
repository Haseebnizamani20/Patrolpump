import { useEffect, useState } from 'react';
import { Button, Card, Form, Image, Input, Upload, message } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';

const BusinessProfilePage = () => {
  const [form] = Form.useForm();
  const [logo, setLogo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosInstance.get('/setup/business-profile')
      .then((res) => {
        form.setFieldsValue({ name: res.data.data.name });
        setLogo(res.data.data.logo);
      })
      .catch(() => message.error('Failed to load business profile.'));
  }, [form]);

  const readLogo = (file) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type) || file.size > 1.5 * 1024 * 1024) {
      message.error('Choose an SVG, PNG, or JPG image smaller than 1.5 MB.');
      return Upload.LIST_IGNORE;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
    return false;
  };

  const save = async (values) => {
    setSaving(true);
    try {
      await axiosInstance.put('/setup/business-profile', { name: values.name || '', logo });
      message.success('Business profile saved.');
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Business Profile" style={{ maxWidth: 640 }}>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="name" label="Pump / business name">
          <Input maxLength={120} placeholder="Optional — appears on printed reports" />
        </Form.Item>
        <Form.Item label="Pump logo">
          {logo && (
            <div style={{ marginBottom: 12 }}>
              <Image src={logo} alt="Business logo preview" preview={false} style={{ maxWidth: 180, maxHeight: 80, objectFit: 'contain' }} />
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => setLogo('')}>Remove logo</Button>
            </div>
          )}
          <Upload accept="image/png,image/jpeg,image/svg+xml" showUploadList={false} beforeUpload={readLogo}>
            <Button icon={<UploadOutlined />}>Upload SVG, PNG, or JPG</Button>
          </Upload>
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Save Business Profile</Button>
      </Form>
    </Card>
  );
};

export default BusinessProfilePage;
