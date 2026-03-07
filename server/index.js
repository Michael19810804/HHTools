import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

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

const server = createServer(app);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
