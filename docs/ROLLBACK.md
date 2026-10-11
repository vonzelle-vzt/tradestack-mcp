# Rollback

TradeStack MCP is published to npm as `tradestack-mcp` and can also be self-hosted
with the `streamable-http` transport. There is no Vercel or mobile deployment.

## npm package

1. Find the last good version: `npm view tradestack-mcp versions`.
2. Point the `latest` dist-tag back at it:
   `npm dist-tag add tradestack-mcp@<good-version> latest`
3. If the release is dangerous, deprecate it so installs warn:
   `npm deprecate tradestack-mcp@<bad-version> "Broken, use <good-version>"`
4. Ship the fix as a new patch version. Do not `npm unpublish` (blocked after 72h and breaks consumers).
5. Users pinned via `npx -y tradestack-mcp@<good-version>` are unaffected.

## Self-hosted (streamable-http)

1. Redeploy the previous git tag / container image: `git checkout v<good-version> && npm ci && npm run build`.
2. Restart the process with the same env; the server needs no env to start.

## Database (Supabase)

The state schema is a single idempotent file, `supabase/schema.sql` (all `create ... if not exists`),
not a sequence of migrations, so there is no automatic down-migration.

1. Check out the previous revision of `supabase/schema.sql` from git.
2. Write and review a manual reversal for what the bad revision added
   (e.g. `drop table if exists <new_table>;`, `alter table ... drop column ...`).
3. Take a backup/snapshot first (Supabase dashboard → Database → Backups), then apply the reversal with `psql $DATABASE_URL -f`.
4. Persistence is opt-in; unsetting `SUPABASE_URL` returns the server to stateless read-only mode.
