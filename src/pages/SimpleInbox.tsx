import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Card,
  Button,
  message,
  Table,
  Tag,
  Space,
  Breadcrumb
} from 'antd';
import {
  LinkOutlined,
  SearchOutlined,
  AppstoreOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

interface InboxItem {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  project: string;
  unit: string;
  layout: string;
  remarks: string;
  passport_url: string;
  title_deed_url: string;
  blue_book_url: string;
  contract_url: string;
}

const SimpleInbox: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboxItem[]>([]);
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('compliance_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(items || []);
    } catch (error: any) {
      console.error('Error fetching inbox:', error);
      message.error('加载列表失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('compliance_uploads')
        .createSignedUrl(path, 3600); // 1 hour validity

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      message.error('无法打开文件: ' + error.message);
    }
  };

  const columns: ColumnsType<InboxItem> = [
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      width: 180,
    },
    {
      title: '基本信息',
      key: 'identity',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.phone}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </Space>
      ),
    },
    {
      title: '房源信息',
      key: 'property',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.project} {record.unit}</Text>
          <Tag color="blue">{record.layout}</Tag>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      ellipsis: true,
    },
    {
      title: '文件',
      key: 'files',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.passport_url && (
            <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openFile(record.passport_url)}>
              护照
            </Button>
          )}
          {record.title_deed_url && (
            <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openFile(record.title_deed_url)}>
              地契
            </Button>
          )}
          {record.blue_book_url && (
            <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openFile(record.blue_book_url)}>
              蓝本
            </Button>
          )}
          {record.contract_url && (
            <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openFile(record.contract_url)}>
              现有合约
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="flex justify-between items-center px-6 bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white font-bold">
              HH
            </div>
            <span className="text-lg font-bold text-gray-800">HH Tools</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600 font-medium">合规性材料 (Compliance)</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            icon={<AppstoreOutlined />} 
            onClick={() => navigate('/dashboard')}
          >
            工具箱首页
          </Button>
          <span className="text-gray-600 hidden md:inline">欢迎, {user?.email}</span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500"
          >
            退出
          </Button>
        </div>
      </Header>
      
      <Content className="p-8">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item href="/dashboard">首页</Breadcrumb.Item>
            <Breadcrumb.Item>合规性材料</Breadcrumb.Item>
          </Breadcrumb>

          <div className="mb-6">
            <Title level={2}>合规性材料</Title>
            <Text type="secondary">收集和管理房源、客户及合同的合规文件</Text>
          </div>

          <Card>
            <div className="flex justify-end mb-4">
              <Button icon={<SearchOutlined />} onClick={fetchData}>刷新列表</Button>
            </div>
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default SimpleInbox;
