import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    const { username, password } = values;
    setLoading(true);

    try {
      // Internal Hardcoded Logic mapping (Simplified for internal use)
      if (username === 'rocket' && password === '9898') {
        const email = 'rocket@hhtools.com';
        const realPassword = 'rocket9898';

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: realPassword,
        });

        if (error) throw error;

        message.success('登录成功');
        navigate('/dashboard');
      } else {
        message.error('用户名或密码错误');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      message.error(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-xl">
        <div className="text-center mb-8">
          <Title level={2} style={{ color: '#1f2937', marginBottom: 0 }}>HH Tools</Title>
          <Text type="secondary">公司内部工具平台</Text>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined className="text-gray-400" />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined className="text-gray-400" />} 
              placeholder="密码" 
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} className="bg-blue-600">
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
