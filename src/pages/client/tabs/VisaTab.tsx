import React from 'react';
import { 
  Typography, 
  Button, 
  Card, 
  Row, 
  Col, 
  List,
  Avatar,
  Tag
} from 'antd';
import { 
  GlobalOutlined, 
  IdcardOutlined, 
  CheckCircleFilled,
  ContactsOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const VisaTab: React.FC = () => {
  const visaTypes = [
    {
      title: '泰国精英签证 (Elite Visa)',
      desc: '尊享 5-20 年长期居留权，快速通关，专人接待。适合高净值人士及家庭。',
      price: '฿900,000 起',
      tags: ['长期居留', '快速办理', '无需存款'],
      icon: <GlobalOutlined className="text-gold-500 text-2xl" style={{ color: '#d4af37' }} />
    },
    {
      title: '养老签证 (Retirement Visa)',
      desc: '年满 50 周岁即可申请，手续简单，无需投资。',
      price: '咨询报价',
      tags: ['50岁+', '每年续签', '资金证明'],
      icon: <IdcardOutlined className="text-blue-500 text-2xl" />
    },
    {
      title: '工作签证 (Non-B)',
      desc: '正规公司担保，包含工作证 (Work Permit) 办理服务。',
      price: '咨询报价',
      tags: ['需公司资质', '合法纳税'],
      icon: <ContactsOutlined className="text-green-500 text-2xl" />
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pt-4">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <Title level={2}>专业签证服务</Title>
        <Paragraph className="text-gray-500">
          无论是长期定居、退休养老还是商务工作，我们提供一站式签证咨询与代办服务，助您轻松开启泰国生活。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {visaTypes.map((item, index) => (
          <Col xs={24} md={8} key={index}>
            <Card className="h-full hover:shadow-lg transition-shadow border-gray-100 rounded-xl overflow-hidden">
              <div className="flex flex-col h-full">
                <div className="mb-4 flex justify-between items-start">
                  <div className="p-3 bg-gray-50 rounded-lg inline-block">
                    {item.icon}
                  </div>
                  <Tag color="blue">{item.price}</Tag>
                </div>
                
                <Title level={4} className="mb-2">{item.title}</Title>
                <Paragraph className="text-gray-500 text-sm flex-grow mb-4">
                  {item.desc}
                </Paragraph>
                
                <div className="space-y-2 mb-6">
                  {item.tags.map(tag => (
                    <div key={tag} className="flex items-center text-xs text-gray-500">
                      <CheckCircleFilled className="text-green-500 mr-2" />
                      {tag}
                    </div>
                  ))}
                </div>

                <Button type="primary" block ghost>
                  咨询详情
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="bg-blue-50 p-6 rounded-xl text-center mt-8">
        <Title level={5} className="text-blue-800 mb-2">需要个性化方案？</Title>
        <Paragraph className="text-blue-600 mb-4">
          添加客服微信，获取最新政策解读与免费评估。
        </Paragraph>
        <Button type="primary" size="large" className="bg-blue-600">
          联系客服 (WeChat/Line)
        </Button>
      </div>
    </div>
  );
};

export default VisaTab;
