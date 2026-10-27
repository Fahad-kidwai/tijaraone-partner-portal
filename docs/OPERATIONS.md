# Operations

Day-to-day and emergency procedures for the TijaraOne Partner Portal.
No procedure here prints secrets: never paste connection strings, OTP codes, or session
secrets into chat, tickets, or logs.

## (a) Monthly backup routine

Do this once a month (and before any deploy). It produces two independent safety nets:
product-level CSVs (readable, no database needed) and a full database dump (restorable).

1. **CEO exports (in the app, CEO sign-in):**
   - `/admin/leads` → **Export CSV** → save `leads.csv`
   - `/admin/commissions` → **Export CSV** (repeat per status if you want separate files) → save `commissions.csv`
   - Store both in the business Drive backup folder with the month in the filename.
     Note: `leads.csv` contains client names — treat it as confidential.
2. **Database dump (developer machine):**
   ```bash
   set -a; source .env.local; set +a     # loads DATABASE_URL_UNPOOLED without printing it
   ./scripts/backup.sh                  # writes ~/tijaraone-backups/tijaraone-YYYY-MM-DD.sql
   # or choose the folder:  BACKUP_DIR=/path/to/drive-folder ./scripts/backup.sh
   ```
   Requires `pg_dump` on PATH. The script never echoes the connection string. Upload the
   dated `.sql` file to the same private Drive folder; keep at least the last 3 months.
3. **Sanity check:** open both CSVs — AED amounts show 2 decimals, dates are Dubai dates,
   and the commissions **payable** total matches the CEO overview "Commission payable" KPI.

## (b) Correcting a wrongly paid commission (developer-run, no UI by design)

Once a commission is `PAID` the app locks the money fields (audit integrity). Corrections are
made directly in the database with a manual audit event, after written CEO confirmation:

1. Get the correction confirmed by the CEO in writing (amounts, percent, reason, reference).
2. Connect to the **target environment's** Neon branch (production branch for a production
   fix — confirm the branch twice before touching anything; never rehearse on production,
   rehearse on `dev` first if unsure).
3. In a **single transaction**: update the `Lead` row's `totalAmount` / `commissionPercent` /
   `commissionAmount`, recomputing `commissionAmount = ROUND_HALF_UP(totalAmount ×
   commissionPercent / 100, 2)`.
4. In the **same transaction**, append a `LeadEvent`:
   - `type: COMMISSION_UPDATED`, `leadId`: the lead, `actorId`: the CEO user's id
   - `meta`: `{ "from": {…previous values}, "to": {…corrected values}, "correction": true, "ticket": "<reference>" }`
5. **Never** edit `commissionPaidAt` / `commissionPaidRef` and never delete events.
6. Verify via `GET /api/admin/leads/:id` (or the CEO lead screen) that the timeline shows
   the correction event and the numbers are right. If the partner was over/underpaid, settle
   the difference outside the system and record that in the ticket reference.

## (c) Changing an email address

**Partner email** — CEO does it in the app (`/admin/partners` → partner → edit email). The app
normalizes the address, rejects duplicates with a 409, bumps the partner's `sessionVersion`
(all their live sessions are revoked immediately), and logs the change with masked addresses
only. The partner signs in with the new address from then on. No developer involvement needed.

**CEO email** — there is no admin above the CEO, so this is developer-run:
1. Confirm the new address is controlled by the CEO.
2. In the target branch, update the CEO `User` row: set `email` to the new address and
   increment `sessionVersion` by 1 (revokes the old sessions).
3. **Also update `SEED_CEO_EMAIL`** wherever environment variables are managed (local
   `.env.local` and the host's env settings). The seed upserts by email — if the env still
   names the old address, the next seed would create a *second* CEO.
4. Verify: request an OTP to the new address and complete a sign-in; confirm only one CEO
   row exists.

## (d) Emergency: CEO cannot receive email (OTP sign-in impossible)

There is deliberately **no backdoor endpoint**. The recovery path reuses the normal OTP
mechanism with one developer-inserted code:

1. Verify the CEO's identity out-of-band (call their known phone number; confirm it's them).
2. Agree a one-time 6-digit code with them on that call.
3. On the **production** branch, insert one `OtpCode` row for the CEO's email with:
   `codeHash = HMAC-SHA256("<ceo-email>:<code>", OTP_PEPPER)`, `expiresAt = now + 10 minutes`,
   `attempts = 0`. (Locally, `scripts/smoke-otp.ts` shows the exact pattern; it is guarded to
   the dev branch, so for production run the equivalent statements manually — never loosen
   the script's guard.)
4. The CEO signs in with the agreed code immediately (10-minute window, one use).
5. Afterwards: delete any unconsumed `OtpCode` rows you created, and fix the root cause
   (usually the email address itself — see (c) — or the Resend/domain setup).
6. Record the incident (date, who verified identity, what was changed) in your ops notes.
   Never write down the code after the fact.

## (e) Free-tier watch list

| Service | What to watch | Where to look | Tripwire |
|---|---|---|---|
| Neon | Storage (~0.5 GB free) and compute hours; branch autosuspend adds a cold-start second | Neon console → project → **Usage** | Database is rows-only (no blobs); growth should be MB/month. Investigate anything faster |
| Neon | **Point-in-time restore window is short on free tier (about 6 hours — verify current terms)** | Neon console → **Backups / Restore** | This is why the monthly `pg_dump` in (a) exists — do not rely on PITR alone |
| Resend | ~100 emails/day, ~3,000/month (verify current terms) | Resend dashboard → **Usage / Logs** | OTP + 3 partner notifications per deal is tiny at 10–50 users; a spike means OTP abuse, not growth — check app logs for `auth.otp_requested` rate-limit outcomes |
| App logs | `email.console_driver_startup_warning` | Host log stream | Means `EMAIL_DRIVER` is still `console` in production — **no mail is being delivered**. Fix env immediately |
| App logs | `auth.client_ip_header_missing` | Host log stream | `CLIENT_IP_HEADER` doesn't match the host's real IP header; per-IP OTP limit is being skipped (see README) |

## (f) OTP pruning

OTP rows are only useful for 10 minutes, but are kept briefly for rate-limit forensics.
Prune monthly (or on any schedule) from any machine with the environment configured:

```bash
npm run prune:otp     # deletes OtpCode rows older than 7 days; prints only the count
```

Safe to run against production: it cannot touch live codes (they expire in 10 minutes) and
prints nothing but the deleted-row count.
