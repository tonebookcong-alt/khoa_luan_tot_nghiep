-- Remove payment / VNPAY / escrow feature.
-- Drops: Transaction table, TransactionStatus enum.
-- Modifies: ListingStatus enum (removes RESERVED — was only set during escrow).

-- 1. Drop Transaction table (cascades drop FK constraints automatically)
DROP TABLE IF EXISTS "Transaction";

-- 2. Drop TransactionStatus enum
DROP TYPE IF EXISTS "TransactionStatus";

-- 3. Migrate ListingStatus enum to remove RESERVED
--    Postgres doesn't support DROP VALUE on enum — recreate the type.
ALTER TABLE "Listing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Listing" ALTER COLUMN "status" TYPE TEXT;

-- Any remaining RESERVED rows fall back to ACTIVE (rare; only if user had data)
UPDATE "Listing" SET "status" = 'ACTIVE' WHERE "status" = 'RESERVED';

DROP TYPE "ListingStatus";
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'REMOVED');

ALTER TABLE "Listing"
  ALTER COLUMN "status" TYPE "ListingStatus" USING ("status"::"ListingStatus");
ALTER TABLE "Listing" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
