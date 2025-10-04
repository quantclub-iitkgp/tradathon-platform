Tradathon: A Real-Time Trading Simulation Game
1. Project Overview

Tradathon is a web-based, real-time stock trading simulation game designed for an educational environment. It allows a group of students (Players) to participate in a simulated market session controlled by a host (Admin). The core gameplay revolves around solving puzzles to gain early access to new stock prices and using a live order book to trade shares with other players. The goal is to maximize net worth before the session ends.

This platform aims to teach the fundamentals of market dynamics, order matching, and the impact of information on trading in a fun and competitive setting.
2. Core Platform Functionalities
2.1. User Management & Authentication

    Authentication: Users must log in with unique credentials (email/password or OAuth).

    Role-Based Access Control (RBAC):

        Admin: The host of the game. Has full control over creating, managing, and monitoring the game session.

        Player: A participant (student) in the game. Can only interact with the game from a player's perspective.

2.2. Game Session Setup (Admin Dashboard)

The Admin has exclusive controls to manage the game session:

    Create/Launch Session: Initiate a new game, which generates a unique room code for players to join.

    Configure Game Parameters:

        Number of Players: Set a maximum (e.g., 30).

        Starting Cash: Define the initial cash balance for each player.

        Max Share Holding: Set the maximum number of shares any player can hold at one time (e.g., 10).

        Session Duration: Set the total time for the game session.

    Session Control:

        Start: Begin the game for all players in the lobby.

        Pause: Temporarily halt all trading activity.

        End: Conclude the game session manually at any time.

2.3. Central Order Book System

A centralized, real-time order book is the core of the trading engine.

    Visibility: The order book is visible to all players, showing current buy (bid) and sell (ask) orders.

    Player Actions:

        Place Buy or Sell orders (limit orders with price and quantity).

        Cancel any of their own unexecuted (open) orders.

    Order Matching Engine:

        Orders are executed automatically when a buy order's price is greater than or equal to a sell order's price.

        Execution Priority: The system follows standard price-time priority:

            Price Priority: Highest bid and lowest ask get priority.

            Time Priority: If prices are equal, the order that was placed first gets priority.

2.4. Price Update Mechanism (Puzzle-Based)

The stock price is not random; it's updated in rounds based on a puzzle/challenge.

    Puzzle Display: At the start of each round, a puzzle or a multiple-choice question is displayed to all players simultaneously.

    First-Solver Advantage: The first player to solve the puzzle correctly is immediately shown the new stock price and can place orders before anyone else.

    General Price Reveal: After a short delay (e.g., 10 seconds), the new price is revealed to all other participants, and the market opens for general trading.

2.5. Trading Constraints & Real-Time Updates

The platform enforces rules to ensure fair play.

    Share Holding Limit: A player's order to buy will be blocked if it would cause them to exceed the Max Share Holding limit.

    Cash Balance Limit: A player's order to buy will be blocked if they do not have sufficient cash.

    Share Selling Limit: A player cannot sell more shares than they currently own.

    Real-Time Updates: Cash balance and stock holdings are updated in real-time upon successful trade execution.

2.6. Player Dashboard

Each player has a personal dashboard with the following components:

    Portfolio: Live display of current cash balance and number of shares held.

    Order Management: A history of all placed orders (pending, executed, cancelled).

    Puzzle Panel: The interface for viewing and answering the current round's puzzle.

    Order Entry: A simple form to place new Buy and Sell orders.

    Live Order Book: A view of the market's current bid and ask orders.

2.7. Leaderboard & Game End

    Real-Time Leaderboard: A publicly visible leaderboard ranking all players by their Net Worth.

        Net Worth = Current Cash Balance + (Number of Shares Held × Last Traded Price)

    Game Conclusion: When the session timer ends or the Admin stops the game, the final leaderboard is displayed, and the player with the highest net worth is declared the winner.

