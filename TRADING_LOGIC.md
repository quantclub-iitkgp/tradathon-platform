# Trading Platform Logic Documentation

## Overview

This document explains the core logic and architecture of the trading platform, including order management, execution system, and the separation between admin and player views.

## System Architecture

### Core Components

1. **In-Memory Database (`/web/src/lib/store.ts`)**
   - Stores all game sessions, players, orders, trades, and rounds
   - Uses JavaScript Maps for efficient data access
   - Maintains relationships between entities

2. **API Layer (`/web/src/app/api/`)**
   - RESTful endpoints for session management
   - Order placement and cancellation
   - Real-time data fetching

3. **Frontend Components**
   - Admin Dashboard (`/web/src/app/admin/page.tsx`)
   - Player Session (`/web/src/app/session/page.tsx`)

## Data Models

### Core Entities

```typescript
// Game Session
interface GameSession {
  id: UUID;
  adminId: UUID;
  roomCode: string;
  status: "lobby" | "active" | "paused" | "ended";
  currentRound: number;
  totalRounds: number;
  roundStatus: "waiting" | "active" | "executing" | "completed";
  roundEndTime: number | null;
}

// Player
interface PlayerState {
  id: number;
  sessionId: UUID;
  userId: UUID;
  cashBalance: number;
  sharesHeld: number;
}

// Order
interface Order {
  id: number;
  sessionId: UUID;
  playerId: number;
  type: "buy" | "sell";
  price: number;
  quantity: number;
  status: "open" | "filled" | "cancelled";
  roundNumber: number;
  createdAt: number; // timestamp
}

// Trade (Execution)
interface Trade {
  id: number;
  sessionId: UUID;
  buyOrderId: number;
  sellOrderId: number;
  price: number;
  quantity: number;
  roundNumber: number;
  createdAt: number; // timestamp
}
```

## Order Management Logic

### Order Placement

1. **Validation**:
   - Check if session is active
   - Verify player has sufficient cash (for buy orders)
   - Verify player has sufficient shares (for sell orders)
   - Ensure order is within current round

2. **Order Creation**:
   ```typescript
   function placeOrder(input: PlaceOrderInput): { order: Order } {
     // 1. Validate session and player
     // 2. Check cash/share availability
     // 3. Create order with status "open"
     // 4. Add to ordersBySession map
     // 5. Return created order
   }
   ```

3. **Order Storage**:
   - Orders stored in `ordersBySession` Map
   - Each order has unique ID and timestamp
   - Orders remain "open" until execution or cancellation

### Order Book Generation

#### Standard Order Book (Player View)
```typescript
function getOrderBook(sessionId: UUID): OrderBookSnapshot {
  // 1. Get all open orders for session
  // 2. Separate into bids (buy) and asks (sell)
  // 3. Sort by price (bids: high to low, asks: low to high)
  // 4. Aggregate by price level
  // 5. Return aggregated levels
}
```

#### Detailed Order Book (Admin View)
```typescript
function getDetailedOrderBook(sessionId: UUID) {
  // 1. Get all open orders for session
  // 2. Enrich each order with player name
  // 3. Sort by price and time priority
  // 4. Return individual orders (not aggregated)
}
```

### Order Priority Logic

1. **Price Priority**: Higher bids and lower asks have priority
2. **Time Priority**: Earlier orders at same price execute first
3. **Sorting Logic**:
   ```typescript
   // Bids: Sort by price (high to low), then by time (early to late)
   const bids = orders
     .filter(o => o.type === "buy")
     .sort((a, b) => a.price === b.price ? a.createdAt - b.createdAt : b.price - a.price);
   
   // Asks: Sort by price (low to high), then by time (early to late)
   const asks = orders
     .filter(o => o.type === "sell")
     .sort((a, b) => a.price === b.price ? a.createdAt - b.createdAt : a.price - b.price);
   ```

## Round-Based Execution System

### Round Lifecycle

1. **Round Start**:
   ```typescript
   function startRound(sessionId: UUID): { round: Round } {
     // 1. Set round status to "active"
     // 2. Set round start time
     // 3. Increment current round number
     // 4. Set round end time
   }
   ```

2. **Order Collection**:
   - Orders placed during active round are collected
   - Orders are tagged with current round number
   - No execution occurs during active round

3. **Round End & Execution**:
   ```typescript
   function endRound(sessionId: UUID, executionPrice: number): { round: Round; trades: Trade[] } {
     // 1. Set round status to "executing"
     // 2. Get all orders from current round
     // 3. Execute orders at specified price
     // 4. Update player balances
     // 5. Create trade records
     // 6. Mark round as "completed"
   }
   ```

### Execution Algorithm

```typescript
function executeRoundOrders(sessionId: UUID, orders: Order[], executionPrice: number): Trade[] {
  // 1. Sort orders by time priority (earliest first)
  const sortedOrders = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  
  // 2. Separate buy and sell orders
  const buyOrders = sortedOrders.filter(o => o.type === "buy");
  const sellOrders = sortedOrders.filter(o => o.type === "sell");
  
  // 3. Match orders using two-pointer technique
  let buyIndex = 0;
  let sellIndex = 0;
  const executedTrades = [];
  
  while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
    const buyOrder = buyOrders[buyIndex];
    const sellOrder = sellOrders[sellIndex];
    
    // 4. Calculate trade quantity (minimum of both orders)
    const quantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    
    // 5. Execute trade at execution price
    const cost = executionPrice * quantity;
    buyPlayer.cashBalance -= cost;
    buyPlayer.sharesHeld += quantity;
    sellPlayer.cashBalance += cost;
    sellPlayer.sharesHeld -= quantity;
    
    // 6. Create trade record
    const trade = {
      id: tradeIdCounter++,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      price: executionPrice,
      quantity,
      roundNumber: currentRound,
      createdAt: now()
    };
    
    // 7. Update order quantities
    buyOrder.quantity -= quantity;
    sellOrder.quantity -= quantity;
    
    // 8. Move to next order if current is filled
    if (buyOrder.quantity === 0) {
      buyOrder.status = "filled";
      buyIndex++;
    }
    if (sellOrder.quantity === 0) {
      sellOrder.status = "filled";
      sellIndex++;
    }
  }
  
  // 9. Mark remaining orders as cancelled
  [...buyOrders.slice(buyIndex), ...sellOrders.slice(sellIndex)]
    .forEach(order => order.status = "cancelled");
  
  return executedTrades;
}
```

