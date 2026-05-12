import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuthStore } from '../store/authStore';

const SSOCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('Missing token in URL parameters');
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/sso/verify?token=${token}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Verification failed');
        }

        const data = await response.json();
        
        // Mock a Supabase-like session object for the store
        // Adjust this depending on what your backend returns and what useAuthStore expects
        const mockSession = {
          access_token: token,
          refresh_token: '',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: {
            id: data.user.userId || 'sso-user',
            app_metadata: { provider: 'sso' },
            user_metadata: { name: data.user.name },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email: data.user.email,
          }
        };

        // Note: Because Supabase client handles its own session state, 
        // purely setting it in Zustand might not make Supabase API calls authenticated
        // if those calls rely on Supabase's internal auth state.
        // For a full SSO implementation with Supabase, you usually generate a custom JWT 
        // on your backend, and use supabase.auth.signInWithIdToken() or similar.
        // We will just set it in the store for UI purposes here.
        setSession(mockSession as any);
        
        // Redirect to dashboard on success
        navigate('/dashboard', { replace: true });
        
      } catch (err: any) {
        console.error('SSO Error:', err);
        setError(err.message || 'An error occurred during SSO login');
      }
    };

    verifyToken();
  }, [searchParams, navigate, setSession]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Result
          status="error"
          title="SSO Login Failed"
          subTitle={error}
          extra={[
            <Button type="primary" key="console" onClick={() => navigate('/login')}>
              Go to standard login
            </Button>
          ]}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Spin size="large" />
      <h2 className="mt-4 text-lg text-gray-600">Verifying single sign-on...</h2>
    </div>
  );
};

export default SSOCallback;