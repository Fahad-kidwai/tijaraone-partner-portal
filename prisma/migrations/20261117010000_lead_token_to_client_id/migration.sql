-- Rename Lead.token → Lead.clientId (preserve data and uniqueness)
ALTER TABLE "Lead" RENAME COLUMN "token" TO "clientId";
ALTER INDEX "Lead_token_key" RENAME TO "Lead_clientId_key";