## Admin vs Player View Separation

### Player View (`/session`)

**What Players Can See:**
- ✅ Their portfolio (cash balance, shares held)
- ✅ Order entry form (place buy/sell orders)
- ✅ Current round status and timer
- ✅ Leaderboard (all players' performance)
- ❌ **NO** order book visibility
- ❌ **NO** round history
- ❌ **NO** execution details

**Player Data Flow:**
```typescript
// Player refresh function
const refresh = useCallback(async () => {
  const [sRes, lbRes, pvRes] = await Promise.all([
    fetch(`/api/sessions/${sessionId}/state`),      // Round status
    fetch(`/api/sessions/${sessionId}/leaderboard`), // Rankings
    fetch(`/api/player?sessionId=${sessionId}&userId=${userId}`) // Portfolio
  ]);
  // NO orderbook fetch
}, [sessionId, userId]);
```

### Admin View (`/admin`)

**What Admins Can See:**
- ✅ Session controls (start/end rounds, set prices)
- ✅ **Detailed Order Book** with player names and timestamps
- ✅ **Round History** with execution prices and times
- ✅ **Execution History** showing all trades by round
- ✅ Real-time updates of all trading activity

**Admin Data Flow:**
```typescript
// Admin refresh function
const fetchData = async () => {
  const [orderbookRes, detailedOrderbookRes, tradesRes, roundsRes] = await Promise.all([
    fetch(`/api/sessions/${sessionId}/orderbook`),           // Standard order book
    fetch(`/api/sessions/${sessionId}/orderbook/detailed`),  // Detailed with names
    fetch(`/api/sessions/${sessionId}/trades`),              // All executions
    fetch(`/api/sessions/${sessionId}/rounds`)               // Round history
  ]);
};
```

## Order Book Display Logic

### Standard Order Book (Hidden from Players)
```typescript
// Aggregated view - only price levels
{
  bids: [
    { price: 105.50, quantity: 150 },  // Aggregated from multiple orders
    { price: 105.00, quantity: 200 }
  ],
  asks: [
    { price: 106.00, quantity: 100 },
    { price: 106.50, quantity: 75 }
  ]
}
```

### Detailed Order Book (Admin Only)
```typescript
// Individual orders with player information
{
  bids: [
    {
      id: 123,
      price: 105.50,
      quantity: 50,
      playerName: "Alice",
      createdAt: 1703123456789
    },
    {
      id: 124,
      price: 105.50,
      quantity: 100,
      playerName: "Bob",
      createdAt: 1703123456790
    }
  ],
  asks: [
    {
      id: 125,
      price: 106.00,
      quantity: 100,
      playerName: "Charlie",
      createdAt: 1703123456800
    }
  ]
}
```

## Execution History Logic

### Trade Enrichment
```typescript
function getTradesForSession(sessionId: UUID) {
  const trades = db.tradesBySession.get(sessionId);
  const orders = db.ordersBySession.get(sessionId);
  const players = db.playersBySession.get(sessionId);
  
  return trades.map(trade => {
    const buyOrder = orders.get(trade.buyOrderId);
    const sellOrder = orders.get(trade.sellOrderId);
    const buyPlayer = players.get(buyOrder.playerId);
    const sellPlayer = players.get(sellOrder.playerId);
    const buyer = db.users.get(buyPlayer.userId);
    const seller = db.users.get(sellPlayer.userId);
    
    return {
      ...trade,
      buyerName: buyer.displayName,
      sellerName: seller.displayName
    };
  });
}
```

### Round History
```typescript
function getRoundHistory(sessionId: UUID) {
  const rounds = db.roundsBySession.get(sessionId);
  return [...rounds.values()]
    .filter(round => round.status === "completed")
    .sort((a, b) => a.roundNumber - b.roundNumber);
}
```

## Security & Access Control

### Player Restrictions
- Players cannot access order book APIs
- Players cannot see other players' orders
- Players cannot view execution history
- Players cannot access admin endpoints

### Admin Privileges
- Full access to all trading data
- Can see all player names and order details
- Can view complete execution history
- Can control round timing and execution prices

## Real-Time Updates

### Update Frequency
- All data refreshes every 1.5 seconds
- Uses `setInterval` for automatic polling
- Updates stop when component unmounts

### Data Consistency
- All related data fetched in parallel
- Consistent timestamps across entities
- Atomic updates during execution

## Key Design Decisions

1. **Round-Based Execution**: Orders are collected during rounds and executed at round end
2. **Admin-Controlled Pricing**: Execution price set by admin, not market-driven
3. **Time Priority**: Orders at same price execute in time order
4. **Complete Transparency for Admins**: Admins see all trading activity
5. **Limited Visibility for Players**: Players only see their own data and leaderboard
6. **In-Memory Storage**: Fast access but requires session persistence strategy

This architecture ensures fair trading while giving administrators complete oversight of all trading activity.
