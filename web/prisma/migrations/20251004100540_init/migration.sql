-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'player');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('lobby', 'active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('open', 'filled', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'player',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "room_code" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'lobby',
    "starting_cash" DECIMAL(12,2) NOT NULL,
    "max_shares" INTEGER NOT NULL,
    "session_duration" INTEGER NOT NULL,
    "current_price" DECIMAL(10,2),
    "last_traded_price" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cash_balance" DECIMAL(12,2) NOT NULL,
    "shares_held" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "solved_by_user_id" UUID,
    "price_unlock_time" TIMESTAMP(3),

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "player_id" BIGINT NOT NULL,
    "type" "OrderType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID NOT NULL,
    "buy_order_id" BIGINT NOT NULL,
    "sell_order_id" BIGINT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_room_code_key" ON "GameSession"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "Player_session_id_user_id_key" ON "Player"("session_id", "user_id");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_solved_by_user_id_fkey" FOREIGN KEY ("solved_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sell_order_id_fkey" FOREIGN KEY ("sell_order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
