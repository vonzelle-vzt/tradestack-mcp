# Rollback plan

TradeStack MCP ships as an npm package (`npx -y tradestack-mcp`) and, optionally, as a self-hosted `streamable-http` server. It has no Vercel or mobile deployment.

## npm package

1. Point users at the last good version: `npx -y tradestack-mcp@<good-version>`.
2. Deprecate the bad release so installs warn: `npm deprecate tradestack-mcp@<bad-version> "Broken, use <good-version>"`.
3. Within 72 hours of publishing, `npm unpublish tradestack-mcp@<bad-version>` is possible; otherwise ship a fixed patch release.
4. Move the `latest` dist-tag back if needed: `npm dist-tag add tradestack-mcp@<good-version> latest`.
5. Record the rollback in `CHANGELOG.md`.

## Hosted HTTP server

Redeploy the previous image/commit (`git checkout <good-tag> && npm ci && npm run build && npm start`) with the same env. The server is stateless apart from optional Supabase, so no data restore is needed.

## Database (Supabase, optional)

The repo has a single `supabase/schema.sql` and no migration history, so there is no automated down-migration. Before applying any schema change:

1. Take a backup (Supabase dashboard → Database → Backups, or `pg_dump`).
2. Write the inverse SQL (`drop table`/`drop column`/restore policies) alongside the change.

To roll back, run the inverse SQL, or restore the backup if data was altered. Persistence is opt-in, so unsetting `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` returns the server to its stateless mode while you recover.
