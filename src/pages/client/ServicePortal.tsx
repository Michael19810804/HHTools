import React, { useState } from 'react';
import { 
  Tabs, 
  Layout, 
  Typography,
  Affix,
  theme
} from 'antd';
import { 
  HomeOutlined, 
  GlobalOutlined, 
  CarOutlined, 
  AppstoreOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

// Tab Components
import PropertyTab from './tabs/PropertyTab';
import VisaTab from './tabs/VisaTab';
import ApartmentTab from './tabs/ApartmentTab';
import LifestyleTab from './tabs/LifestyleTab';

const { Title, Paragraph } = Typography;

const ServicePortal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Parse tab from URL query param if needed, or default to 'property'
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'property';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // Update URL without reload to allow bookmarking/sharing
    navigate(`?tab=${key}`, { replace: true });
  };

  const items = [
    {
      key: 'property',
      label: (
        <span className="px-2 py-1 flex items-center gap-2 text-base">
          <HomeOutlined />
          房产托管
        </span>
      ),
      children: <PropertyTab />,
    },
    {
      key: 'apartment',
      label: (
        <span className="px-2 py-1 flex items-center gap-2 text-base">
          <AppstoreOutlined />
          公寓周租
        </span>
      ),
      children: <ApartmentTab />,
    },
    {
      key: 'visa',
      label: (
        <span className="px-2 py-1 flex items-center gap-2 text-base">
          <GlobalOutlined />
          签证服务
        </span>
      ),
      children: <VisaTab />,
    },
    {
      key: 'lifestyle',
      label: (
        <span className="px-2 py-1 flex items-center gap-2 text-base">
          <CarOutlined />
          私人订制
        </span>
      ),
      children: <LifestyleTab />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Portal Header / Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 px-6 text-center shadow-md relative overflow-hidden h-[280px] flex flex-col justify-center items-center">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Title level={1} style={{ color: 'white', marginBottom: '0.5rem', fontSize: '3rem', fontWeight: 800 }}>
            MXL Service Center
          </Title>
          <Paragraph style={{ color: '#bfdbfe', fontSize: '1.25rem', fontWeight: 300 }}>
            曼小楼 · 曼谷旅居生活服务提供商
          </Paragraph>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-16 relative z-20">
        <div className="bg-white rounded-xl shadow-xl min-h-[600px] overflow-hidden border border-gray-100">
          <Tabs 
            activeKey={activeTab} 
            onChange={handleTabChange} 
            items={items} 
            centered 
            size="large"
            tabBarStyle={{ 
              marginBottom: 0, 
              paddingTop: 16, 
              backgroundColor: '#fff',
              borderBottom: '1px solid #f0f0f0' 
            }}
            className="custom-tabs p-6 md:p-10"
            animated={{ inkBar: true, tabPane: true }}
          />
        </div>
      </div>

      {/* Floating Contact Button (Mobile Friendly) */}
      <Affix style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000 }}>
        <button 
          className="w-14 h-14 bg-green-500 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-green-600 hover:scale-110 transition-all cursor-pointer border-none focus:outline-none"
          onClick={() => alert('请添加客服微信: MXL_Service')}
          title="Contact Support"
        >
          <PhoneOutlined style={{ fontSize: '24px' }} />
        </button>
      </Affix>
    </div>
  );
};

export default ServicePortal;
