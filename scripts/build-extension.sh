#!/bin/bash
# Build eOffice browser extension (.zip for Chrome Web Store, .crx for self-hosted)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
EXT_DIR="$PROJECT_DIR/extensions/browser"
DIST_DIR="$PROJECT_DIR/extensions/dist"

echo "=== Building eOffice Browser Extension ==="

# Clean
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Get version from manifest
VERSION=$(python3 -c "import json; print(json.load(open('$EXT_DIR/manifest.json'))['version'])")
echo "Version: $VERSION"

# Create .zip for Chrome Web Store submission
cd "$EXT_DIR"
zip -r "$DIST_DIR/eoffice-extension-v${VERSION}.zip"   manifest.json   background.js   popup.html   options.html   apps/   icons/   -x "*.DS_Store" "*.map" "updates.xml"

echo ""
echo "Built:"
ls -lh "$DIST_DIR/"
echo ""
echo "Upload to Chrome Web Store:"
echo "  https://chrome.google.com/webstore/devconsole"
echo ""
echo "For self-hosted distribution:"
echo "  Upload .crx + updates.xml to S3"
