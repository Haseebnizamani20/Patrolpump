import { useAuth } from '../../context/AuthContext';
import { Button, Card, Typography, Descriptions, Space } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Title } = Typography;

const DashboardPage = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          ⛽ Dashboard
        </Title>
        <Space>
          <span>
            Welcome, <strong>{user?.name}</strong> ({user?.role})
          </span>
          <Button icon={<LogoutOutlined />} onClick={logout} danger>
            Logout
          </Button>
        </Space>
      </div>

      <Card title="System Status">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Logged in as">{user?.name}</Descriptions.Item>
          <Descriptions.Item label="Username">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <span
              style={{
                color: user?.role === 'owner' ? '#389e0d' : '#1890ff',
                fontWeight: 'bold',
                textTransform: 'capitalize',
              }}
            >
              {user?.role}
            </span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Quick Links" style={{ marginTop: '16px' }}>
        <p style={{ color: '#888' }}>
          Module screens will be added here in upcoming phases.
        </p>
      </Card>
    </div>
  );
};

export default DashboardPage;
