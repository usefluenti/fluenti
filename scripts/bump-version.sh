#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────
# bump-version.sh — Bump version across all publishable packages
#
# Usage:
#   ./scripts/bump-version.sh patch        # 1.0.0 → 1.0.1
#   ./scripts/bump-version.sh minor        # 1.0.0 → 1.1.0
#   ./scripts/bump-version.sh major        # 1.0.0 → 2.0.0
#   ./scripts/bump-version.sh 2.3.1        # Set exact version
# ──────────────────────────────────────────────────────────

PACKAGES=(
  "packages/core/package.json"
  "packages/vue/package.json"
  "packages/solid/package.json"
  "packages/cli/package.json"
  "packages/vite-plugin/package.json"
)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Parse argument ──

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <major|minor|patch|x.y.z>"
  exit 1
fi

BUMP="$1"

# ── Read current version from the main package ──

CURRENT=$(node -p "require('./${PACKAGES[0]}').version" 2>/dev/null || echo "0.0.0")

# Strip prerelease suffix for arithmetic (0.0.3-rc.0 → 0.0.3)
BASE_VERSION="${CURRENT%%-*}"
HAS_PRERELEASE=false
if [[ "$CURRENT" == *-* ]]; then
  HAS_PRERELEASE=true
fi

IFS='.' read -r CUR_MAJOR CUR_MINOR CUR_PATCH <<< "$BASE_VERSION"

# ── Calculate next version ──

case "$BUMP" in
  major)
    NEXT="$((CUR_MAJOR + 1)).0.0"
    ;;
  minor)
    NEXT="${CUR_MAJOR}.$((CUR_MINOR + 1)).0"
    ;;
  patch)
    if [[ "$HAS_PRERELEASE" == true ]]; then
      NEXT="${CUR_MAJOR}.${CUR_MINOR}.${CUR_PATCH}"
    else
      NEXT="${CUR_MAJOR}.${CUR_MINOR}.$((CUR_PATCH + 1))"
    fi
    ;;
  *)
    if [[ ! "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.+)?$ ]]; then
      echo "Error: Invalid version '$BUMP'. Use major|minor|patch or x.y.z[-prerelease]"
      exit 1
    fi
    NEXT="$BUMP"
    ;;
esac

echo "Bumping version: $CURRENT → $NEXT"
echo ""

# ── Update each package.json ──

for PKG in "${PACKAGES[@]}"; do
  FILE="$ROOT/$PKG"
  if [[ ! -f "$FILE" ]]; then
    echo "  SKIP  $PKG (not found)"
    continue
  fi

  sed -i.bak -E "s/\"version\": *\"[0-9]+\.[0-9]+\.[0-9]+(-.+)?\"/\"version\": \"$NEXT\"/" "$FILE"
  rm -f "${FILE}.bak"

  NAME=$(node -p "require('$FILE').name")
  echo "  OK    $NAME → $NEXT"
done

echo ""
echo "Done. Updated ${#PACKAGES[@]} packages to v$NEXT"
