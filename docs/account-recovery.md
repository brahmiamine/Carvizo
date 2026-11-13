# Account recovery and deployment

Apply `prisma/manual-migrations/20261113_recovery_code.sql` once before deploying this version. It adds a nullable recovery-code hash without changing existing accounts. Regenerate the Prisma client with the normal build.

New accounts receive a cryptographically random 192-bit recovery code once. Store it in a password manager. Existing users generate a code from their profile after entering their password. Generating a code invalidates the previous code. Recovery requires the account email, its recovery code and a new password; it atomically consumes the old code, generates a replacement and revokes all sessions. Password changes also revoke all prior sessions. The current browser receives a fresh session. Recovery codes are stored as SHA-256 hashes. There is no email delivery or email-based reset flow.

Authentication routes limit attempts per process and account. Run one application replica or add a shared ingress limiter for distributed protection. Set `TRUST_PROXY=true` only behind a reverse proxy that replaces `X-Forwarded-For`; otherwise authentication uses a shared process ceiling of 1,000 requests per 15 minutes. With a trusted proxy, each client IP permits 60 authentication requests per 15 minutes. All deployments limit each account to 10 attempts per 15 minutes. Rate limits also apply to authenticated password and recovery-code changes.

Push registration accepts HTTPS endpoints belonging to browser push providers (FCM, Mozilla, Apple and Windows), with correctly sized subscription keys. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` at runtime; the public configuration endpoint also accepts `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for compatibility. Unsubscribe removes only the current user's endpoint.

Profile export supports JSON (default), CSV (`?format=csv`) and an escaped printable HTML report (`?format=print`). Use the browser's print dialog to save the report as PDF. CSV values are quoted and formula-leading values are escaped for spreadsheets. Invoice binaries remain available from their authenticated attachment links; CSV and print exports contain event data.

## Currency migration

Apply `prisma/manual-migrations/20261113_currency.sql` before this version. Its additive `IF NOT EXISTS` statements target MariaDB. Both user preference and event currency default to EUR, preserving all existing amounts as euro cents. Changing the profile preference affects defaults for new entries only; existing events retain their currency. New entries can explicitly use EUR or TND. No exchange-rate conversion or combined-currency total is performed.

The database's legacy `amountCents` name now stores the currency's minor units: 100 units per EUR and 1,000 millimes per TND. The event's `currency` field must always travel with the amount. CSV and print exports include a currency column and show two EUR or three TND decimals. JSON exports include the unchanged minor amount and its currency. Use `src/lib/currency.ts` for conversions and formatting.
