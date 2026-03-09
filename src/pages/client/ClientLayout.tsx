import React from 'react';
import { Layout, Menu, Typography, Button } from 'antd';
import { HomeOutlined, FileTextOutlined, SendOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const ClientLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      key: '/staycare',
      label: <Link to="/staycare">服务中心</Link>,
      icon: <HomeOutlined />,
    },
    {
      key: '/staycare/apply',
      label: <Link to="/staycare/apply">托管申请</Link>,
      icon: <SendOutlined />,
    },
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm sticky top-0 z-50 h-16">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/staycare')}>
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg text-white font-bold text-xl shadow-md">
            M
          </div>
          <Title level={4} className="m-0 text-gray-800" style={{ margin: 0 }}>
            MXL Services
          </Title>
        </div>
        
        {/* Desktop Menu */}
        <Menu 
          mode="horizontal" 
          selectedKeys={[location.pathname]} 
          items={menuItems}
          className="border-none flex-1 justify-end hidden md:flex min-w-[300px]"
        />

        {/* Mobile Menu Button (Placeholder for now) */}
        <div className="md:hidden">
          <Button type="text" icon={<HomeOutlined />} />
        </div>
      </Header>

      <Content className="p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-xl shadow-sm min-h-[calc(100vh-200px)] p-6 md:p-10">
          <Outlet />
        </div>
      </Content>

      <Footer className="text-center text-gray-500 bg-gray-50 py-8">
        HHTools ©{new Date().getFullYear()} Created by HH Group
      </Footer>
    </Layout>
  );
};

export default ClientLayout;
