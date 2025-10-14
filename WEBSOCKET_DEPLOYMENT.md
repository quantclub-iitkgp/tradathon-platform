# WebSocket Deployment Guide

This guide helps you troubleshoot and fix WebSocket connection issues when deploying the Tradathon Platform.

## Common WebSocket Deployment Issues

### 1. **Connection Refused / Cannot Connect**

**Symptoms:**
- WebSocket shows "Disconnected" status
- Console errors: "WebSocket connection failed"
- Real-time updates not working

**Causes & Solutions:**

#### A. Server Configuration Issues
```bash
# Check if your deployment platform supports WebSockets
# Most modern platforms do, but some have limitations
```

**Fix:** Update your environment variables:
```env
# Production environment variables
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
HOSTNAME="0.0.0.0"
PORT="3000"
```

#### B. CORS Configuration
**Fix:** The server now automatically configures CORS based on your domain.

#### C. Firewall/Proxy Issues
**Fix:** Ensure your deployment platform allows WebSocket connections on the same port as HTTP.

### 2. **Platform-Specific Solutions**

#### **Vercel Deployment**
Vercel has limitations with WebSockets. Consider these alternatives:

**Option 1: Use Vercel Edge Functions (Recommended)**
```bash
# Deploy to Vercel with edge functions
vercel --prod
```

**Option 2: Use Railway/Render/DigitalOcean**
These platforms have better WebSocket support:
```bash
# Railway
railway login
railway link
railway up

# Render
# Connect your GitHub repo and deploy
```

#### **Netlify Deployment**
Netlify doesn't support WebSockets. Use:
- Railway
- Render
- DigitalOcean App Platform
- AWS Elastic Beanstalk

#### **AWS Elastic Beanstalk**
```bash
# Ensure your platform supports Node.js with WebSockets
eb init
eb create production
eb deploy
```

#### **Docker Deployment**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. **Environment Configuration**

#### **Required Environment Variables**
```env
# Production
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
HOSTNAME="0.0.0.0"
PORT="3000"

# Database (if using AWS RDS)
DATABASE_URL="postgresql://user:pass@host:5432/db"
DIRECT_URL="postgresql://user:pass@host:5432/db"
```

#### **Optional Environment Variables**
```env
# For enhanced WebSocket debugging
DEBUG="socket.io:*"
```

### 4. **Testing WebSocket Connection**

#### **Browser Console Test**
```javascript
// Open browser console and run:
const socket = io();
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected!'));
socket.on('connect_error', (error) => console.error('Error:', error));
```

#### **Server Logs Check**
Look for these logs in your deployment:
```
> Ready on http://0.0.0.0:3000
> WebSocket server running with CORS for: ["https://your-domain.com"]
Client connected: abc123
Client abc123 joined session xyz789
```

### 5. **Troubleshooting Steps**

#### **Step 1: Check Server Logs**
```bash
# Check if WebSocket server is running
# Look for CORS configuration logs
# Check for connection attempts
```

#### **Step 2: Test Connection**
```bash
# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     https://your-domain.com/socket.io/
```

#### **Step 3: Check Network Tab**
1. Open browser DevTools
2. Go to Network tab
3. Look for WebSocket connections
4. Check for failed requests

#### **Step 4: Verify Environment Variables**
```bash
# Check if all required env vars are set
echo $NODE_ENV
echo $NEXT_PUBLIC_APP_URL
echo $HOSTNAME
echo $PORT
```

### 6. **Platform-Specific Deployment Commands**

#### **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway link
railway up
```

#### **Render**
```yaml
# render.yaml
services:
  - type: web
    name: tradathon-platform
    env: node
    buildCommand: cd web && npm install && npm run build
    startCommand: cd web && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_APP_URL
        value: https://your-app.onrender.com
```

#### **DigitalOcean App Platform**
```yaml
# .do/app.yaml
name: tradathon-platform
services:
- name: web
  source_dir: /web
  github:
    repo: your-username/tradathon-platform
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: NEXT_PUBLIC_APP_URL
    value: https://your-app.ondigitalocean.app
```

### 7. **Alternative Solutions**

#### **If WebSockets Don't Work:**
1. **Server-Sent Events (SSE)**: Fallback for real-time updates
2. **Polling**: Increase polling frequency as temporary solution
3. **External WebSocket Service**: Use Pusher, Ably, or similar

#### **Implementing SSE Fallback**
```typescript
// Add to your WebSocket hook
const useSSE = (sessionId: string) => {
  useEffect(() => {
    if (!sessionId) return;
    
    const eventSource = new EventSource(`/api/sessions/${sessionId}/events`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle real-time updates
    };
    
    return () => eventSource.close();
  }, [sessionId]);
};
```

### 8. **Monitoring & Debugging**

#### **Add Connection Status Monitoring**
```typescript
// Enhanced connection status
const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

useEffect(() => {
  const socket = wsManager.getSocket();
  if (!socket) return;
  
  socket.on('connect', () => setConnectionStatus('connected'));
  socket.on('disconnect', () => setConnectionStatus('disconnected'));
  socket.on('connect_error', () => setConnectionStatus('error'));
}, []);
```

#### **Health Check Endpoint**
```typescript
// Add to your API routes
// app/api/websocket-health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'ok', 
    websocket: global.io ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString()
  });
}
```

### 9. **Quick Fixes**

#### **Immediate Actions:**
1. ✅ Set `NEXT_PUBLIC_APP_URL` to your production domain
2. ✅ Set `HOSTNAME="0.0.0.0"` for production
3. ✅ Check deployment platform WebSocket support
4. ✅ Verify CORS configuration in server logs
5. ✅ Test connection in browser console

#### **If Still Not Working:**
1. Try a different deployment platform (Railway, Render, DigitalOcean)
2. Check firewall/proxy settings
3. Verify SSL certificate (WebSockets require HTTPS in production)
4. Contact your hosting provider about WebSocket support

### 10. **Success Indicators**

You'll know WebSockets are working when:
- ✅ Connection status shows "Connected" (green dot)
- ✅ Real-time updates appear instantly
- ✅ Server logs show client connections
- ✅ No console errors in browser
- ✅ Multiple users see updates simultaneously

## Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Look at server logs for connection attempts
3. Test with a simple WebSocket connection first
4. Consider using a WebSocket-compatible hosting platform

Remember: WebSocket support varies by platform, so choose your deployment target carefully!

