-- AlterTable
ALTER TABLE "products" ADD COLUMN     "posColor" TEXT NOT NULL DEFAULT '#e5e7eb',
ADD COLUMN     "posRepresentation" TEXT NOT NULL DEFAULT 'color_shape',
ADD COLUMN     "posShape" TEXT NOT NULL DEFAULT 'square';
