import express from 'express';
import { default as handler } from './dist/server/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Serve static assets from the client build directory
app.use(express.static(path.join(__dirname, 'dist/client')));

// Pass all other requests to the TanStack Start handler
app.all('*', async (req, res) => {
  try {
    // TanStack Start fetch handler expecting a Request object
    const url = new URL(req.url, `http://${req.headers.host}`);
    const request = new Request(url.href, {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
    });

    const response = await handler.fetch(request);
    
    // Send the response back to express
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await response.text();
    res.send(body);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Trophic.ai node listening on http://0.0.0.0:${port}`);
});
