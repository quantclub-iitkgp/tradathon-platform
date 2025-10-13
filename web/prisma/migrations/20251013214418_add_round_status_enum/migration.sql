-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('waiting', 'active', 'executing', 'completed', 'ipo_active');

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "current_round" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "round_duration_sec" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "round_end_time" TIMESTAMPTZ(6),
ADD COLUMN     "round_status" "RoundStatus" NOT NULL DEFAULT 'waiting',
ADD COLUMN     "total_rounds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "round_number" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "round_number" INTEGER NOT NULL DEFAULT 0;
