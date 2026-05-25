# OpenClaw Role Packs

This repo stores standalone role configuration packs for Claude Code, Codex CLI, Gemini CLI, Hermes, and OpenClaw.

## Operating Contract

- Source of truth: the Foundry checkout passed to `npm run sync:foundry -- --source <foundry-root>`.
- Catalog mirror: `catalog/`
- Pack mirror: `packs/`
- Local-first install is a product invariant.
- Do not introduce compatibility shims or mock installers.
- Any sync must preserve a verifiable path from Foundry source to this repo.

## Verification

Run:

```bash
npm run validate
npm run smoke:install
```

Both commands must pass before publishing or handing the repo to another user.
