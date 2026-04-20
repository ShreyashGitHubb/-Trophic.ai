import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

console.log('🏁 [ENTRY] Starting production server sequence...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 8080;

// 1. CREATE BARE-METAL HTTP SERVER
// We use node:http directly to ensure no dependencies can block the listener.
const server = http.createServer();

server.listen(port, '0.0.0.0', () => {
  console.log('--------------------------------------------------');
  console.log(`🚀 [ENTRY] SERVER LISTENING ON PORT ${port}`);
  console.log('--------------------------------------------------');
});

// 2. BACKGROUND INITIALIZATION
let handler;
const serverPath = path.join(__dirname, 'dist/server/server.js');

const initHandler = async () => {
  try {
    console.log(`🔍 [ENTRY] Checking server bundle at: ${serverPath}`);
    if (!fs.existsSync(serverPath)) {
      throw new Error(`dist/server/server.js not found! Current dir: ${__dirname}`);
    }
    
    // On Windows absolute paths in import() need file://
    const serverUrl = pathToFileURL(serverPath).href;
    console.log(`📡 [ENTRY] Importing bundle from: ${serverUrl}`);
    
    const module = await import(serverUrl);
    handler = module.default;
    console.log('✅ [ENTRY] Server bundle loaded and ready.');
  } catch (error) {
    console.error('❌ [ENTRY] CRITICAL INITIALIZATION ERROR:', error);
  }
};

initHandler();

// 3. REQUEST HANDLING LOGIC
server.on('request', async (req, res) => {
  try {
    // Basic static file serving for /assets/
    if (req.url.startsWith('/assets/')) {
      const filePath = path.join(__dirname, 'dist/client', req.url);
      if (fs.existsSync(filePath)) {
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // Wait for handler
    if (!handler) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable: Still Initializing...');
      return;
    }

    // Convert Node req to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${protocol}://${host}`);
    
    const request = new Request(url.href, {
      method: req.method,
      headers: new Headers(req.headers),
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req : undefined,
      // @ts-ignore
      duplex: 'half',
    });

    const response = await handler.fetch(request);
    
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));

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
    console.error('🔥 [ENTRY] Request Error:', error);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

process.on('uncaughtException', (err) => console.error('💥 [ENTRY] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('💥 [ENTRY] Unhandled:', reason));
