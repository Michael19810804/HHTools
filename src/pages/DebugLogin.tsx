import React, { useState } from 'react';
import { supabase } from '../utils/supabase';

const DebugLogin: React.FC = () => {
  const [email, setEmail] = useState('rocket@hhtools.com');
  const [password, setPassword] = useState('rocket9898');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, -1)}: ${msg}`]);
  };

  const handleLogin = async () => {
    setLogs([]); // Clear logs
    addLog('--- Start Login Process ---');
    
    // 1. Check Config
    addLog('Checking Supabase Config...');
    try {
      // @ts-ignore
      const url = supabase.supabaseUrl;
      // @ts-ignore
      const key = supabase.supabaseKey;
      addLog(`URL: ${url}`);
      addLog(`Key Length: ${key?.length || 0}`);
    } catch (e) {
      addLog('Could not read config directly');
    }

    // 2. Attempt Login
    addLog(`Attempting login for: ${email}`);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addLog(`❌ ERROR: ${error.message}`);
        addLog(`Error Details: ${JSON.stringify(error, null, 2)}`);
      } else {
        addLog('✅ SUCCESS!');
        addLog(`User ID: ${data.user.id}`);
        addLog(`Session Access Token: ${data.session.access_token.slice(0, 20)}...`);
      }
    } catch (err: any) {
      addLog(`💥 CRITICAL EXCEPTION: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>🛠️ Debug Login Tool</h1>
      
      <div style={{ marginBottom: 20 }}>
        <input 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          style={{ padding: 5, width: 250, display: 'block', marginBottom: 10 }}
        />
        <input 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          style={{ padding: 5, width: 250, display: 'block', marginBottom: 10 }}
        />
        <button onClick={handleLogin} style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none', cursor: 'pointer' }}>
          Test Login Now
        </button>
      </div>

      <div style={{ background: '#f0f0f0', padding: 15, borderRadius: 5, border: '1px solid #ccc' }}>
        <h3>Logs:</h3>
        {logs.map((log, i) => (
          <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '2px 0' }}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default DebugLogin;
