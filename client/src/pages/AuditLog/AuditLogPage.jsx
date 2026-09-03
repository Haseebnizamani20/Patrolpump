import { useState, useEffect, useCallback } from 'react';
import {
  Table, Select, DatePicker, Button, Tag, Space,
  Typography, message, Tooltip,
} from 'antd';
import { SearchOutlined, AuditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS = {
  CREATE:       'green',
  UPDATE:       'blue',
  DELETE:       'red',
  VOID:         'volcano',
  LOGIN:        'cyan',
  OPEN_DAY:     'lime',
  CLOSE_DAY:    'orange',
  REOPEN_DAY:   'gold',
  STOCK_ADJUST: 'purple',
  SETUP:        'geekblue',
};

const ACTIONS = Object.keys(ACTION_COLORS);
const ENTITY_TYPES = [
  'Sale','Purchase','Payment','Expense','SupplierPayment',
  'StockAdjustment','Customer','Supplier','Unit','CashSession','User','Setup',
];

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entityType: '', dateRange: null });

  const fetchLogs = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params = [];
      if (f.action) params.push(`action=${f.action}`);
      if (f.entityType) params.push(`entityType=${f.entityType}`);
      if (f.dateRange?.[0]) params.push(`startDate=${f.dateRange[0].format('YYYY-MM-DD')}`);
      if (f.dateRange?.[1]) params.push(`endDate=${f.dateRange[1].format('YYYY-MM-DD')}`);
      const url = '/audit-log' + (params.length ? '?' + params.join('&') : '');
      const res = await axiosInstance.get(url);
      setLogs(res.data.data);
    } catch { message.error('Failed to load audit log'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = () => fetchLogs(filters);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      width: 150,
      render: t => dayjs(t).format('DD MMM YY HH:mm'),
      sorter: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    },
    {
      title: 'User',
      dataIndex: 'userName',
      width: 130,
      render: (name, r) => (
        <span>
          {name}
          <Tag color={r.userRole === 'owner' ? 'blue' : 'green'} style={{ marginLeft: 4 }}>
            {r.userRole}
          </Tag>
        </span>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 120,
      render: a => <Tag color={ACTION_COLORS[a] || 'default'}>{a}</Tag>,
    },
    {
      title: 'Entity',
      dataIndex: 'entityType',
      width: 130,
      render: t => t || '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      ellipsis: true,
      render: (desc, r) => (
        <Tooltip title={JSON.stringify(r.metadata, null, 2)}>
          {desc}
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}><AuditOutlined /> Audit Log</Title>

      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by action" allowClear style={{ width: 160 }}
          onChange={v => setFilters(f => ({ ...f, action: v || '' }))}
          options={ACTIONS.map(a => ({ value: a, label: a }))}
        />
        <Select
          placeholder="Filter by entity" allowClear style={{ width: 170 }}
          onChange={v => setFilters(f => ({ ...f, entityType: v || '' }))}
          options={ENTITY_TYPES.map(e => ({ value: e, label: e }))}
        />
        <RangePicker
          onChange={dr => setFilters(f => ({ ...f, dateRange: dr }))}
          placeholder={['From', 'To']}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>Search</Button>
      </Space>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 50 }}
        size="small"
        locale={{ emptyText: 'No audit log entries match the filters' }}
      />
    </div>
  );
};

export default AuditLogPage;
