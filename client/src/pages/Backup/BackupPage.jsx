import { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Table, Tag, Alert, Row, Col,
  Statistic, Typography, Space, Spin, Divider,
  message, Tooltip,
} from 'antd';
import {
  CloudUploadOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, FolderOutlined, WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../api/axiosInstance';

const { Title, Text, Paragraph } = Typography;

const BackupPage = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/backup/status');
      setStatus(res.data.data);
    } catch {
      message.error('Failed to load backup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleBackup = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await axiosInstance.post('/backup/run');
      setLastResult({ success: true, message: res.data.data?.message, dir: res.data.data?.backupDir });
      message.success('Backup completed successfully!');
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Backup failed';
      setLastResult({ success: false, message: msg });
      message.error(msg);
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    {
      title: 'Backup Name',
      dataIndex: 'name',
      render: (name) => (
        <Space>
          <FolderOutlined style={{ color: '#1677ff' }} />
          <Text code style={{ fontSize: 12 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Date & Time',
      dataIndex: 'timestamp',
      render: (ts) => (
        <Space orientation="vertical" size={0}>
          <Text>{dayjs(ts).format('DD MMM YYYY')}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(ts).format('HH:mm:ss')}</Text>
        </Space>
      ),
      sorter: (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Database',
      dataIndex: 'database',
      render: d => d || 'Pump',
    },
    {
      title: 'Status',
      dataIndex: 'success',
      render: (ok) => ok
        ? <Tag icon={<CheckCircleOutlined />} color="success">Success</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="error">Failed</Tag>,
    },
  ];

  const lastBackup = status?.backups?.[0];
  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup.timestamp)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>💾 Backup</Title>
        <Button icon={<ReloadOutlined />} onClick={fetchStatus} loading={loading}>
          Refresh
        </Button>
      </div>

      {loading && !status ? (
        <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
      ) : (
        <>
          {/* Status cards */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="mongodump Available"
                  value={status?.mongodumpAvailable ? 'Yes' : 'No'}
                  valueStyle={{ color: status?.mongodumpAvailable ? '#52c41a' : '#cf1322' }}
                  prefix={status?.mongodumpAvailable
                    ? <CheckCircleOutlined />
                    : <CloseCircleOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Total Backups"
                  value={status?.totalBackups || 0}
                  prefix={<FolderOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Statistic
                  title="Last Backup"
                  value={lastBackup ? `${daysSinceBackup}d ago` : 'Never'}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: daysSinceBackup === null || daysSinceBackup > 3 ? '#cf1322' : '#52c41a' }}
                />
                {lastBackup && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(lastBackup.timestamp).format('DD MMM YYYY HH:mm')}
                  </Text>
                )}
              </Card>
            </Col>
          </Row>

          {/* Warnings */}
          {!status?.mongodumpAvailable && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message="MongoDB Database Tools not found"
              description={
                <>
                  <Paragraph style={{ marginBottom: 4 }}>
                    Install MongoDB Database Tools to enable backups:
                  </Paragraph>
                  <Text code>https://www.mongodb.com/try/download/database-tools</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    After installing, restart this application.
                  </Text>
                </>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {daysSinceBackup !== null && daysSinceBackup > 3 && (
            <Alert
              type="warning"
              showIcon
              message={`Last backup was ${daysSinceBackup} days ago`}
              description="It is recommended to back up daily. Click 'Run Backup Now' below."
              style={{ marginBottom: 16 }}
            />
          )}

          {daysSinceBackup === null && (
            <Alert
              type="warning"
              showIcon
              message="No backups found"
              description="Run your first backup now to protect your data."
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Last result */}
          {lastResult && (
            <Alert
              type={lastResult.success ? 'success' : 'error'}
              showIcon
              message={lastResult.success ? 'Backup Successful' : 'Backup Failed'}
              description={
                <>
                  <div>{lastResult.message}</div>
                  {lastResult.dir && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Location: {lastResult.dir}
                    </Text>
                  )}
                </>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Manual backup button */}
          <Card title="Manual Backup" style={{ marginBottom: 16 }}>
            <Paragraph type="secondary">
              Creates a complete backup of the <Text strong>Pump</Text> database using{' '}
              <Text code>mongodump</Text>. The backup is saved locally in the{' '}
              <Text code>backup/data/</Text> folder inside the application directory.
              The last 7 backups are kept automatically.
            </Paragraph>
            <Button
              type="primary"
              size="large"
              icon={<CloudUploadOutlined />}
              loading={running}
              disabled={!status?.mongodumpAvailable}
              onClick={handleBackup}
            >
              {running ? 'Running Backup…' : 'Run Backup Now'}
            </Button>
            {!status?.mongodumpAvailable && (
              <Text type="secondary" style={{ marginLeft: 12 }}>
                (Install MongoDB Database Tools to enable)
              </Text>
            )}
          </Card>

          {/* Backup history */}
          <Divider orientation="left">Backup History</Divider>
          <Table
            dataSource={status?.backups || []}
            columns={columns}
            rowKey="name"
            pagination={{ pageSize: 10 }}
            size="small"
            locale={{ emptyText: 'No backups yet. Run your first backup above.' }}
          />

          {/* Schedule instructions */}
          <Divider orientation="left">Automatic Daily Backup (Windows Task Scheduler)</Divider>
          <Card size="small">
            <Paragraph>
              To run backups automatically every day, set up a Windows Task Scheduler entry:
            </Paragraph>
            <ol>
              <li>Open <Text strong>Task Scheduler</Text> (search in Start Menu)</li>
              <li>Click <Text strong>Create Basic Task…</Text></li>
              <li>Name: <Text code>PumpDB Daily Backup</Text></li>
              <li>Trigger: <Text strong>Daily</Text> at <Text strong>11:00 PM</Text></li>
              <li>Action: <Text strong>Start a program</Text></li>
              <li>Program: <Text code>node</Text></li>
              <li>
                Arguments:{' '}
                <Text code copyable>
                  {`"${status?.backupRoot?.replace('data', 'backup-script.js') || 'backup\\backup-script.js'}"`}
                </Text>
              </li>
              <li>Click <Text strong>Finish</Text></li>
            </ol>
            <Alert
              type="info"
              showIcon
              message="Tip: Test the task immediately after creating it by right-clicking it and selecting 'Run'."
              style={{ marginTop: 8 }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default BackupPage;
