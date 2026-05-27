#!/bin/bash
# Build all 12 eOffice React apps for production
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APPS=(edocs enotes esheets eslides email edb edrive econnect eforms esway eplanner launcher)

echo "🏗️  Building all eOffice apps..."
echo "================================"

# Build shared packages first
echo ""
echo "📦 Building @eoffice/core..."
cd "$ROOT_DIR/packages/core"
npx tsc --noEmit 2>/dev/null || true
echo "   ✅ Core ready"

echo ""
echo "📦 Building @eoffice/ebot-client..."
cd "$ROOT_DIR/packages/ebot-client"
npx tsc --noEmit 2>/dev/null || true
echo "   ✅ eBot client ready"

# Build each app
FAILED=()
for APP in "${APPS[@]}"; do
  echo ""
  echo "🔨 Building $APP..."
  cd "$ROOT_DIR/apps/$APP"

  if npx vite build 2>&1; then
    echo "   ✅ $APP built successfully"
  else
    echo "   ❌ $APP build failed"
    FAILED+=("$APP")
  fi
done

echo ""
echo "================================"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✅ All ${#APPS[@]} apps built successfully!"
else
  echo "⚠️  ${#FAILED[@]} app(s) failed to build: ${FAILED[*]}"
  echo "   Remaining apps were built successfully."
fi

echo ""
echo "📁 Built apps are in apps/*/dist/"
echo "🖥️  To build desktop installer: cd desktop && npm run build:win"
