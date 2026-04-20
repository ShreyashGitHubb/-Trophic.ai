import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

console.log('🏁 Starting production server sequence...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

let handler;
const serverPath = path.join(__dirname, 'dist/server/server.js');

// 1. START LISTENING IMMEDIATELY
// This ensures Cloud Run health checks pass quickly.
app.listen(port, '0.0.0.0', () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 TROPHIC NODE LISTENING ON PORT ${port}`);
  console.log('--------------------------------------------------');
});

// 2. BACKGROUND INITIALIZATION
// We load the heavy server bundle in the background.
const initHandler = async () => {
  try {
    console.log(`🔍 Checking server bundle at: ${serverPath}`);
    if (!fs.existsSync(serverPath)) {
      throw new Error('dist/server/server.js not found!');
    }
    const module = await import(serverPath);
    handler = module.default;
    console.log('✅ Server bundle loaded and ready.');
  } catch (error) {
    console.error('❌ CRITICAL INITIALIZATION ERROR:', error);
  }
};

const initializationPromise = initHandler();

// Serve static assets
const clientPath = path.join(__dirname, 'dist/client');
app.use(express.static(clientPath));

// Request Handler
app.all('*', async (req, res) => {
  try {
    // Wait for initialization if it hasn't finished yet
    if (!handler) {
      console.log('⏳ Handler not ready, waiting for initialization...');
      await initializationPromise;
    }

    if (!handler) {
      return res.status(503).send('Service Unavailable: Initialization Failed');
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const request = new Request(url.href, {
      method: req.method,
      headers: new Headers(req.headers),
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req : undefined,
      // @ts-ignore
      duplex: 'half',
    });

    const response = await handler.fetch(request);
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('🔥 Request Handling Error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});
