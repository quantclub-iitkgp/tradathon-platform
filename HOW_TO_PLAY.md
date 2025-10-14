# How to Play the Trading Game

## Game Overview

This is a round-based trading simulation where players buy and sell shares in timed rounds. The game features an admin-controlled execution system where all orders are executed at a price set by the admin at the end of each round.

## Admin Side - Game Master Guide

### Getting Started as Admin

1. **Access the Admin Dashboard**
   - Navigate to `/admin` in your browser
   - You'll see the admin control panel

2. **Create a New Session**
   - Enter your admin display name
   - Click "Create Session"
   - A room code will be generated (e.g., "ABC123")
   - Share this room code with players

### Admin Controls

#### Session Management
- **Room Code**: The unique code players use to join your session
- **Start Session**: Begins the trading game
- **Update Price**: Sets the current market price (for reference)

#### Round Control
- **Start Round**: Begins a new trading round
  - Players can place orders during this time
  - Round timer starts counting down
- **End Round**: Ends the current round and executes all orders
  - You must set an execution price
  - All orders execute at this price regardless of order prices

### Admin Dashboard Features

#### 1. Order Book (Admin View)
- **Real-time order tracking**: See all buy and sell orders as they're placed
- **Player identification**: Each order shows the player's name
- **Order timing**: See exactly when each order was placed
- **Price and quantity**: Full details of each order

#### 2. Round History
- **Completed rounds**: Overview of all finished rounds
- **Execution prices**: What price each round executed at
- **Round timing**: When each round ended

#### 3. Execution History
- **Detailed trade records**: See every trade that occurred
- **Player interactions**: Who bought from whom
- **Trade amounts**: Quantity and price of each trade
- **Timestamps**: Exact time of each execution

### Admin Strategy Tips

1. **Price Setting**
   - Set execution prices based on market conditions
   - Consider the spread between buy and sell orders
   - You can create volatility by varying prices between rounds

2. **Round Timing**
   - Shorter rounds create more urgency
   - Longer rounds allow for more strategic thinking
   - Vary timing to keep players engaged

3. **Market Manipulation**
   - Use price updates to influence player behavior
   - Create trends by setting consecutive higher/lower prices
   - Monitor order book to understand player sentiment

## Player Side - Trader Guide

### Joining a Game

1. **Get the Room Code**
   - Ask the admin for the room code (e.g., "ABC123")
   - Navigate to `/join` in your browser
   - Enter the room code and your display name
   - Click "Join Session"

2. **Access Your Trading Interface**
   - You'll be redirected to the session page
   - Your trading dashboard will load

### Player Interface

#### 1. Portfolio Section
- **Cash Balance**: How much money you have available
- **Shares Held**: Number of shares you currently own
- **Real-time updates**: Your portfolio updates after each round

#### 2. Order Entry
- **Order Type**: Choose "Buy" or "Sell"
- **Price**: Enter your desired price per share
- **Quantity**: How many shares you want to trade
- **Place Order**: Submit your order

#### 3. Round Status
- **Current Round**: Which round you're in
- **Round Timer**: Time remaining in current round
- **Round Status**: "active" (can place orders) or "waiting" (between rounds)

#### 4. Leaderboard
- **Player Rankings**: See all players' performance
- **Net Worth**: Total value (cash + shares × current price)
- **P&L**: Profit and Loss for each player
- **Share Holdings**: How many shares each player owns

### Trading Strategy

#### Understanding the System
- **Round-based trading**: You can only place orders during active rounds
- **Admin execution**: All orders execute at the admin-set price, not your order price
- **Time priority**: Orders placed earlier have priority if prices are the same
- **No partial fills**: Orders either execute completely or not at all

#### Basic Strategies

1. **Market Timing**
   - Watch the round timer
   - Place orders early for time priority
   - Consider the current market price when setting your order price

2. **Price Strategy**
   - Your order price doesn't determine execution price
   - Place orders at prices you're comfortable with
   - Consider the spread between buy and sell orders

3. **Risk Management**
   - Don't risk all your cash on one trade
   - Diversify your trading across multiple rounds
   - Watch your portfolio balance

#### Advanced Strategies

1. **Order Book Analysis** (Limited)
   - You can't see the full order book
   - Use leaderboard to gauge other players' positions
   - Watch for patterns in round execution prices

2. **Psychological Trading**
   - Use the leaderboard to understand market sentiment
   - Time your orders based on round progression
   - Consider other players' likely strategies

3. **Portfolio Management**
   - Balance between cash and shares
   - Consider the current market price for valuation
   - Plan for multiple rounds

### Game Flow Example

#### Round 1
1. Admin starts the round
2. You see "Round 1 of 5" with a 60-second timer
3. You place a buy order for 100 shares at $50
4. Timer counts down
5. Admin ends the round and sets execution price at $52
6. Your order executes at $52 (not $50)
7. You now own 100 shares and have $4,800 cash (from $10,000 starting)

#### Round 2
1. Admin starts round 2
2. You place a sell order for 50 shares at $55
3. Round ends with execution price of $54
4. You sell 50 shares at $54, now have 50 shares and $5,500 cash

#### Final Scoring
- Your final net worth = Cash + (Shares × Final Price)
- Rankings based on total net worth
- P&L shows your profit/loss from starting position

