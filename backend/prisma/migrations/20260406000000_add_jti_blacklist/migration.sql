-- CreateTable: jti_blacklist
-- Corresponds to Prisma model JTIBlacklist

CREATE TABLE "jti_blacklist" (
    "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
    "jti"       VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jti_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jti_blacklist_jti_key" ON "jti_blacklist"("jti");

-- CreateIndex
CREATE INDEX "jti_blacklist_jti_idx" ON "jti_blacklist"("jti");

-- CreateIndex
CREATE INDEX "jti_blacklist_expiresAt_idx" ON "jti_blacklist"("expiresAt");
