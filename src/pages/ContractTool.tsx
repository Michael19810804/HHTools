import React, { useState } from 'react';
import { 
  Layout, 
  Card, 
  Upload, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Input, 
  Statistic, 
  Table, 
  message, 
  Alert,
  Divider,
  Steps,
  Image
} from 'antd';
import { 
  InboxOutlined, 
  FileExcelOutlined, 
  FileWordOutlined, 
  UserOutlined, 
  BankOutlined, 
  HomeOutlined, 
  DollarOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { parseExcelData, ContractData } from '../utils/excelParser';
import { generateContract } from '../utils/docxGenerator';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;

const ContractTool: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(false);

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    setLoading(true);
    try {
      const data = await parseExcelData(file);
      setContractData(data);
      setCurrentStep(1); // 进入下一步：核对数据
      message.success('Excel 解析成功！');
    } catch (error) {
      console.error(error);
      message.error('解析 Excel 失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
    return false; // 阻止自动上传
  };

  // 处理输入变更
  const handleInputChange = (field: keyof ContractData, value: string) => {
    if (contractData) {
      setContractData({
        ...contractData,
        [field]: value
      });
    }
  };

  // 处理生成合约
  const handleGenerate = async () => {
    if (!contractData) return;
    
    if (!contractData.ownerId) {
      message.error('缺失房东证件号，无法生成合约');
      return;
    }

    setLoading(true);
    try {
      await generateContract(contractData);
      message.success('合约已生成并开始下载！');
      setCurrentStep(2); // 完成
    } catch (error: any) {
      console.error('Contract Generation Error:', error);
      message.error(`生成合约失败: ${error.message || '请检查模板文件是否存在'}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置
  const handleReset = () => {
    setContractData(null);
    setCurrentStep(0);
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header className="flex items-center justify-between px-6 bg-white border-b border-gray-200 h-16 shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
          />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-800 leading-tight m-0">
              StayCare 合约生成器
            </h1>
            <span className="text-xs text-gray-500">
              Native React Version
            </span>
          </div>
        </div>
      </Header>

      <Content className="p-8 max-w-7xl mx-auto w-full">
        {/* 步骤条 */}
        <div className="mb-8">
          <Steps 
            current={currentStep}
            items={[
              { title: '上传 Excel', description: '导入租赁数据' },
              { title: '核对数据', description: '确认关键信息' },
              { title: '生成合约', description: '导出 Word 文档' },
            ]}
          />
        </div>

        {/* 步骤 1: 上传 */}
        {currentStep === 0 && (
          <Card className="shadow-md text-center py-12">
            <Title level={3}>📂 第一步：上传 Excel 数据表</Title>
            <Text type="secondary" className="block mb-8">
              请上传包含租赁信息的 Excel 文件 (.xlsx)，系统将自动提取数据。
            </Text>
            
            <div className="max-w-xl mx-auto">
              <Dragger 
                accept=".xlsx, .xls"
                beforeUpload={handleFileUpload}
                showUploadList={false}
                className="py-8"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#2563eb', fontSize: '48px' }} />
                </p>
                <p className="ant-upload-text text-lg">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持单个 Excel 文件上传
                </p>
              </Dragger>
            </div>
          </Card>
        )}

        {/* 步骤 2: 核对 */}
        {currentStep === 1 && contractData && (
          <div className="space-y-6">
            <Alert 
              message="请仔细核对以下提取的数据" 
              description="如果数据有误，请修改 Excel 文件后重新上传。"
              type="info" 
              showIcon 
              closable
            />

            <Row gutter={24}>
              {/* 左侧：详细表单 */}
              <Col xs={24} lg={16}>
                <Card title={<><UserOutlined /> 房东与租客信息</>} className="mb-6 shadow-sm">
                  <Row gutter={24}>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold text-red-500">房东姓名 *</label>
                        <Input 
                          status={!contractData.ownerName ? 'error' : ''} 
                          value={contractData.ownerName || 'MISSING'} 
                          onChange={(e) => handleInputChange('ownerName', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold text-red-500">房东证件号 *</label>
                        <Input 
                          status={!contractData.ownerId ? 'error' : ''} 
                          value={contractData.ownerId || 'MISSING'} 
                          onChange={(e) => handleInputChange('ownerId', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                    </Col>
                    <Col span={24}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold">银行信息</label>
                        <Input 
                          prefix={<BankOutlined className="text-gray-400" />} 
                          value={contractData.bankInfo} 
                          onChange={(e) => handleInputChange('bankInfo', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                    </Col>
                  </Row>
                </Card>

                {/* 租客信息 */}
                <Card title={<><UserOutlined className="mr-2" />租客信息</>} className="mb-6 shadow-sm">
                  <Row gutter={16}>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold">租客姓名</label>
                        <Input 
                          value={contractData.tenantName} 
                          onChange={(e) => handleInputChange('tenantName', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold">租客证件号</label>
                        <Input 
                          value={contractData.tenantId} 
                          onChange={(e) => handleInputChange('tenantId', e.target.value)}
                          className="mt-1" 
                        />
                      </div>
                    </Col>
                  </Row>
                </Card>

                <Card title={<><HomeOutlined /> 房源与租期</>} className="mb-6 shadow-sm">
                   <div className="mb-4">
                    <label className="text-gray-500 text-xs uppercase font-bold">完整地址</label>
                    <Input.TextArea autoSize value={contractData.fullAddress} readOnly className="mt-1 bg-gray-50" />
                  </div>
                  <Row gutter={24}>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold">入住日期 (Check-In)</label>
                        <Input value={contractData.checkIn} readOnly className="mt-1" />
                      </div>
                    </Col>
                    <Col span={12}>
                      <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold">退房日期 (Check-Out)</label>
                        <Input value={contractData.checkOut} readOnly className="mt-1" />
                      </div>
                    </Col>
                  </Row>
                </Card>

                <Card title={<><DollarOutlined /> 财务明细</>} className="mb-6 shadow-sm">
                  <Row gutter={24}>
                    <Col span={8}>
                      <Statistic title="月租金 (Rent)" value={contractData.rent} prefix="฿" precision={0} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="押金 (Deposit)" value={contractData.deposit} prefix="฿" precision={0} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="滞纳金/天 (Penalty)" value={contractData.latePenalty} prefix="฿" valueStyle={{ color: '#cf1322' }} />
                    </Col>
                  </Row>
                  <Divider />
                  <Row gutter={24}>
                     <Col span={12}>
                      <Statistic title="退房清洁费" value={contractData.cleaningFee} prefix="฿" precision={0} valueStyle={{ fontSize: 16 }} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="退房空调费" value={contractData.acFee} prefix="฿" precision={0} valueStyle={{ fontSize: 16 }} />
                    </Col>
                  </Row>
                </Card>
              </Col>

              {/* 右侧：付款计划表 & 按钮 */}
              <Col xs={24} lg={8}>
                <Card title="📊 付款计划表 (Payment Schedule)" className="mb-6 shadow-sm" bodyStyle={{ padding: 0 }}>
                  <Table 
                    dataSource={contractData.schedule}
                    pagination={false}
                    size="small"
                    scroll={{ y: 400 }}
                    columns={[
                      { title: 'Item', dataIndex: 'item', key: 'item', width: 60 },
                      { title: 'Date', dataIndex: 'date', key: 'date', width: 90 },
                      { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' },
                    ]}
                  />
                </Card>

                <Card className="shadow-md border-t-4 border-blue-500 sticky top-24">
                  <div className="flex flex-col gap-4">
                    <Button 
                      type="primary" 
                      size="large" 
                      icon={<FileWordOutlined />} 
                      onClick={handleGenerate}
                      loading={loading}
                      disabled={!contractData.ownerId}
                      block
                      className="h-12 text-lg"
                    >
                      生成 Word 合约 (New)
                    </Button>
                    
                    {!contractData.ownerId && (
                      <Text type="danger" className="text-center text-xs">
                        * 无法生成：缺少房东证件号
                      </Text>
                    )}

                    <Button onClick={handleReset} block>
                      重新上传 Excel
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        )}

        {/* 步骤 3: 完成 */}
        {currentStep === 2 && (
          <Card className="shadow-md text-center py-16 max-w-2xl mx-auto">
            <div className="text-green-500 mb-6">
              <FileWordOutlined style={{ fontSize: '72px' }} />
            </div>
            <Title level={2}>✅ 合约生成成功！</Title>
            <Text className="text-lg mb-8 block">
              您的合约文件已开始下载。如果没有自动下载，请点击下方按钮。
            </Text>
            
            <div className="flex justify-center gap-4">
              <Button type="primary" size="large" onClick={handleGenerate}>
                再次下载
              </Button>
              <Button size="large" onClick={handleReset}>
                处理下一个合同
              </Button>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
};

export default ContractTool;
