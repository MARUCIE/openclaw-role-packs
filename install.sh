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
    find "$ROOT_DIR/packs" -mindepth 1 -maxdepth 1 -type d -print | sed "s#^$ROOT_DIR/packs/##" | sort
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