## Detailed Execution Logic

### How Orders Are Matched and Executed

The execution system uses a **time-priority matching algorithm** that pairs buy and sell orders based on when they were placed, regardless of the prices players set.

#### Example Scenario: Admin Sets Execution Price at $50

**Orders Placed During Round:**
- Player A: Buy 5 shares at $45 (placed first)
- Player B: Sell 10 shares at $55 (placed second)
- Player C: Buy 3 shares at $60 (placed third)

**Execution Process:**

1. **Sort by Time Priority** (earliest orders first):
   - Player A: Buy 5 shares (1st)
   - Player B: Sell 10 shares (2nd)  
   - Player C: Buy 3 shares (3rd)

2. **Match Buy and Sell Orders:**
   - **Trade 1**: Player A (buy 5) ↔ Player B (sell 10)
     - Quantity traded: min(5, 10) = **5 shares**
     - Execution price: **$50** (admin-set price)
     - Player A gets 5 shares, pays $250
     - Player B sells 5 shares, receives $250
     - Player B still has 5 shares remaining to sell

3. **Continue Matching:**
   - **Trade 2**: Player C (buy 3) ↔ Player B (sell 5 remaining)
     - Quantity traded: min(3, 5) = **3 shares**
     - Execution price: **$50** (admin-set price)
     - Player C gets 3 shares, pays $150
     - Player B sells 3 shares, receives $150
     - Player B still has 2 shares remaining

4. **Final Result:**
   - **Player A**: +5 shares, -$250 cash
   - **Player B**: -8 shares, +$400 cash (2 shares remain unsold)
   - **Player C**: +3 shares, -$150 cash
   - **Remaining**: Player B's 2 unsold shares are **cancelled**

#### Key Execution Rules:

1. **Time Priority**: Orders placed earlier execute first
2. **Admin Price**: All trades execute at admin-set price ($50 in example)
3. **Minimum Quantity**: Trade quantity = min(buy quantity, sell quantity)
4. **Complete Fills**: Orders either execute completely or are cancelled
5. **No Partial Fills**: If you can't trade your full order, it's cancelled

#### More Complex Example:

**Orders:**
- Player A: Buy 20 shares at $40 (1st)
- Player B: Sell 5 shares at $60 (2nd)
- Player C: Buy 10 shares at $55 (3rd)
- Player D: Sell 15 shares at $45 (4th)

**Admin Sets Execution Price: $50**

**Execution Sequence:**
1. **Trade 1**: A (buy 20) ↔ B (sell 5) = 5 shares at $50
   - A: +5 shares, -$250
   - B: -5 shares, +$250
   - A still wants 15 shares

2. **Trade 2**: A (buy 15 remaining) ↔ D (sell 15) = 15 shares at $50
   - A: +15 shares, -$750
   - D: -15 shares, +$750
   - A's order is now complete

3. **Trade 3**: C (buy 10) ↔ No sell orders remaining
   - C's order is **cancelled** (no matching sell orders)

**Final Result:**
- **Player A**: +20 shares, -$1,000 cash
- **Player B**: -5 shares, +$250 cash  
- **Player C**: 0 shares, 0 cash (order cancelled)
- **Player D**: -15 shares, +$750 cash

### Why This System Works:

1. **Fairness**: Time priority ensures first-come-first-served
2. **Simplicity**: All trades at same price eliminates complex matching
3. **Admin Control**: Admin can influence market behavior through pricing
4. **Transparency**: Clear execution rules for all players
5. **Efficiency**: Fast execution without complex price discovery

## Game Rules Summary

### For Players
- ✅ Place buy/sell orders during active rounds
- ✅ See your portfolio and leaderboard
- ✅ View round status and timer
- ❌ Cannot see other players' orders
- ❌ Cannot see order book
- ❌ Cannot see execution history

### For Admins
- ✅ Control round timing
- ✅ Set execution prices
- ✅ See all orders and player names
- ✅ View complete trading history
- ✅ Monitor all player activity

### Execution Rules
- All orders execute at admin-set price
- Time priority for orders at same price
- Orders execute completely or not at all
- No partial fills
- Unmatched orders are cancelled

## Tips for Success

### For Players
1. **Start Conservative**: Don't risk too much early
2. **Watch the Timer**: Place orders early for priority
3. **Study Patterns**: Look for trends in execution prices
4. **Manage Risk**: Keep some cash and shares balanced
5. **Learn from Others**: Watch the leaderboard for insights

### For Admins
1. **Create Drama**: Vary execution prices to create excitement
2. **Monitor Activity**: Watch the order book for player behavior
3. **Control Pace**: Adjust round timing for optimal engagement
4. **Provide Context**: Explain your price decisions to players
5. **Keep It Fair**: Ensure all players have equal opportunities

## Common Scenarios

### Scenario 1: High Volatility
- Admin sets very different prices between rounds
- Players must adapt quickly
- Risk management becomes crucial

### Scenario 2: Trending Market
- Admin creates upward or downward price trends
- Players can ride the trend or bet against it
- Timing becomes critical

### Scenario 3: Sideways Market
- Admin keeps prices relatively stable
- Players focus on small gains
- Patience and consistency matter

This trading game combines strategy, timing, and psychology to create an engaging financial simulation experience!
