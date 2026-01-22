#!/bin/bash
# scripts/convert-logo.sh
# Requires ImageMagick installed (magick or convert)

# Ensure directories exist
mkdir -p assets/logo

# Source image
SOURCE="assets/logo/logo.jpg"

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
echo "Generating assets/icon.png..."
$CMD "$SOURCE" -resize 1024x1024^ -gravity center -extent 1024x1024 assets/icon.png

# 2. Adaptive Icon (1024x1024, centered content approx 660px safe zone)
echo "Generating assets/adaptive-icon.png..."
# For adaptive icon, we want the logo centered with some padding
$CMD "$SOURCE" -resize 800x800^ -gravity center -background white -extent 1024x1024 assets/adaptive-icon.png

# 3. Splash Screen (1242x2436 typical)
echo "Generating assets/splash.png..."
$CMD "$SOURCE" -resize 500x500^ -gravity center -background white -extent 1242x2436 assets/splash.png

# 4. Favicon (48x48)
echo "Generating assets/favicon.png..."
$CMD "$SOURCE" -resize 48x48 assets/favicon.png

echo "Done! Please run: npx expo prebuild --clean"
