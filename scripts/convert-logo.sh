#!/bin/bash
# scripts/convert-logo.sh
# Requires ImageMagick installed (magick or convert)

APP_DIR="${1:-apps/mobile}"
ASSETS_DIR="$APP_DIR/assets"

# Ensure directories exist
mkdir -p "$ASSETS_DIR/logo"

# Source image
SOURCE="$ASSETS_DIR/logo/logo.jpg"

if [ ! -f "$SOURCE" ]; then
    echo "Error: $SOURCE not found!"
    exit 1
fi

echo "Converting $SOURCE..."

# Check if magick (v7) or convert (v6) is available
if command -v magick &> /dev/null; then
    CMD="magick"
elif command -v convert &> /dev/null; then
    CMD="convert"
else
    echo "Error: ImageMagick (magick or convert) not found."
    exit 1
fi

# 1. Icon (1024x1024)
echo "Generating $ASSETS_DIR/icon.png..."
$CMD "$SOURCE" -resize 1024x1024^ -gravity center -extent 1024x1024 "$ASSETS_DIR/icon.png"

# 2. Adaptive Icon (1024x1024, centered content approx 660px safe zone)
echo "Generating $ASSETS_DIR/adaptive-icon.png..."
# For adaptive icon, we want the logo centered with some padding
$CMD "$SOURCE" -resize 800x800^ -gravity center -background white -extent 1024x1024 "$ASSETS_DIR/adaptive-icon.png"

# 3. Splash Screen (1242x2436 typical)
echo "Generating $ASSETS_DIR/splash.png..."
$CMD "$SOURCE" -resize 500x500^ -gravity center -background white -extent 1242x2436 "$ASSETS_DIR/splash.png"

# 4. Favicon (48x48)
echo "Generating $ASSETS_DIR/favicon.png..."
$CMD "$SOURCE" -resize 48x48 "$ASSETS_DIR/favicon.png"

echo "Done! Please run: npx expo prebuild --clean"
