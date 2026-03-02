import React, { useEffect, useState } from 'react';
import { 
  Button, 
  Layout, 
  Typography, 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Breadcrumb, 
  Table, 
  Tag, 
  Space, 
  Modal, 
  List, 
  Tooltip, 
  message,
  Input 
} from 'antd';
import { 
  LogoutOutlined, 
  FileTextOutlined, 
  CloudUploadOutlined, 
  CheckCircleOutlined, 
  AppstoreOutlined,
  EyeOutlined,
  CopyOutlined,
  LinkOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import { generateSignedPdf } from '../utils/pdfGenerator';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface Signer {
  id: string;
  name: string;
  email: string;
  role: 'signer' | 'viewer';
  status: 'pending' | 'signed' | 'declined';
  token: string;
  order_index: number;
}

interface Document {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  created_at: string;
  signers: Signer[];
}

const SignDashboard: React.FC = () => {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, completed: 0 });
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchDocuments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          signers (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const docs = data as Document[];
      setDocuments(docs);

      // Calculate stats
      const newStats = {
        pending: docs.filter(d => d.status === 'pending').length,
        inProgress: docs.filter(d => d.status === 'in_progress').length,
        completed: docs.filter(d => d.status === 'completed').length,
      };
      setStats(newStats);

    } catch (error: any) {
      console.error('Error fetching documents:', error);
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    
    // Search in title
    if (doc.title.toLowerCase().includes(lowerSearch)) return true;
    
    // Search in signers' emails or names
    return doc.signers.some(signer => 
      signer.email.toLowerCase().includes(lowerSearch) || 
      signer.name.toLowerCase().includes(lowerSearch)
    );
  });

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      message.success('文档已删除');
      fetchDocuments();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const getStatusTag = (status: string) => {
    const map: Record<string, string> = {
      pending: 'orange',
      in_progress: 'blue',
      completed: 'green',
      expired: 'red',
    };
    return <Tag color={map[status] || 'default'}>{status.toUpperCase()}</Tag>;
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(link);
    message.success('签署链接已复制！');
  };

  const handleDownload = async (doc: Document) => {
    try {
      message.loading({ content: '正在生成PDF...', key: 'pdfGen' });
      
      // 1. Get document details
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', doc.id)
        .single();
      
      if (docError) throw docError;

      // 2. Download original PDF
      const { data: fileData, error: fileError } = await supabase.storage
        .from('documents')
        .download(documentData.file_url);

      if (fileError) throw fileError;
      const originalPdfBuffer = await fileData.arrayBuffer();

      // 3. Get signatures (from ALL signers)
      const { data: signatures, error: sigError } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', doc.id);

      if (sigError) throw sigError;

      // 4. Generate signed PDF
      const signedPdfBytes = await generateSignedPdf(originalPdfBuffer, signatures || []);

      // 5. Trigger download
      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      saveAs(blob, `${documentData.title}_signed.pdf`);

      message.success({ content: '下载成功', key: 'pdfGen' });
    } catch (error: any) {
      console.error('Download error:', error);
      message.error({ content: '生成PDF失败', key: 'pdfGen' });
    }
  };

  const columns = [
    {
      title: '文档标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '签署进度',
      key: 'progress',
      render: (_: any, record: Document) => {
        const total = record.signers.filter(s => s.role === 'signer').length;
        const signed = record.signers.filter(s => s.role === 'signer' && s.status === 'signed').length;
        return <span>{signed} / {total}</span>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Document) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<DownloadOutlined />} 
            onClick={() => handleDownload(record)}
            disabled={record.status !== 'completed'}
            title={record.status !== 'completed' ? '所有签字完成后才可下载' : '下载已签字文档'}
          >
            下载PDF
          </Button>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => {
              setSelectedDoc(record);
              setIsModalVisible(true);
            }}
          >
            详情/链接
          </Button>
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: '确定要删除这个文档吗？此操作无法撤销。',
                onOk: () => deleteDocument(record.id)
              });
            }}
          />
        </Space>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="flex justify-between items-center px-6 bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-white font-bold">
              HH
            </div>
            <span className="text-lg font-bold text-gray-800">HH Tools</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600 font-medium">电子签字 (Sign)</span>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            icon={<AppstoreOutlined />} 
            onClick={() => navigate('/dashboard')}
          >
            工具箱首页
          </Button>
          <span className="text-gray-600">欢迎, {user?.email}</span>
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
      
      <Content className="p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item href="/dashboard">首页</Breadcrumb.Item>
            <Breadcrumb.Item>电子签字</Breadcrumb.Item>
          </Breadcrumb>

          <div className="flex justify-between items-center mb-8">
            <Title level={2} style={{ margin: 0 }}>文档管理</Title>
            <Space>
              <Input 
                placeholder="搜索文档标题或签署人..." 
                prefix={<SearchOutlined />} 
                style={{ width: 250 }}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
              <Button 
                type="primary" 
                size="large" 
                icon={<CloudUploadOutlined />}
                onClick={() => navigate('/tools/sign/upload')}
              >
                上传新文档
              </Button>
            </Space>
          </div>

          <Row gutter={16} className="mb-8">
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic 
                  title="待处理" 
                  value={stats.pending} 
                  prefix={<FileTextOutlined className="text-orange-500" />} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic 
                  title="进行中" 
                  value={stats.inProgress} 
                  prefix={<CloudUploadOutlined className="text-blue-500" />} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic 
                  title="已完成" 
                  value={stats.completed} 
                  prefix={<CheckCircleOutlined className="text-green-500" />} 
                />
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
            <Table 
              columns={columns} 
              dataSource={filteredDocuments} 
              rowKey="id" 
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </div>
      </Content>

      <Modal
        title="文档详情 & 签署链接"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedDoc && (
          <div>
            <div className="mb-4">
              <Text strong>文档标题: </Text> <Text>{selectedDoc.title}</Text>
              <br />
              <Text strong>创建时间: </Text> <Text>{dayjs(selectedDoc.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </div>
            
            <Title level={5}>签字人列表</Title>
            <List
              dataSource={selectedDoc.signers.sort((a, b) => a.order_index - b.order_index)}
              renderItem={signer => (
                <List.Item
                  actions={[
                    <Button 
                      key="link" 
                      type="primary" 
                      ghost 
                      size="small" 
                      icon={<CopyOutlined />} 
                      onClick={() => copyLink(signer.token)}
                    >
                      复制签署链接
                    </Button>,
                    <Button
                      key="open"
                      type="link"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => window.open(`/sign/${signer.token}`, '_blank')}
                    >
                      打开
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{signer.name}</Text>
                        <Tag color={signer.role === 'viewer' ? 'default' : 'blue'}>{signer.role.toUpperCase()}</Tag>
                        {signer.status === 'signed' ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>已签署</Tag>
                        ) : (
                          <Tag color="orange">等待中</Tag>
                        )}
                      </Space>
                    }
                    description={signer.email}
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default SignDashboard;
