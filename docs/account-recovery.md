# Account recovery and deployment

Apply `prisma/manual-migrations/20261113_recovery_code.sql` once before deploying this version. It adds a nullable recovery-code hash without changing existing accounts. Regenerate the Prisma client with the normal build.

New accounts receive a cryptographically random 192-bit recovery code once. Store it in a password manager. Existing users generate a code from their profile after entering their password. Generating a code invalidates the previous code. Recovery requires the account email, its recovery code and a new password; it atomically consumes the old code, generates a replacement and revokes all sessions. Password changes also revoke all prior sessions. The current browser receives a fresh session. Recovery codes are stored as SHA-256 hashes. There is no email delivery or email-based reset flow.

Authentication routes limit attempts per process and account. Run one application replica or add a shared ingress limiter for distributed protection. Set `TRUST_PROXY=true` only behind a reverse proxy that replaces `X-Forwarded-For`; otherwise authentication uses a shared process ceiling of 1,000 requests per 15 minutes. With a trusted proxy, each client IP permits 60 authentication requests per 15 minutes. All deployments limit each account to 10 attempts per 15 minutes. Rate limits also apply to authenticated password and recovery-code changes.

Push registration accepts HTTPS endpoints belonging to browser push providers (FCM, Mozilla, Apple and Windows), with correctly sized subscription keys. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` at runtime; the public configuration endpoint also accepts `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for compatibility. Unsubscribe removes only the current user's endpoint.

Profile export supports JSON (default), CSV (`?format=csv`) and an escaped printable HTML report (`?format=print`). Use the browser's print dialog to save the report as PDF. CSV values are quoted and formula-leading values are escaped for spreadsheets. Invoice binaries remain available from their authenticated attachment links; CSV and print exports contain event data.
