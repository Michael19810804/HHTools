import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SignDashboard from './pages/SignDashboard';
import ContractTool from './pages/ContractTool';
import UploadPage from './pages/Upload';
import Sign from './pages/Sign';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

const App: React.FC = () => {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
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
          <Route path="/login" element={<Login />} />
          
          {/* Main Dashboard - The new entry point */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* HHSign (eSign) Module Routes */}
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
          {/* Old routes for compatibility, redirect to new structure */}
          <Route path="/upload" element={<Navigate to="/tools/sign/upload" replace />} />

          {/* Public Routes */}
          <Route path="/sign/:token" element={<Sign />} />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
