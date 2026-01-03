#!/bin/bash
# Verify .deb package contains proper icons
# Usage: ./scripts/verify-deb-icons.sh [path-to-deb]

set -e

DEB_FILE="${1:-release/minty-dashboard_1.0.0_amd64.deb}"

if [ ! -f "$DEB_FILE" ]; then
  echo "❌ DEB file not found: $DEB_FILE"
  echo "   Run 'npm run package:linux' first"
  exit 1
fi

echo "🔍 Verifying .deb package: $DEB_FILE"
echo ""

# Check for .desktop file
echo "📋 Checking .desktop file..."
DESKTOP=$(dpkg -c "$DEB_FILE" | grep "\.desktop$" || true)
if [ -n "$DESKTOP" ]; then
  echo "   ✅ Found: $DESKTOP"
else
  echo "   ❌ No .desktop file found"
  exit 1
fi

# Check for icons in /usr/share/icons
echo ""
echo "🖼️  Checking icons in /usr/share/icons..."
ICONS=$(dpkg -c "$DEB_FILE" | grep "/usr/share/icons/" | grep "\.png$" || true)
if [ -n "$ICONS" ]; then
  echo "$ICONS" | while read -r line; do
    SIZE=$(echo "$line" | grep -oE "[0-9]+x[0-9]+|0x0")
    if [ "$SIZE" = "0x0" ]; then
      echo "   ⚠️  Icon has 0x0 size (will be fixed in next build)"
    else
      echo "   ✅ Found icon: $SIZE"
    fi
  done
else
  echo "   ❌ No icons found in /usr/share/icons"
  exit 1
fi

# Extract and check .desktop content
echo ""
echo "📝 Checking .desktop file content..."
TEMP_DIR=$(mktemp -d)
dpkg -x "$DEB_FILE" "$TEMP_DIR"

DESKTOP_PATH=$(find "$TEMP_DIR" -name "*.desktop" | head -1)
if [ -f "$DESKTOP_PATH" ]; then
  echo "   Contents of $(basename $DESKTOP_PATH):"
  cat "$DESKTOP_PATH" | sed 's/^/   /'

  # Check Icon= field
  ICON_NAME=$(grep "^Icon=" "$DESKTOP_PATH" | cut -d= -f2)
  if [ -n "$ICON_NAME" ]; then
    echo ""
    echo "   ✅ Icon name in .desktop: $ICON_NAME"
  else
    echo "   ❌ No Icon= field in .desktop"
  fi
fi

rm -rf "$TEMP_DIR"

echo ""
echo "✅ Verification complete!"
echo ""
echo "📌 Note: If icons show as 0x0, rebuild with 'npm run package:linux'"
echo "   after the icon path fix (electron/icons folder with sized PNGs)"
