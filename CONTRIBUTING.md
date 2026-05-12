# Contributing to TradeStack MCP

Thanks for your interest. TradeStack is MIT-licensed and welcomes contributions of all sizes.

## Ground rules

- All contributions are licensed under MIT (same as the project).
- One concern per PR. Mix and we'll ask you to split.
- Conventional commits required: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Sign off your commits (DCO): `git commit -s -m "feat: ..."`.

## Development setup

```bash
git clone https://github.com/vonzelle-vzt/tradestack-mcp.git
cd tradestack-mcp
npm install
cp .env.example .env   # optional; nothing required for core
npm run dev
```

## Before opening a PR

```bash
npm run typecheck
npm run lint
npm test
```

All three must pass. CI will re-run them.

## Adding a tool

Read `CLAUDE.md` → "Tool authoring checklist". TL;DR:
- one tool per file under `src/tools/`
- zod schema for inputs
- registered in `src/tools/index.ts`
- documented in `docs/TOOLS.md`
- one happy-path + one failure-path test

## Adding a platform integration

Read `CLAUDE.md` → "When asked to add a platform". Existing platform docs are the template.

## Reporting bugs

Open an issue with: repro steps, expected vs. actual, your `tradestack-mcp` version, the MCP client (Claude Desktop / Cursor / custom), and any relevant log output (`LOG_LEVEL=debug`).

## Security disclosures

Email `security@vzt-techconsulting.com`. Don't file public issues for security bugs.
