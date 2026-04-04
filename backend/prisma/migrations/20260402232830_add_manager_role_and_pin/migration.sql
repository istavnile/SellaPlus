-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pinHash" TEXT;
