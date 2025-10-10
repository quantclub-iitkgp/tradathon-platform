# Tradathon - Real-Time Stock Trading Simulation Game

A multiplayer stock trading simulation game where players compete to maximize their portfolio value through strategic trading decisions.

## 🎮 How to Play

### Getting Started

1. **Login**: Use Firebase authentication to sign in with Google or email/password
2. **Create/Join Session**: 
   - **Admin**: Create a new trading session with custom parameters
   - **Player**: Join an existing session using the room code

### Game Mechanics

#### Round-Based Trading
- The game operates in **rounds** with a fixed duration (60-120 seconds)
- Each round has a **countdown timer** visible to all players
- Players can submit **one order per round** during the active trading period
- Orders are collected but **not executed** until the round ends

#### Order Placement Rules
- **One Order Per Round**: Each player can only submit one buy or sell order per round
- **Cash Balance**: Cannot place buy orders that exceed your available cash
- **Share Limits**: Cannot hold more than the maximum share limit set by the admin
- **Time Priority**: Orders are executed based on when they were submitted (first come, first served)

#### Order Execution
- At the end of each round, the admin sets the **execution price**
- All trades in that round are executed at this single price
- Buy and sell orders are matched against each other
- Unmatched orders are automatically cancelled

### Player Interface

#### Portfolio Dashboard
- **Cash Balance**: Your available cash for trading
- **Shares Held**: Number of shares you currently own
- **Real-time P&L**: Profit/Loss for the current round and total

#### Trading Panel
- **Order Type**: Choose between "Buy" or "Sell"
- **Price**: Set your desired price per share
- **Quantity**: Number of shares to trade
- **Submit**: Place your order (only one per round allowed)

#### Leaderboard
- **Rankings**: Players ranked by total portfolio value
- **Net Worth**: Cash + (Shares × Current Price)
- **P&L**: Total profit/loss since game start
- **Shares Held**: Current share position

### Admin Controls

#### Session Management
- **Create Session**: Set up new trading sessions with custom parameters
- **Round Control**: Start and end trading rounds
- **Price Setting**: Set the execution price for each round
- **Session Status**: Start, pause, or end the entire session

#### Configuration Options
- **Round Duration**: How long each trading round lasts
- **Total Rounds**: Number of rounds in the session
- **Starting Cash**: Initial cash balance for all players
- **Maximum Shares**: Share holding limit per player

### Game Flow

1. **Session Setup**: Admin creates a session with desired parameters
2. **Player Joins**: Players join using the room code
3. **Round Start**: Admin starts the first round
4. **Trading Phase**: Players analyze and place orders during the countdown
5. **Round End**: Admin sets execution price and ends the round
6. **Order Execution**: All orders are processed at the set price
7. **Results Update**: Portfolios and leaderboard are updated
8. **Next Round**: Process repeats until all rounds are complete

### Strategy Tips

#### Market Analysis
- **Price Trends**: Watch how the execution price changes between rounds
- **Player Behavior**: Observe other players' trading patterns
- **Timing**: Submit orders early for better execution priority

#### Risk Management
- **Diversification**: Don't put all your cash into one trade
- **Position Sizing**: Consider how much of your portfolio to risk
- **Market Timing**: Decide when to buy low vs. sell high

#### Competitive Play
- **Leaderboard Pressure**: Monitor your position relative to other players
- **Round Strategy**: Plan your trades based on remaining rounds
- **Final Push**: Make calculated risks in the final rounds

### Technical Features

- **Real-time Updates**: Live leaderboard and portfolio updates
- **Responsive Design**: Works on desktop and mobile devices
- **Firebase Authentication**: Secure user login and session management
- **Round-based Mechanics**: Structured trading periods with clear timing
- **Order Book**: Transparent view of all pending orders

## 🚀 Getting Started (Development)

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Firebase project

### Installation
```bash
cd web
npm install
```

### Environment Setup
Create `.env.local` with:
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email

# Database
DATABASE_URL=your_postgresql_url
DIRECT_URL=your_direct_postgresql_url
```

### Database Setup
```bash
npx prisma migrate dev
npx prisma generate
```

### Run Development Server
```bash
npm run dev
```

## 🎯 Game Objectives

- **Maximize Portfolio Value**: End the game with the highest net worth
- **Beat the Market**: Outperform other players through better trading decisions
- **Risk Management**: Balance potential gains with portfolio protection
- **Strategic Timing**: Make the right trades at the right time

## 📊 Scoring

- **Net Worth**: Cash Balance + (Shares Held × Current Price)
- **P&L**: Total profit/loss from all completed trades
- **Ranking**: Players sorted by net worth (highest to lowest)

## 🏆 Winning

The player with the **highest net worth** at the end of all rounds wins the game. This includes both cash and the current value of shares held.

---

**Ready to trade?** Login, join a session, and start making your mark on the market! 📈