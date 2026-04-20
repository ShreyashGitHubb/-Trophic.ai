import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

console.log('🏁 Starting production server sequence...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Diagnostic: Check for build files
const serverPath = path.join(__dirname, 'dist/server/server.js');
console.log(`🔍 Checking server bundle at: ${serverPath}`);

if (!fs.existsSync(serverPath)) {
  console.error('❌ CRITICAL ERROR: dist/server/server.js not found!');
  process.exit(1);
}

let handler;
try {
  const module = await import(serverPath);
  handler = module.default;
  console.log('✅ Server bundle imported successfully.');
} catch (error) {
  console.error('❌ CRITICAL ERROR during server bundle import:', error);
  process.exit(1);
}

// Serve static assets from the client build directory
const clientPath = path.join(__dirname, 'dist/client');
console.log(`📂 Serving static files from: ${clientPath}`);
app.use(express.static(clientPath));

// Pass all other requests to the TanStack Start handler
app.all('*', async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    
    // Construct the fetch-compliant Request object
    const request = new Request(url.href, {
      method: req.method,
      headers: new Headers(req.headers),
      // Only include body for relevant methods
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req : undefined,
      // @ts-ignore - duplex is required for streaming bodies in some environments
      duplex: 'half',
    });

    const response = await handler.fetch(request);
    
    // Copy headers from the TanStack response to the Express response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle the body as a stream or text
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

// Start listening on the port
app.listen(port, '0.0.0.0', () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 TROPHIC NODE ONLINE`);
  console.log(`📡 URL: http://0.0.0.0:${port}`);
  console.log(`🛠️ ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log('--------------------------------------------------');
});

// Basic crash handler
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});
