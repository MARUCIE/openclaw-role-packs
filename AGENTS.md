# OpenClaw Role Packs - Agent Instructions

This repository is the standalone distribution surface for OpenClaw role configuration packs.

## Rules

- Treat `packs/` and `catalog/` as generated distribution artifacts synced from `/Users/mauricewen/Projects/22-openclaw-foundry`.
- Do not edit individual copied pack payloads by hand unless the same fix is also made in the Foundry source.
- Installer behavior must remain local-first: a copied repository or copied `packs/<id>/` directory must install without network access.
- Remote install is allowed only when the user explicitly sets `ROLE_PACKS_BASE_URL` or `FOUNDRY_BASE_URL`.
- Verify changes with `npm run validate` and `npm run smoke:install` before claiming the repo is installable.
- User-facing explanations should be in Chinese; code, paths, and identifiers should stay in English.
