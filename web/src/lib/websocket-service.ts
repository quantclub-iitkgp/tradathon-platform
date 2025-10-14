// WebSocket service for emitting real-time updates
// This will be used by the store functions to notify clients of changes

declare global {
  var io: {
    to: (room: string) => {
      emit: (event: string, data: unknown) => void;
    };
  } | undefined;
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
  emitSessionUpdate(sessionId: string, sessionData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('session-updated', sessionData);
    }
  }

  // Emit leaderboard update to all clients in a session
  emitLeaderboardUpdate(sessionId: string, leaderboardData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('leaderboard-updated', leaderboardData);
    }
  }

  // Emit player update to specific user or all clients in session
  emitPlayerUpdate(sessionId: string, playerData: unknown, userId?: string) {
    if (typeof global !== 'undefined' && global.io) {
      if (userId) {
        // Emit to specific user (if they have a user-specific room)
        const dataWithUserId = typeof playerData === 'object' && playerData !== null 
          ? { ...playerData as Record<string, unknown>, userId }
          : { userId };
        global.io.to(`session-${sessionId}`).emit('player-updated', dataWithUserId);
      } else {
        // Emit to all clients in session
        global.io.to(`session-${sessionId}`).emit('player-updated', playerData);
      }
    }
  }

  // Emit order placed event
  emitOrderPlaced(sessionId: string, orderData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('order-placed', orderData);
    }
  }

  // Emit order cancelled event
  emitOrderCancelled(sessionId: string, orderData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('order-cancelled', orderData);
    }
  }

  // Emit trade executed event
  emitTradeExecuted(sessionId: string, tradeData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('trade-executed', tradeData);
    }
  }

  // Emit round started event
  emitRoundStarted(sessionId: string, roundData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('round-started', roundData);
    }
  }

  // Emit round ended event
  emitRoundEnded(sessionId: string, roundData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('round-ended', roundData);
    }
  }

  // Emit price update event
  emitPriceUpdate(sessionId: string, priceData: unknown) {
    if (typeof global !== 'undefined' && global.io) {
      global.io.to(`session-${sessionId}`).emit('price-updated', priceData);
    }
  }
}

export const wsService = WebSocketService.getInstance();
