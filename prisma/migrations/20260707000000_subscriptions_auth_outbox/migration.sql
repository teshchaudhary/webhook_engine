-- Tenant authentication and the rate-limit field that was missing from the
-- original migration.
ALTER TABLE "Tenant" ADD COLUMN "apiKeyHash" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "rateLimit" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Tenant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Tenant" SET "apiKeyHash" = 'legacy_' || "id" WHERE "apiKeyHash" IS NULL;
ALTER TABLE "Tenant" ALTER COLUMN "apiKeyHash" SET NOT NULL;
CREATE UNIQUE INDEX "Tenant_apiKeyHash_key" ON "Tenant"("apiKeyHash");

-- Each destination gets an independent signing secret. Existing endpoints
-- inherit their tenant secret so existing integrations continue to verify.
ALTER TABLE "Endpoint" ADD COLUMN "secretKey" TEXT;
ALTER TABLE "Endpoint" ADD COLUMN "previousSecretKey" TEXT;
ALTER TABLE "Endpoint" ADD COLUMN "previousSecretExpiresAt" TIMESTAMP(3);
ALTER TABLE "Endpoint" ADD COLUMN "rateLimit" INTEGER;
UPDATE "Endpoint" AS endpoint
SET "secretKey" = tenant."secretKey"
FROM "Tenant" AS tenant
WHERE endpoint."tenantId" = tenant."id";
ALTER TABLE "Endpoint" ALTER COLUMN "secretKey" SET NOT NULL;
ALTER TABLE "Tenant" DROP COLUMN "secretKey";
CREATE UNIQUE INDEX "Endpoint_tenantId_url_key" ON "Endpoint"("tenantId", "url");

CREATE TABLE "EndpointSubscription" (
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    CONSTRAINT "EndpointSubscription_pkey" PRIMARY KEY ("endpointId", "eventType")
);
CREATE INDEX "EndpointSubscription_eventType_idx" ON "EndpointSubscription"("eventType");
ALTER TABLE "EndpointSubscription"
ADD CONSTRAINT "EndpointSubscription_endpointId_fkey"
FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the old broadcast behaviour until each existing endpoint is given
-- more specific subscriptions.
INSERT INTO "EndpointSubscription" ("endpointId", "eventType")
SELECT "id", '*' FROM "Endpoint";

CREATE TABLE "DeliveryOutbox" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeliveryOutbox_publishedAt_availableAt_idx" ON "DeliveryOutbox"("publishedAt", "availableAt");
CREATE INDEX "DeliveryOutbox_deliveryId_idx" ON "DeliveryOutbox"("deliveryId");
ALTER TABLE "DeliveryOutbox"
ADD CONSTRAINT "DeliveryOutbox_deliveryId_fkey"
FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "DeliveryOutbox" ("id", "deliveryId", "availableAt", "attemptNumber")
SELECT
  'migration-' || "id",
  "id",
  COALESCE("nextAttemptAt", CURRENT_TIMESTAMP),
  "attempts" + 1
FROM "Delivery"
WHERE "status" IN ('PENDING', 'FAILED');

ALTER TYPE "DeliveryStatus" ADD VALUE 'CANCELLED';
