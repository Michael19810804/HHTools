import React from 'react';
import { 
  Typography, 
  Button, 
  Card, 
  Row, 
  Col, 
  Tag
} from 'antd';
import { 
  SketchOutlined,
  MedicineBoxOutlined,
  HeartOutlined,
  CarOutlined,
  SmileOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const LifestyleTab: React.FC = () => {
  const categories = [
    {
      title: '专车出行 (Transport)',
      desc: '机场接送、商务包车、一日游。阿尔法/奔驰等多种车型，配备双语司机。',
      icon: <CarOutlined className="text-blue-500 text-3xl" />,
      tag: '安全准时'
    },
    {
      title: '珠宝品鉴 (Gems)',
      desc: '源头矿区直供，专业鉴定证书，为您甄选高品质红蓝宝石。',
      icon: <SketchOutlined className="text-pink-500 text-3xl" />,
      tag: '私人定制'
    },
    {
      title: '高端保险 (Insurance)',
      desc: '针对在泰华人的意外险、医疗险，覆盖全泰私立医院，理赔无忧。',
      icon: <MedicineBoxOutlined className="text-red-500 text-3xl" />,
      tag: '全额赔付'
    },
    {
      title: '医疗医美 (Medical)',
      desc: '曼谷顶级私立医院预约通道，以及医美抗衰老项目咨询。',
      icon: <HeartOutlined className="text-rose-500 text-3xl" />,
      tag: '绿色通道'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pt-4">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <Title level={2}>私人订制服务</Title>
        <Paragraph className="text-gray-500">
          除了基础的房产托管，我们还为您在泰国的精致生活提供全方位的私人管家支持。
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {categories.map((item, index) => (
          <Col xs={24} sm={12} key={index}>
            <Card 
              hoverable 
              className="h-full border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <Title level={5} className="m-0">{item.title}</Title>
                    <Tag color="purple" className="m-0 text-xs">{item.tag}</Tag>
                  </div>
                  <Paragraph className="text-gray-500 text-sm mb-4">
                    {item.desc}
                  </Paragraph>
                  <Button type="link" size="small" className="p-0">了解更多 &gt;</Button>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="text-center mt-12 bg-purple-50 p-8 rounded-2xl">
        <SmileOutlined className="text-4xl text-purple-500 mb-4" />
        <Title level={4} className="text-purple-800">不仅仅是服务，更是您的生活管家</Title>
        <Paragraph className="text-purple-600 max-w-xl mx-auto mb-6">
          如有其他特殊需求（如商务翻译、学校申请、活动策划等），请随时联系我们的私人管家团队。
        </Paragraph>
        <Button type="primary" className="bg-purple-600 border-none px-8 h-10">
          联系管家
        </Button>
      </div>
    </div>
  );
};

export default LifestyleTab;
