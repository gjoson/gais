import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading from multiple possible locations
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env'),
  '/home/ubuntu/gais/.env',
  '/home/ubuntu/.env'
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`Loaded env from ${envPath}`);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // In-memory store for token
  let flattradeToken: string | null = null;
  let flattradeClientInfo: any = null;
  let flattradeUid: string | null = null;

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/debug-env', (req, res) => {
    const fs = require('fs');
    const cwd = process.cwd();
    const envPath = path.join(cwd, '.env');
    const envExists = fs.existsSync(envPath);
    const envContent = envExists ? fs.readFileSync(envPath, 'utf8') : null;
    const distEnvPath = path.join(__dirname, '../.env');
    const distEnvExists = fs.existsSync(distEnvPath);
    
    res.json({ 
      cwd, 
      __dirname, 
      envExists, 
      distEnvExists,
      envPath,
      distEnvPath,
      hasFlattradeKey: !!process.env.FLATTRADE_API_KEY,
      keys: Object.keys(process.env).filter(k => k.includes('FLATTRADE')),
      envContent: envContent ? envContent.substring(0, 20) + '...' : null
    });
  });

  // Helper to get env var, bypassing process.env cache if needed
  const getEnvVar = (key: string): string | undefined => {
    if (process.env[key]) return process.env[key];
    
    // Fallback: manually parse .env files
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          const match = content.match(new RegExp(`^\\s*(?:(?:export|set)\\s+)?${key}\\s*=\\s*["']?(.*?)["']?\\s*$`, 'm'));
          if (match && match[1]) {
            return match[1].trim();
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return undefined;
  };

  app.get('/api/auth/url', (req, res) => {
    const apiKey = getEnvVar('FLATTRADE_API_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'FLATTRADE_API_KEY not configured' });
    }
    const authUrl = `https://auth.flattrade.in/?app_key=${apiKey}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/flattrade/callback', async (req, res) => {
    const requestCode = req.query.code as string;
    const clientUid = req.query.client as string;

    if (!requestCode) {
      return res.status(400).send('Missing code parameter');
    }

    if (clientUid) {
      flattradeUid = clientUid;
    }

    const apiKey = getEnvVar('FLATTRADE_API_KEY');
    const apiSecret = getEnvVar('FLATTRADE_API_SECRET');

    if (!apiKey || !apiSecret) {
      return res.status(500).send('API credentials not configured');
    }

    try {
      const hashInput = apiKey + requestCode + apiSecret;
      const hashedSecret = crypto.createHash('sha256').update(hashInput).digest('hex');

      const response = await fetch('https://authapi.flattrade.in/trade/apitoken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          request_code: requestCode,
          api_secret: hashedSecret,
        }),
      });

      const data = await response.json();

      if (data.status === 'Ok') {
        flattradeToken = data.token;
        flattradeClientInfo = data;
        
        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'FLATTRADE_AUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful. This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        res.status(400).send(`Authentication failed: ${data.emsg}`);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      res.status(500).send(`Authentication error: ${error.message}`);
    }
  });

  app.get('/api/auth/status', (req, res) => {
    res.json({
      isAuthenticated: !!flattradeToken,
      clientInfo: flattradeClientInfo,
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    flattradeToken = null;
    flattradeClientInfo = null;
    res.json({ success: true });
  });

  app.get('/api/margin', async (req, res) => {
    if (!flattradeToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const uid = flattradeUid || process.env.FLATTRADE_UID;
    if (!uid) {
      return res.status(500).json({ error: 'FLATTRADE_UID not configured or received' });
    }

    try {
      const payload = {
        uid: uid,
        actid: uid,
      };

      const response = await fetch('https://piconnect.flattrade.in/PiConnectAPI/Limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: `jData=${JSON.stringify(payload)}&jKey=${flattradeToken}`,
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Margin fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/quote/nifty', async (req, res) => {
    if (!flattradeToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const uid = flattradeUid || process.env.FLATTRADE_UID;
    if (!uid) {
      return res.status(500).json({ error: 'FLATTRADE_UID not configured or received' });
    }

    try {
      const payload = {
        uid: uid,
        exch: 'NSE',
        token: '26000', // Nifty 50 token
      };

      const response = await fetch('https://piconnect.flattrade.in/PiConnectAPI/GetQuotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: `jData=${JSON.stringify(payload)}&jKey=${flattradeToken}`,
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Quote fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
