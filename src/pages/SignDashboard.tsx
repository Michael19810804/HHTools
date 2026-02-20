import React from 'react';
import { Button, Layout, Typography, Card, Statistic, Row, Col, Breadcrumb } from 'antd';
import { LogoutOutlined, FileTextOutlined, CloudUploadOutlined, CheckCircleOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title } = Typography;

const SignDashboard: React.FC = () => {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

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
            <Button 
              type="primary" 
              size="large" 
              icon={<CloudUploadOutlined />}
              onClick={() => navigate('/tools/sign/upload')}
            >
              上传新文档
            </Button>
          </div>

          <Row gutter={16} className="mb-8">
            <Col span={8}>
              <Card>
                <Statistic 
                  title="待处理" 
                  value={12} 
                  prefix={<FileTextOutlined className="text-blue-500" />} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="进行中" 
                  value={5} 
                  prefix={<CloudUploadOutlined className="text-orange-500" />} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic 
                  title="已完成" 
                  value={88} 
                  prefix={<CheckCircleOutlined className="text-green-500" />} 
                />
              </Card>
            </Col>
          </Row>

          <Card title="最近文档" className="shadow-sm">
            <div className="text-center py-12 text-gray-400">
              <FileTextOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>暂无文档，点击右上角上传</p>
            </div>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default SignDashboard;
