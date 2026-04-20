import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

console.log('🏁 [ENTRY] Starting production server sequence...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 8080;

// 1. CREATE BARE-METAL HTTP SERVER
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
    console.log(`🔍 [ENTRY] Looking for server bundle at: ${serverPath}`);
    if (!fs.existsSync(serverPath)) {
      throw new Error(`dist/server/server.js not found! Current dir: ${__dirname}`);
    }
    
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

// Helper to determine content type
const getContentType = (ext) => {
  const map = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return map[ext] || 'application/octet-stream';
};

// 3. REQUEST HANDLING LOGIC
server.on('request', async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    
    // BROAD STATIC FILE SERVING FOR dist/client
    const filePath = path.join(__dirname, 'dist/client', url.pathname);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': getContentType(path.extname(filePath)) });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Wait for handler
    if (!handler) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Service Unavailable: Nodes are still converging...');
      return;
    }

    // Convert Node req to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || 'localhost';
    const webUrl = new URL(req.url, `${protocol}://${host}`);
    
    const request = new Request(webUrl.href, {
      method: req.method,
      headers: new Headers(req.headers),
      body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? req : undefined,
      // @ts-ignore
      duplex: 'half',
    });

    const response = await handler.fetch(request);
    
    // Handle the body and potentially inject environment variables
    const isHtml = response.headers.get('content-type')?.includes('text/html');
    
    if (isHtml) {
      let bodyString = await response.text();
      
      // Inject window.ENV script before </head> or <body>
      const envData = {
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
      };
      
      const script = `<script>window.ENV = ${JSON.stringify(envData)}</script>`;
      
      if (bodyString.includes('<head>')) {
        bodyString = bodyString.replace('<head>', `<head>${script}`);
      } else {
        bodyString = script + bodyString;
      }

      res.statusCode = response.status;
      response.headers.forEach((v, k) => {
        if (k.toLowerCase() !== 'content-length') res.setHeader(k, v);
      });
      res.end(bodyString);
    } else {
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
    }
  } catch (error) {
    console.error('🔥 [ENTRY] Request Error:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: monospace; padding: 20px; background: #0a0a0a; color: #ff5555; border: 1px solid #440000;">
          <h2 style="color: #ffffff;">[ PRODUCTION CRASH ]</h2>
          <p><strong>Error:</strong> ${error.message}</p>
          <pre style="background: #1a1a1a; padding: 15px; border-left: 3px solid #ff5555;">${error.stack}</pre>
          <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">Ensure all environment variables (VITE_FIREBASE_*) are set in the Cloud Run Console.</p>
        </div>
      `);
    }
  }
});

process.on('uncaughtException', (err) => console.error('💥 [ENTRY] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('💥 [ENTRY] Unhandled:', reason));