3. Technical Flow & Architecture

    Tech Stack:

        Frontend: Next.js (with Tailwind CSS for styling).

        Backend & Database: Supabase.

            Database: PostgreSQL.

            Authentication: Supabase Auth.

            Real-time Functionality: Supabase Realtime Subscriptions.

            Backend Logic: Supabase Edge Functions (for order matching, game state transitions).

    Application Flow:

        Lobby & Login: Users log in via Firebase Auth. The Admin creates a game session and gets a room code. Players use the code to join the lobby.

        Game Start: Admin starts the game. The system initializes each player's starting cash and shares. The initial stock price is set.

        Round Cycle:
        a.  A new puzzle is displayed to all players.
        b.  The first player to solve it gets a ~10-second head start to trade at the new price.
        c.  The price is then revealed to everyone, and general trading commences.
        d.  The order book matches buy/sell orders in real-time, potentially triggered by a database function or edge function.

        Continuous Play: The round cycle (puzzle → trade) repeats until the game timer expires.

        Game End: The session ends. The leaderboard is locked, and final results are displayed.

4. Proposed Data Models (PostgreSQL Schema)

<details>
<summary>Click to see PostgreSQL schema</summary>

-- Enum types for status fields to ensure data integrity
CREATE TYPE user_role AS ENUM ('admin', 'player');
CREATE TYPE session_status AS ENUM ('lobby', 'active', 'paused', 'ended');
CREATE TYPE order_type AS ENUM ('buy', 'sell');
CREATE TYPE order_status AS ENUM ('open', 'filled', 'cancelled');

-- Users table, linked to Supabase Auth users
CREATE TABLE "public"."users" (
    "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id),
    "display_name" text,
    "role" user_role NOT NULL DEFAULT 'player'::user_role
);

-- Game sessions table
CREATE TABLE "public"."game_sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "admin_id" uuid NOT NULL REFERENCES public.users(id),
    "room_code" text NOT NULL UNIQUE,
    "status" session_status NOT NULL DEFAULT 'lobby'::session_status,
    "starting_cash" numeric(12, 2) NOT NULL,
    "max_shares" integer NOT NULL,
    "session_duration" integer NOT NULL, -- in seconds
    "current_price" numeric(10, 2),
    "last_traded_price" numeric(10, 2),
    "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Players' state within a specific game session
CREATE TABLE "public"."players" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "session_id" uuid NOT NULL REFERENCES public.game_sessions(id),
    "user_id" uuid NOT NULL REFERENCES public.users(id),
    "cash_balance" numeric(12, 2) NOT NULL,
    "shares_held" integer NOT NULL DEFAULT 0,
    UNIQUE (session_id, user_id)
);

-- Current puzzle for a session
CREATE TABLE "public"."puzzles" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "session_id" uuid NOT NULL REFERENCES public.game_sessions(id),
    "question" text NOT NULL,
    "answer" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT false,
    "solved_by_user_id" uuid REFERENCES public.users(id),
    "price_unlock_time" timestamptz
);

-- Orders placed by players
CREATE TABLE "public"."orders" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "session_id" uuid NOT NULL REFERENCES public.game_sessions(id),
    "player_id" bigint NOT NULL REFERENCES public.players(id),
    "type" order_type NOT NULL,
    "price" numeric(10, 2) NOT NULL,
    "quantity" integer NOT NULL,
    "status" order_status NOT NULL DEFAULT 'open'::order_status,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Executed trades
CREATE TABLE "public"."trades" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "session_id" uuid NOT NULL REFERENCES public.game_sessions(id),
    "buy_order_id" bigint NOT NULL REFERENCES public.orders(id),
    "sell_order_id" bigint NOT NULL REFERENCES public.orders(id),
    "price" numeric(10, 2) NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

</details>
5. Optional Enhancements

    Round Timer: A visible countdown timer for solving puzzles and for each trading window.

    Latency Simulation: Introduce minor, randomized delays in order placement to mimic real-world network latency.

    Trade Log Export: Allow the Admin to download a full CSV log of all trades for post-game analysis.

    Spectator Mode: A read-only view for non-participants to watch the leaderboard and order book live.
    