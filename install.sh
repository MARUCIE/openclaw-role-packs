#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./install.sh <pack-id> [--agent=claude|codex|gemini|hermes|openclaw] [--target <dir>]
  ./install.sh --list

Examples:
  ./install.sh product-manager --agent=claude
  ./install.sh frontend-engineer --agent=codex
  ./install.sh spellbook-code-reviewer --target /tmp/openclaw-pack-test
EOF
}

if [ $# -eq 0 ]; then
  usage
  exit 1
fi

case "$1" in
  -h|--help)
    usage
    exit 0
    ;;
  --list)
    python3 - "$ROOT_DIR/packs" <<'PY'
import json
import os
import sys

packs_dir = sys.argv[1]
ids = []
for name in sorted(os.listdir(packs_dir)):
    pack_dir = os.path.join(packs_dir, name)
    manifest_path = os.path.join(pack_dir, "manifest.json")
    if not os.path.isdir(pack_dir) or not os.path.exists(manifest_path):
        continue
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if manifest.get("deprecated_alias_of"):
        continue
    ids.append(name)
print("\n".join(ids))
PY
    exit 0
    ;;
esac

PACK_ID="$1"
shift

PACK_DIR="$ROOT_DIR/packs/$PACK_ID"
if [ ! -d "$PACK_DIR" ]; then
  echo "ERROR: unknown pack '$PACK_ID'" >&2
  echo "Run './install.sh --list' to see available packs." >&2
  exit 1
fi

exec bash "$PACK_DIR/install.sh" "$@"
