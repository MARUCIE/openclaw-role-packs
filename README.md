# OpenClaw Role Packs

Standalone role configuration packs synced from the local OpenClaw Foundry worktree.

## Recommended: Install From Git

Use the Git repo as the transport. This fetches the complete pack snapshot before running the installer, so `manifest.json` and every referenced artifact stay in sync.

Pinned release snapshot:

```bash
tmp="$(mktemp -d)"
git clone --depth 1 --branch v2026.05.27.3 https://github.com/MARUCIE/openclaw-role-packs.git "$tmp/openclaw-role-packs"
"$tmp/openclaw-role-packs/install.sh" product-manager --agent=claude
```

Another pack:

```bash
tmp="$(mktemp -d)"
git clone --depth 1 --branch v2026.05.27.3 https://github.com/MARUCIE/openclaw-role-packs.git "$tmp/openclaw-role-packs"
"$tmp/openclaw-role-packs/install.sh" frontend-engineer --agent=codex
```

Replace `product-manager` or `frontend-engineer` with any ID from:

```bash
"$tmp/openclaw-role-packs/install.sh" --list
```

## Install From A Full Local Copy

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

Sync requires an explicit source: `npm run sync:foundry -- --source <foundry-root>`. You can also set `FOUNDRY_SOURCE=<foundry-root>`.
