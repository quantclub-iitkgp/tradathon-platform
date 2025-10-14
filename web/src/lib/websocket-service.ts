// WebSocket service for emitting real-time updates
// This will be used by the store functions to notify clients of changes

declare global {
  var io: any;
}

export class WebSocketService {
  private static instance: WebSocketService;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Emit session state update to all clients in a session
  emitSessionUpdate(sessionId: string, sessionData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('session-updated', sessionData);
    }
  }

  // Emit leaderboard update to all clients in a session
  emitLeaderboardUpdate(sessionId: string, leaderboardData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('leaderboard-updated', leaderboardData);
    }
  }

  // Emit player update to specific user or all clients in session
  emitPlayerUpdate(sessionId: string, playerData: any, userId?: string) {
    if (typeof global !== 'undefined' && global.io) {
      if (userId) {
        // Emit to specific user (if they have a user-specific room)
        global.io.to(`session-${sessionId}`).emit('player-updated', { ...playerData, userId });
      } else {
        // Emit to all clients in session
        global.io.to(`session-${sessionId}`).emit('player-updated', playerData);
      }
    }
  }

  // Emit order placed event
  emitOrderPlaced(sessionId: string, orderData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('order-placed', orderData);
    }
  }

  // Emit order cancelled event
  emitOrderCancelled(sessionId: string, orderData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('order-cancelled', orderData);
    }
  }

  // Emit trade executed event
  emitTradeExecuted(sessionId: string, tradeData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('trade-executed', tradeData);
    }
  }

  // Emit round started event
  emitRoundStarted(sessionId: string, roundData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('round-started', roundData);
    }
  }

  // Emit round ended event
  emitRoundEnded(sessionId: string, roundData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('round-ended', roundData);
    }
  }

  // Emit price update event
  emitPriceUpdate(sessionId: string, priceData: any) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('price-updated', priceData);
    }
  }
}

export const wsService = WebSocketService.getInstance();
