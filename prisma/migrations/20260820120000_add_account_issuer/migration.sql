-- Better Auth 1.7 scopes an external account identity by issuer + account_id.
-- Keep this migration explicit: values must come from trusted provider configuration,
-- never from mutable account profile data.
ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

UPDATE "account"
SET "issuer" = CASE "provider_id"
  WHEN 'credential' THEN 'local:credential'
  WHEN 'google' THEN 'https://accounts.google.com'
END
WHERE "provider_id" IN ('credential', 'google');

-- Refuse to complete if an account uses a provider without an audited issuer map.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "account" WHERE "issuer" IS NULL) THEN
    RAISE EXCEPTION
      'Cannot backfill Better Auth account issuer: add trusted issuer mappings for every provider_id before migrating.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "account"
    GROUP BY "issuer", "account_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add Better Auth account issuer index: duplicate issuer/account_id identities require manual reconciliation.';
  END IF;
END $$;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
CREATE UNIQUE INDEX "account_issuer_accountId_uidx"
  ON "account"("issuer", "account_id");
