import React from 'react';
import { 
  Typography, 
  Button, 
  Card, 
  Row, 
  Col, 
  Tag,
  List,
  Badge
} from 'antd';
import { 
  HomeOutlined, 
  WifiOutlined, 
  CoffeeOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ApartmentTab: React.FC = () => {
  const apartments = [
    {
      title: '通罗商圈 - 高端一居室',
      location: 'Thong Lo, Sukhumvit',
      price: '฿2,500 / 晚',
      tags: ['近BTS', '泳池健身房', '可做饭'],
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop',
      features: ['高速WiFi', '全套厨具', '每日清洁']
    },
    {
      title: '河畔景观 - 豪华两居',
      location: 'Riverside, IconSiam',
      price: '฿4,500 / 晚',
      tags: ['绝美河景', '免费接驳船', '适合家庭'],
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2080&auto=format&fit=crop',
      features: ['55寸智能电视', '洗衣机/烘干机', '儿童游乐区']
    },
    {
      title: 'Rama 9 - 商务公寓',
      location: 'Rama 9, CBD',
      price: '฿1,800 / 晚',
      tags: ['靠近夜市', '交通便利', '性价比高'],
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2070&auto=format&fit=crop',
      features: ['办公桌椅', '24h安保', '楼下7-11']
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pt-4">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <Title level={2}>精选公寓短租</Title>
        <Paragraph className="text-gray-500">
          像当地人一样生活。我们在曼谷核心地段为您精选高品质公寓，提供酒店式清洁与管家服务。
          <br />
          <span className="text-blue-600 font-medium">支持周租/月租，租期越长优惠越多。</span>
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {apartments.map((item, index) => (
          <Col xs={24} md={8} key={index}>
            <Badge.Ribbon text="热门" color="red" className={index === 0 ? '' : 'hidden'}>
              <Card 
                hoverable 
                cover={
                  <div className="h-48 overflow-hidden">
                    <img alt={item.title} src={item.image} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  </div>
                }
                className="h-full border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all"
                bodyStyle={{ padding: '20px' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <Title level={5} className="mb-1 line-clamp-1">{item.title}</Title>
                    <div className="flex items-center text-gray-400 text-xs mb-3">
                      <EnvironmentOutlined className="mr-1" /> {item.location}
                    </div>
                  </div>
                  <div className="text-blue-600 font-bold whitespace-nowrap ml-2">
                    {item.price}
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  {item.features.map(f => (
                    <div key={f} className="text-xs text-gray-500 flex items-center">
                      <CheckCircleOutlined className="text-green-500 mr-2" /> {f}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map(tag => (
                    <Tag key={tag} color="blue" className="mr-0 text-[10px]">{tag}</Tag>
                  ))}
                </div>

                <Button type="primary" block>查看房态</Button>
              </Card>
            </Badge.Ribbon>
          </Col>
        ))}
      </Row>

      <div className="bg-orange-50 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 mt-8">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-full shadow-sm text-orange-500">
            <CoffeeOutlined className="text-2xl" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 m-0">不仅是住宿，更是体验</h4>
            <p className="text-gray-500 text-sm m-0">预订满 7 天，赠送曼谷必吃美食指南及一张 BTS 交通卡。</p>
          </div>
        </div>
        <Button size="large" className="bg-orange-500 text-white border-none hover:bg-orange-600">
          咨询客服
        </Button>
      </div>
    </div>
  );
};

export default ApartmentTab;
