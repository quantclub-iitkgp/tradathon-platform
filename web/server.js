// Load environment variables first
require('dotenv').config();

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 3000;

console.log('Starting server with:', {
  NODE_ENV: process.env.NODE_ENV,
  dev,
  hostname,
  port,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
});

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('Next.js app prepared successfully');
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create Socket.IO server
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXT_PUBLIC_APP_URL || "http://65.0.80.171"]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Store active sessions and their connected clients
  const sessionClients = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join session room
    socket.on('join-session', (sessionId) => {
      if (!sessionId) return;
      
      socket.join(`session-${sessionId}`);
      
      // Track client in session
      if (!sessionClients.has(sessionId)) {
        sessionClients.set(sessionId, new Set());
      }
      sessionClients.get(sessionId).add(socket.id);
      
      console.log(`Client ${socket.id} joined session ${sessionId}`);
    });

    // Leave session room
    socket.on('leave-session', (sessionId) => {
      if (!sessionId) return;
      
      socket.leave(`session-${sessionId}`);
      
      // Remove client from session tracking
      if (sessionClients.has(sessionId)) {
        sessionClients.get(sessionId).delete(socket.id);
        if (sessionClients.get(sessionId).size === 0) {
          sessionClients.delete(sessionId);
        }
      }
      
      console.log(`Client ${socket.id} left session ${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Clean up session tracking
      for (const [sessionId, clients] of sessionClients.entries()) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            sessionClients.delete(sessionId);
          }
        }
      }
    });
  });

  // Export io instance for use in API routes
  global.io = io;

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server running with CORS for:`, 
      process.env.NODE_ENV === 'production' 
        ? [process.env.NEXT_PUBLIC_APP_URL || "http://65.0.80.171"]
        : ["http://localhost:3000", "http://127.0.0.1:3000"]
    );
  });
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err);
  process.exit(1);
});
