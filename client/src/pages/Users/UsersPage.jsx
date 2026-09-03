import { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch,
  Tag, Space, message, Popconfirm, Tooltip, Typography, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, LockOutlined,
  UserOutlined, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/auth/users');
      setUsers(res.data.data);
    } catch { message.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ---- Add User ----
  const handleAdd = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.post('/auth/register', values);
      message.success(`User "${values.username}" created`);
      setAddOpen(false);
      addForm.resetFields();
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to create user');
    } finally { setSubmitting(false); }
  };

  // ---- Edit User ----
  const openEdit = (u) => {
    setSelectedUser(u);
    editForm.setFieldsValue({ name: u.name, role: u.role });
    setEditOpen(true);
  };

  const handleEdit = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.put(`/auth/users/${selectedUser._id}`, values);
      message.success('User updated');
      setEditOpen(false);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update user');
    } finally { setSubmitting(false); }
  };

  // ---- Toggle Active ----
  const toggleActive = async (u) => {
    try {
      await axiosInstance.put(`/auth/users/${u._id}`, { isActive: !u.isActive });
      message.success(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ---- Reset Password ----
  const openPwd = (u) => {
    setSelectedUser(u);
    pwdForm.resetFields();
    setPwdOpen(true);
  };

  const handlePwd = async (values) => {
    setSubmitting(true);
    try {
      await axiosInstance.put(`/auth/users/${selectedUser._id}`, { password: values.password });
      message.success(`Password reset for "${selectedUser.name}"`);
      setPwdOpen(false);
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to reset password');
    } finally { setSubmitting(false); }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name, r) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
          {r._id === currentUser?.id && <Tag color="blue">You</Tag>}
        </Space>
      ),
    },
    {
      title: 'Username',
      dataIndex: 'username',
      render: u => <Text code>{u}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      render: r => (
        <Tag color={r === 'owner' ? 'green' : 'blue'} style={{ textTransform: 'capitalize' }}>
          {r}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      render: (active) => active
        ? <Badge status="success" text="Active" />
        : <Badge status="error" text="Inactive" />,
    },
    {
      title: 'Actions',
      render: (_, u) => {
        const isSelf = u._id === currentUser?.id;
        return (
          <Space>
            <Tooltip title="Edit name / role">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(u)}>
                Edit
              </Button>
            </Tooltip>
            <Tooltip title="Reset password">
              <Button size="small" icon={<LockOutlined />} onClick={() => openPwd(u)}>
                Password
              </Button>
            </Tooltip>
            <Popconfirm
              title={u.isActive ? 'Deactivate this user?' : 'Activate this user?'}
              description={
                u.isActive
                  ? 'They will not be able to log in until reactivated.'
                  : 'They will be able to log in again.'
              }
              onConfirm={() => toggleActive(u)}
              okText={u.isActive ? 'Deactivate' : 'Activate'}
              okButtonProps={{ danger: u.isActive }}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? 'Cannot deactivate yourself' : ''}>
                <Button
                  size="small"
                  danger={u.isActive}
                  disabled={isSelf}
                  icon={u.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>👥 User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => { addForm.resetFields(); setAddOpen(true); }}>
          Add User
        </Button>
      </div>

      <Table
        dataSource={users} columns={columns} rowKey="_id"
        loading={loading} pagination={false}
        rowClassName={(u) => !u.isActive ? 'ant-table-row-disabled' : ''}
      />

      {/* Add User Modal */}
      <Modal
        title={<><PlusOutlined /> Add New User</>}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => addForm.submit()}
        okText="Create User"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Enter full name' }]}>
            <Input placeholder="e.g. Ravi Kumar" />
          </Form.Item>
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Enter username' },
              { pattern: /^[a-z0-9_]+$/, message: 'Lowercase letters, numbers, underscore only' },
              { min: 3, message: 'Min 3 characters' },
            ]}
          >
            <Input placeholder="e.g. ravi_op" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter password' }, { min: 6, message: 'Min 6 characters' }]}
          >
            <Input.Password placeholder="Min 6 characters" />
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="operator" rules={[{ required: true }]}>
            <Select>
              <Option value="operator">Operator — can record entries, cannot access reports</Option>
              <Option value="owner">Owner — full access including reports and settings</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={<><EditOutlined /> Edit User — {selectedUser?.name}</>}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        okText="Save Changes"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Enter name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select>
              <Option value="operator">Operator</Option>
              <Option value="owner">Owner</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={<><LockOutlined /> Reset Password — {selectedUser?.name}</>}
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        onOk={() => pwdForm.submit()}
        okText="Reset Password"
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handlePwd}>
          <Form.Item
            name="password"
            label="New Password"
            rules={[{ required: true, message: 'Enter new password' }, { min: 6, message: 'Min 6 characters' }]}
          >
            <Input.Password placeholder="Min 6 characters" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm the password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Repeat password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
