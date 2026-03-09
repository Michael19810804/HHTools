import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SignDashboard from './pages/SignDashboard';
import ContractTool from './pages/ContractTool';
import DebugLogin from './pages/DebugLogin';
import UploadPage from './pages/Upload';
import Sign from './pages/Sign';
import ClientLayout from './pages/client/ClientLayout';
import ServicePortal from './pages/client/ServicePortal';
import Apply from './pages/client/Apply';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

// Get the app mode from environment variable
const APP_MODE = import.meta.env.VITE_APP_MODE || 'admin'; // 'admin' | 'client'

const App: React.FC = () => {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    // Only check session for admin mode or if user is trying to access protected routes
    if (APP_MODE === 'admin') {
      checkSession();
    }
  }, [checkSession]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* 
            Mode: CLIENT 
            If VITE_APP_MODE is 'client', we ONLY render the client portal routes at the root.
            Admin routes are disabled/hidden.
          */}
          {APP_MODE === 'client' && (
            <Route path="/" element={<ClientLayout />}>
              <Route index element={<ServicePortal />} />
              <Route path="apply" element={<Apply />} />
              {/* Fallback for any unknown route in client mode */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}

          {/* 
            Mode: ADMIN (Default)
            If VITE_APP_MODE is 'admin' (or undefined), we render the full HH Tools suite.
            Client portal is still accessible via /staycare for preview.
          */}
          {APP_MODE === 'admin' && (
            <>
              <Route path="/login" element={<Login />} />
              
              {/* Main Dashboard */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Tools Routes */}
              <Route 
                path="/tools/sign" 
                element={
                  <ProtectedRoute>
                    <SignDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tools/contract" 
                element={
                  <ProtectedRoute>
                    <ContractTool />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tools/sign/upload" 
                element={
                  <ProtectedRoute>
                    <UploadPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Compatibility Redirects */}
              <Route path="/upload" element={<Navigate to="/tools/sign/upload" replace />} />

              {/* Client Portal (Preview Mode in Admin) */}
              <Route path="/staycare" element={<ClientLayout />}>
                <Route index element={<ServicePortal />} />
                <Route path="apply" element={<Apply />} />
              </Route>

              {/* Public/Debug Routes */}
              <Route path="/login/debug" element={<Navigate to="/debug" replace />} />
              <Route path="/debug" element={<DebugLogin />} />
              <Route path="/sign/:token" element={<Sign />} />
              
              {/* Default redirect for Admin */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
