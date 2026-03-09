import React, { useState } from 'react';
import { Form, Input, Button, Upload, message, Card, Steps, Result } from 'antd';
import { UploadOutlined, SolutionOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';

const { Dragger } = Upload;

const Apply: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // 1. Upload files
      const singleFileFields = ['passport', 'blueBook', 'prevContract'];
      const fileUrls: Record<string, string | null | string[]> = {};

      // Handle single file uploads
      for (const field of singleFileFields) {
        const fileList = values[field]?.fileList;
        if (fileList && fileList.length > 0) {
          const file = fileList[0].originFileObj;
          const fileName = `${Date.now()}_${field}_${file.name.replace(/\s+/g, '_')}`;
          
          const { data, error } = await supabase.storage
            .from('customer_uploads')
            .upload(fileName, file);

          if (error) throw error;
          fileUrls[field] = data.path;
        } else {
          fileUrls[field] = null;
        }
      }

      // Handle multiple file upload for Title Deed
      const titleDeedFiles = values.titleDeed?.fileList;
      if (titleDeedFiles && titleDeedFiles.length > 0) {
        const uploadedPaths: string[] = [];
        for (let i = 0; i < titleDeedFiles.length; i++) {
          const file = titleDeedFiles[i].originFileObj;
          const fileName = `${Date.now()}_titleDeed_${i}_${file.name.replace(/\s+/g, '_')}`;
          
          const { data, error } = await supabase.storage
            .from('customer_uploads')
            .upload(fileName, file);

          if (error) throw error;
          uploadedPaths.push(data.path);
        }
        // Store as comma-separated string or JSON string, depending on DB schema
        // Assuming current schema is TEXT, we'll join with commas or store as JSON string
        // Since we didn't change DB schema, let's store as comma-separated string for now to be safe with TEXT type
        fileUrls['titleDeed'] = uploadedPaths.join(',');
      } else {
        fileUrls['titleDeed'] = null;
      }

      // 2. Insert into database
      const { error: insertError } = await supabase
        .from('customer_submissions')
        .insert([
          {
            name: values.name,
            phone: values.phone,
            email: values.email,
            passport_url: fileUrls.passport,
            title_deed_url: fileUrls.titleDeed,
            blue_book_url: fileUrls.blueBook,
            prev_contract_url: fileUrls.prevContract,
            status: 'pending'
          }
        ]);

      if (insertError) throw insertError;

      setCurrentStep(1);
      message.success('提交成功！我们会尽快联系您。');
      
    } catch (error: any) {
      console.error('Submission error:', error);
      message.error(`提交失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: () => false, // Prevent auto upload
    maxCount: 1,
    listType: 'picture' as const,
  };

  const multipleUploadProps = {
    beforeUpload: () => false,
    multiple: true,
    maxCount: 10,
    listType: 'picture' as const,
  };

  if (currentStep === 1) {
    return (
      <Result
        status="success"
        title="申请提交成功！"
        subTitle="我们已收到您的托管申请。MXL 团队将在 24 小时内通过电话或邮件与您联系，确认后续事宜。"
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/staycare')}>
            返回首页
          </Button>,
          <Button key="again" onClick={() => { setCurrentStep(0); form.resetFields(); }}>
            提交新的申请
          </Button>,
        ]}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2">申请房产托管服务</h1>
        <p className="text-gray-500">请填写您的基本信息并上传所需文件，我们将为您定制专属托管方案。</p>
      </div>

      <Steps 
        current={currentStep} 
        className="mb-12"
        items={[
          { title: '填写资料', icon: <SolutionOutlined /> },
          { title: '等待审核', icon: <LoadingOutlined /> },
          { title: '完成', icon: <CheckCircleOutlined /> },
        ]} 
      />

      <Card className="shadow-sm">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          size="large"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="您的姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="例如: Zhang San" />
            </Form.Item>
            
            <Form.Item
              name="phone"
              label="联系电话"
              rules={[{ required: true, message: '请输入联系电话' }]}
            >
              <Input placeholder="+66 81 234 5678" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="电子邮箱"
            rules={[{ required: true, type: 'email', message: '请输入有效的邮箱地址' }]}
          >
            <Input placeholder="your.email@example.com" />
          </Form.Item>

          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2">所需文件清单</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>护照首页照片 (必需)</li>
              <li>地契复印件/照片 (必需)</li>
              <li>房屋户口本 (小蓝本) (必需)</li>
              <li>现有中介合约 (仅限中途转托管)</li>
            </ul>
          </div>

          <Form.Item
            name="passport"
            label="护照首页 (Passport)"
            rules={[{ required: true, message: '请上传护照首页' }]}
            tooltip="清晰的护照个人信息页照片"
          >
            <Dragger {...uploadProps} accept=".jpg,.jpeg,.png,.pdf">
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传护照</p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="titleDeed"
            label="地契 (Title Deed / Chanote)"
            rules={[{ required: true, message: '请上传地契文件' }]}
            tooltip="支持上传多张图片或PDF文件"
          >
            <Dragger {...multipleUploadProps} accept=".jpg,.jpeg,.png,.pdf">
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传地契 (支持多选)</p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="blueBook"
            label="房屋户口本 (Blue Book / Tabien Baan)"
            rules={[{ required: true, message: '请上传房屋户口本' }]}
          >
            <Dragger {...uploadProps} accept=".jpg,.jpeg,.png,.pdf">
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传小蓝本</p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="prevContract"
            label="现有中介合约 (Previous Agent Contract)"
            tooltip="如果您当前已有中介管理，请提供现有合约以便我们协助交接"
          >
            <Dragger {...uploadProps} accept=".jpg,.jpeg,.png,.pdf">
              <p className="ant-upload-drag-icon"><UploadOutlined /></p>
              <p className="ant-upload-text">点击或拖拽上传 (可选)</p>
            </Dragger>
          </Form.Item>

          <Form.Item className="mb-0 mt-8">
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large" 
              loading={loading}
              className="h-12 text-lg font-semibold"
            >
              提交申请
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Apply;
