import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/send_email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing to or subject' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Call Resend API directly using global fetch (Node 18+)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'HHTools <admin@mxlhhfamily.com>',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html || text,
        text: text
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ message: 'Email sent via Resend', data });
    } else {
      console.error('Resend Error:', data);
      return res.status(response.status).json({ error: 'Resend API Error', details: data });
    }
  } catch (error) {
    console.error('Handler Error:', error);
    return res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

// SSO Token Verification Endpoint
app.post('/api/sso/verify', (req, res) => {
  try {
    // 1. Get token from request body (or query, but POST body is safer)
    // We also support GET /api/sso/verify?token=... for URL params
    const token = req.body.token || req.query.token;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    const ssoSecret = process.env.SSO_SECRET;
    if (!ssoSecret) {
      console.error('Missing SSO_SECRET in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 2. Verify the token using jsonwebtoken
    const decoded = jwt.verify(token, ssoSecret, { algorithms: ['HS256'] });

    // 3. Token is valid. Return the decoded payload (e.g., user info)
    return res.status(200).json({ 
      message: 'Token verified successfully', 
      user: decoded 
    });
  } catch (error) {
    console.error('SSO Verification Error:', error.message);
    // Return 401 Unauthorized for invalid/expired tokens
    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
});

app.get('/api/sso/verify', (req, res) => {
  // Support GET request for URL parameter token verification
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({ error: 'Missing token in URL parameters' });
    }

    const ssoSecret = process.env.SSO_SECRET;
    if (!ssoSecret) {
      console.error('Missing SSO_SECRET in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, ssoSecret, { algorithms: ['HS256'] });

    return res.status(200).json({ 
      message: 'Token verified successfully', 
      user: decoded 
    });
  } catch (error) {
    console.error('SSO Verification Error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
});

// Proxy PDF requests to avoid CORS/Network issues in China
app.get('/api/proxy-pdf', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send('Missing url parameter');
    }

    // Validate URL to prevent SSRF (Server Side Request Forgery)
    // Only allow MemFire/Supabase storage URLs
    if (!url.includes('memfiredb.com') && !url.includes('supabase.co')) {
      return res.status(403).send('Invalid URL domain');
    }

    console.log(`Proxying PDF: ${url}`);
    
    // Fetch the PDF from the source
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      return res.status(response.status).send(`Failed to fetch PDF: ${response.statusText}`);
    }

    // Forward relevant headers
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    
    // Set caching headers to improve performance
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream the response body to the client
    // Node.js 18+ fetch returns a ReadableStream, but Express needs a Node stream
    // We can use the web-streams-polyfill or simply read the buffer for now (simpler for small PDFs)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);

  } catch (error) {
    console.error('PDF Proxy Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

const server = createServer(app);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
