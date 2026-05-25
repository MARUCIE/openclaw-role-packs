# OpenClaw Role Packs

Standalone role configuration packs synced from the local OpenClaw Foundry worktree.

## Install From A Full Copy

```bash
./install.sh product-manager --agent=claude
./install.sh frontend-engineer --agent=codex
./install.sh spellbook-code-reviewer --target /tmp/openclaw-pack-test
```

## Install From A Single Copied Pack

```bash
cd packs/product-manager
./install.sh --agent=claude
```

Installers are local-first. If `manifest.json` and the listed artifacts are next to `install.sh`, the script copies those local files. It only uses network URLs when `ROLE_PACKS_BASE_URL` or `FOUNDRY_BASE_URL` is explicitly set.

## Verify

```bash
npm run validate
npm run smoke:install
```

`validate` checks catalog, directory, manifest, file, destination path, and shell syntax consistency. `smoke:install` installs every pack into an isolated `out/verify/` directory and verifies every manifest destination exists.

## Sync From Foundry

```bash
npm run sync:foundry
npm run regenerate:installers
npm run validate
npm run smoke:install
```

The default source is `/Users/mauricewen/Projects/22-openclaw-foundry`. Use `--source <path>` to sync from another Foundry checkout.
