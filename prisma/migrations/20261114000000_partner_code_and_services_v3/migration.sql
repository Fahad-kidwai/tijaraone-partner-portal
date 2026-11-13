-- v3: partnerCode sequence + Lead.serviceType String (drop ServiceType enum)

ALTER TABLE "User" ADD COLUMN "partnerCode" TEXT;

CREATE SEQUENCE partner_code_seq START 1;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS n
  FROM "User"
  WHERE role = 'PARTNER'
)
UPDATE "User" u
SET "partnerCode" = 'TOS-P' || lpad(ordered.n::text, 4, '0')
FROM ordered
WHERE u.id = ordered.id;

SELECT setval(
  'partner_code_seq',
  COALESCE(
    (SELECT MAX(CAST(substring("partnerCode" FROM 6) AS bigint)) FROM "User" WHERE "partnerCode" IS NOT NULL),
    0
  )
);

CREATE UNIQUE INDEX "User_partnerCode_key" ON "User"("partnerCode");

ALTER TABLE "Lead" ALTER COLUMN "serviceType" TYPE TEXT USING (
  CASE "serviceType"::text
    WHEN 'MAINLAND_SETUP' THEN 'MAINLAND_COMPANY_FORMATION'
    WHEN 'FREEZONE_LICENSE' THEN 'FREEZONE_COMPANY_FORMATION'
    WHEN 'BANK_ACCOUNT_SETUP' THEN 'BANK_ACCOUNT_OPENING_ASSISTANCE'
    WHEN 'GOLDEN_VISA' THEN 'GOLDEN_VISA'
    WHEN 'CORPORATE_TAX' THEN 'OTHERS'
    ELSE "serviceType"::text
  END
);

DROP TYPE "ServiceType";
