import React from 'react';
import { Layout, Typography, Card, Row, Col, Button, Avatar } from 'antd';
import { LogoutOutlined, EditOutlined, FilePdfOutlined, ToolOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { Meta } = Card;

const Dashboard: React.FC = () => {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const tools = [
    {
      title: '电子签字 (eSign)',
      description: '在线PDF签署、分发与追踪',
      icon: <EditOutlined style={{ fontSize: '32px', color: '#2563eb' }} />,
      path: '/tools/sign',
      status: 'active',
      bg: 'bg-blue-50',
    },
    {
      title: 'StayCare 合约生成器',
      description: '生成租赁合同 (Word) 并自动填充数据',
      icon: <FileTextOutlined style={{ fontSize: '32px', color: '#7c3aed' }} />,
      path: '/tools/contract',
      status: 'active',
      bg: 'bg-purple-50',
    },
    {
      title: 'PDF 工具箱 (Coming Soon)',
      description: '合并、拆分、压缩 PDF 文档',
      icon: <FilePdfOutlined style={{ fontSize: '32px', color: '#ea580c' }} />,
      path: '#',
      status: 'planned',
      bg: 'bg-orange-50',
    },
    {
      title: '内部资源库 (Coming Soon)',
      description: '公司常用模板、LOGO下载',
      icon: <ToolOutlined style={{ fontSize: '32px', color: '#16a34a' }} />,
      path: '#',
      status: 'planned',
      bg: 'bg-green-50',
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-100">
      <Header className="flex justify-between items-center px-8 bg-white shadow-sm sticky top-0 z-10 h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
            HH
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight">HH Tools</h1>
            <p className="text-xs text-gray-500 leading-none">Internal Collection</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user?.user_metadata?.name || 'User'}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 hover:bg-red-50"
          >
            退出登录
          </Button>
        </div>
      </Header>
      
      <Content className="p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 text-center md:text-left">
          <Title level={2} className="!mb-2">欢迎使用 HH Tools</Title>
          <Text type="secondary" className="text-lg">请选择您需要使用的工具模块</Text>
        </div>

        <Row gutter={[24, 24]}>
          {tools.map((tool, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card 
                hoverable={tool.status === 'active'}
                className={`h-full border-0 shadow-sm transition-all duration-300 ${tool.status === 'active' ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                onClick={() => tool.status === 'active' && navigate(tool.path)}
                styles={{ body: { padding: '24px' } }}
              >
                <div className={`w-16 h-16 rounded-2xl ${tool.bg} flex items-center justify-center mb-6 mx-auto md:mx-0`}>
                  {tool.icon}
                </div>
                <Title level={4} className="!mb-2 text-center md:text-left">{tool.title}</Title>
                <p className="text-gray-500 mb-4 h-10 text-center md:text-left line-clamp-2">
                  {tool.description}
                </p>
                <div className="text-center md:text-left">
                  {tool.status === 'active' ? (
                    <span className="inline-flex items-center text-blue-600 font-medium text-sm group">
                      进入应用 <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-gray-400 font-medium text-sm bg-gray-100 px-2 py-1 rounded">
                      开发中
                    </span>
                  )}
                </div>
              </Card>
            </Col>
          ))}
          
          {/* Add New Tool Placeholder */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card 
              className="h-full border-2 border-dashed border-gray-300 bg-transparent flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer group"
              styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
              onClick={() => message.info('请联系管理员申请新工具开发')}
            >
              <PlusOutlined style={{ fontSize: '32px', marginBottom: '16px' }} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">申请新工具</span>
            </Card>
          </Col>
        </Row>
      </Content>
      
      <Footer className="text-center text-gray-400 bg-transparent">
        HH Tools Collection ©{new Date().getFullYear()} Created by HH Tech Team
      </Footer>
    </Layout>
  );
};

// Need to import message to use it in onClick
import { message } from 'antd';

export default Dashboard;
