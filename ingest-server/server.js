const { WebSocketServer } = require('ws');
const { PassThrough } = require('stream');
const tus = require('tus-js-client');
const dotenv = require('dotenv');
const http = require('http');

dotenv.config();

const PORT = process.env.PORT || 8080;

// Create a basic HTTP server to satisfy Render's port binding
// and provide a ping endpoint for external keep-alive bots
const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Clipad Ingest Server is running');
  }
});

const wss = new WebSocketServer({
  server,
  // Allow large binary chunks (up to 256 MB to handle long recordings)
  maxPayload: 256 * 1024 * 1024,
  // Keep sockets alive at the TCP layer
  perMessageDeflate: false,
});

console.log(`Ingest server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let passThrough = null;
  let upload = null;
  let isFinalizing = false;
  let isStarted = false;

  // ── Heartbeat: send a ping every 20s to keep Render alive and detect dead clients ──
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }, 20000);

  ws.on('pong', () => {
    // Client is alive – nothing needed
  });

  console.log('Client connected');

  ws.on('message', (message, isBinary) => {
    if (!isBinary) {
      // ── Control message ──
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'START') {
          if (isStarted) return; // guard against double-start
          isStarted = true;

          console.log(`Starting upload for user: ${data.userId}`);
          passThrough = new PassThrough({ highWaterMark: 5 * 1024 * 1024 }); // 5MB buffer

          const fileName = `${data.userId}/${Date.now()}.webm`;
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

          if (!supabaseUrl) {
            console.error('SUPABASE_URL is not set!');
            ws.send(JSON.stringify({ type: 'ERROR', error: 'Server misconfiguration: missing SUPABASE_URL' }));
            return;
          }

          upload = new tus.Upload(passThrough, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
            headers: {
              authorization: `Bearer ${data.token}`,
              'x-upsert': 'true',
            },
            uploadLengthDeferred: true,
            chunkSize: 6 * 1024 * 1024, // 6MB chunks for better throughput
            metadata: {
              bucketName: 'clipad_videos',
              objectName: fileName,
              contentType: 'video/webm',
              cacheControl: '3600',
            },
            onError: (error) => {
              console.error('TUS error:', error);
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'ERROR', error: error.message || 'Upload failed' }));
              }
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              // Periodically report progress back to the client
              if (ws.readyState === ws.OPEN && bytesTotal > 0) {
                const pct = Math.round((bytesUploaded / bytesTotal) * 100);
                ws.send(JSON.stringify({ type: 'PROGRESS', percent: pct }));
              }
            },
            onSuccess: () => {
              console.log('Upload finished:', fileName);
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'SUCCESS', fileName }));
              }
            },
          });

          upload.start();

        } else if (data.type === 'END') {
          console.log('End signal received.');
          if (passThrough && !isFinalizing) {
            isFinalizing = true;
            passThrough.end(); // signals TUS that the stream is complete
          }
        } else if (data.type === 'PING') {
          // Application-level ping (for environments that block WS pings)
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (err) {
        console.error('Message parse error:', err);
      }
    } else {
      // ── Binary video chunk ──
      if (passThrough && !isFinalizing) {
        // Backpressure: only write if the stream buffer isn't overwhelmed
        const canWrite = passThrough.write(message);
        if (!canWrite) {
          // Pause reading from WS until PassThrough drains
          ws.pause();
          passThrough.once('drain', () => {
            if (ws.readyState === ws.OPEN) ws.resume();
          });
        }
      }
    }
  });

  ws.on('close', (code, reason) => {
    clearInterval(heartbeatInterval);
    console.log(`Client disconnected (code=${code}, reason=${reason?.toString()})`);
    // Finalize any in-progress upload so partial data is preserved
    if (passThrough && !isFinalizing) {
      isFinalizing = true;
      passThrough.end();
    }
  });

  ws.on('error', (err) => {
    clearInterval(heartbeatInterval);
    console.error('WebSocket error:', err.message);
    if (passThrough && !isFinalizing) {
      isFinalizing = true;
      passThrough.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP/WS Server listening on port ${PORT}`);
});
