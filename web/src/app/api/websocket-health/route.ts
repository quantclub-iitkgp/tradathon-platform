import { NextResponse } from "next/server";

export async function GET() {
  try {
    const isWebSocketEnabled = typeof global !== 'undefined' && global.io;
    
    return NextResponse.json({
      status: 'ok',
      websocket: isWebSocketEnabled ? 'enabled' : 'disabled',
      environment: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      hostname: process.env.HOSTNAME,
      port: process.env.PORT,
      timestamp: new Date().toISOString(),
      message: isWebSocketEnabled 
        ? 'WebSocket server is running' 
        : 'WebSocket server is not available'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

