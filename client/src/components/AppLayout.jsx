import React, { useState } from 'react';
import { Layout, Menu, Button, Tag, Typography, theme } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  TeamOutlined,
  ShopOutlined,
  SettingOutlined,
  LogoutOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  SlidersOutlined,
  WalletOutlined,
  FileTextOutlined,
  BankOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  AuditOutlined,
  UsergroupAddOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/units',
      icon: <DatabaseOutlined />,
      label: 'Units/Tanks',
    },
    {
      key: '/customers',
      icon: <TeamOutlined />,
      label: 'Customers',
    },
    {
      key: '/suppliers',
      icon: <ShopOutlined />,
      label: 'Suppliers',
    },
    {
      key: '/purchases',
      icon: <ShoppingCartOutlined />,
      label: 'Purchase Entry',
    },
    {
      key: '/sales',
      icon: <DollarOutlined />,
      label: 'Sale Entry',
    },
    {
      key: '/payments',
      icon: <WalletOutlined />,
      label: 'Payments',
    },
    {
      key: '/expenses',
      icon: <FileTextOutlined />,
      label: 'Expenses',
    },
    {
      key: '/supplier-payments',
      icon: <CreditCardOutlined />,
      label: 'Supplier Payments',
    },
    {
      key: '/cash-session',
      icon: <BankOutlined />,
      label: 'Cash Session',
    },
  ];

  if (isOwner) {
    menuItems.push({
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Reports',
    });
    menuItems.push({
      key: '/audit-log',
      icon: <AuditOutlined />,
      label: 'Audit Log',
    });
    menuItems.push({
      key: '/users',
      icon: <UsergroupAddOutlined />,
      label: 'Users',
    });
    menuItems.push({
      key: '/backup',
      icon: <CloudUploadOutlined />,
      label: 'Backup',
    });
    menuItems.push({
      key: '/stock-adjustments',
      icon: <SlidersOutlined />,
      label: 'Stock Adjustments',
    });
    menuItems.push({
      key: '/setup',
      icon: <SettingOutlined />,
      label: 'Setup',
    });
  }

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
      >
        <div style={{ padding: '16px', textAlign: 'center', background: colorBgContainer }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {collapsed ? '⛽' : '⛽ Fuel Pump'}
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text strong>{user?.name || 'User'}</Text>
            <Tag color={isOwner ? 'blue' : 'green'}>{isOwner ? 'Owner' : 'Operator'}</Tag>
            <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleLogout} size="large">
              Logout
            </Button>
          </div>
        </Header>
        <Content
          className={location.pathname === '/' ? 'dashboard-content' : undefined}
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: location.pathname === '/' ? '#EDF2F0' : colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
