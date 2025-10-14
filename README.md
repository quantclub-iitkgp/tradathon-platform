# Tradathon Platform

A real-time trading simulation platform built with Next.js, WebSockets, and PostgreSQL.

## Features

- 🚀 **Real-time Updates**: WebSocket integration for instant session updates
- 📊 **Trading Simulation**: Buy/sell orders with real-time order book
- 🏆 **Leaderboard**: Live ranking system with P&L tracking
- 🎮 **Game Sessions**: Multi-round trading sessions with IPO rounds
- 👥 **Multi-player**: Support for multiple players per session
- 🔐 **Authentication**: Firebase authentication integration
- 📱 **Responsive UI**: Modern, mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Socket.IO
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: Firebase Auth
- **Real-time**: WebSockets (Socket.IO)
- **ORM**: Prisma
- **UI Components**: Radix UI, Lucide React

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (local or AWS RDS)

### 1. Clone and Install

```bash
git clone <repository-url>
cd tradathon-platform/web
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
# For local development, you can use SQLite:
DATABASE_URL="file:./dev.db"
DIRECT_URL="file:./dev.db"
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## AWS RDS Setup

For production deployment with AWS RDS PostgreSQL, follow the detailed guide:

📖 **[AWS Setup Guide](./AWS_SETUP.md)**

Quick setup with the provided script:

```bash
# Configure your .env file with AWS RDS connection
# Then run:
./scripts/setup-aws.sh
```

## WebSocket Integration

The platform now includes real-time WebSocket integration for:

- ✅ Live session state updates
- ✅ Real-time leaderboard changes  
- ✅ Instant order placement notifications
- ✅ Trade execution alerts
- ✅ Round status updates
- ✅ Price change notifications

### WebSocket Events

| Event | Description |
|-------|-------------|
| `session-updated` | Session state changes (round, status, etc.) |
| `leaderboard-updated` | Leaderboard ranking changes |
| `player-updated` | Player portfolio updates |
| `order-placed` | New order placed |
| `order-cancelled` | Order cancelled |
| `trade-executed` | Trade completed |
| `round-started` | New round begins |
| `round-ended` | Round completed |
| `price-updated` | Price changes |

## Project Structure

```
web/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   ├── session/        # Session page
│   │   └── admin/          # Admin panel
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   │   └── useWebSocket.ts # WebSocket hook
│   └── lib/                # Utilities and services
│       ├── websocket.ts    # WebSocket client
│       ├── websocket-service.ts # WebSocket server service
│       ├── store.ts        # Business logic
│       └── db-store.ts     # Database operations
├── prisma/                 # Database schema and migrations
├── scripts/                # Setup and deployment scripts
└── server.js              # Custom server with WebSocket support
```

## API Endpoints

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/[sessionId]/state` - Get session state
- `GET /api/sessions/[sessionId]/leaderboard` - Get leaderboard
- `POST /api/sessions/[sessionId]/orders` - Place order
- `POST /api/sessions/[sessionId]/puzzle` - Admin controls

### Players
- `GET /api/player` - Get player data
- `POST /api/player` - Update player

### Rooms
- `GET /api/rooms/[roomCode]/info` - Get room info
- `POST /api/rooms/[roomCode]/join` - Join room

## Development

### Available Scripts

```bash
npm run dev          # Start development server with WebSockets
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
```

### Database Schema

The application uses the following main entities:

- **User**: Players and admins
- **GameSession**: Trading sessions with rounds
- **Player**: Player state within a session
- **Order**: Buy/sell orders
- **Trade**: Executed trades
- **Puzzle**: Optional puzzle system

See `prisma/schema.prisma` for the complete schema.

## Deployment

### Local Development
```bash
npm run dev
```

### Production with AWS RDS
1. Follow [AWS Setup Guide](./AWS_SETUP.md)
2. Configure environment variables
3. Run migrations
4. Deploy to your preferred platform

### Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Firebase (if using)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Application
NODE_ENV="production"
NEXTAUTH_SECRET="your-secret"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions or issues:

1. Check the [AWS Setup Guide](./AWS_SETUP.md) for deployment issues
2. Review the [Trading Logic](./TRADING_LOGIC.md) for game mechanics
3. Check the [How to Play](./HOW_TO_PLAY.md) for user instructions
4. Open an issue on GitHub

## Changelog

### v2.0.0 - WebSocket Integration
- ✅ Added real-time WebSocket support
- ✅ Replaced polling with event-driven updates
- ✅ Added connection status indicators
- ✅ Improved performance and user experience

### v1.0.0 - Initial Release
- ✅ Basic trading simulation
- ✅ Session management
- ✅ Leaderboard system
- ✅ Admin controls