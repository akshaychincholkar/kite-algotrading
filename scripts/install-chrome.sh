#!/bin/bash

# install-chrome.sh - Install Google Chrome and ChromeDriver for Render.com
# This script installs Chrome and ChromeDriver without using buildpacks

set -e  # Exit on any error

echo "🚀 Starting Chrome and ChromeDriver installation..."

# Check if running as root or have sudo privileges
if [ "$EUID" -ne 0 ] && ! command -v sudo >/dev/null 2>&1; then
    echo "⚠️ Warning: Not running as root and sudo not available. Some commands may fail."
    echo "ℹ️ Continuing with limited privileges..."
    APT_CMD=""
else
    APT_CMD="sudo"
fi

# Update package lists
echo "📦 Updating package lists..."
$APT_CMD apt-get update -qq || echo "⚠️ apt-get update failed, continuing..."

# Install dependencies
echo "🔧 Installing dependencies..."
$APT_CMD apt-get install -y -qq \
    wget \
    curl \
    gnupg \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils 2>/dev/null || echo "⚠️ Some dependencies failed to install"

# Add Google Chrome repository
echo "🌐 Adding Google Chrome repository..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | $APT_CMD apt-key add - 2>/dev/null || echo "⚠️ Failed to add Chrome signing key"
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | $APT_CMD tee /etc/apt/sources.list.d/google-chrome.list >/dev/null 2>&1 || echo "⚠️ Failed to add Chrome repository"

# Update package lists again
$APT_CMD apt-get update -qq || echo "⚠️ apt-get update failed"

# Install Google Chrome
echo "🌐 Installing Google Chrome..."
$APT_CMD apt-get install -y -qq google-chrome-stable || echo "⚠️ Chrome installation failed"

# Verify Chrome installation
echo "✅ Verifying Chrome installation..."
google-chrome --version 2>/dev/null || echo "⚠️ Chrome verification failed"

# Install ChromeDriver
echo "🚗 Installing ChromeDriver..."

# Get Chrome version to match ChromeDriver version
CHROME_VERSION=$(google-chrome --version 2>/dev/null | awk '{print $3}' | cut -d'.' -f1-3 || echo "114")
echo "Chrome version: $CHROME_VERSION"

# Get the latest ChromeDriver version that matches Chrome
CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION" 2>/dev/null || echo "114.0.5735.90")
echo "ChromeDriver version: $CHROMEDRIVER_VERSION"

# Download and install ChromeDriver
CHROMEDRIVER_URL="https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip"
echo "Downloading ChromeDriver from: $CHROMEDRIVER_URL"

cd /tmp
wget -O chromedriver.zip "$CHROMEDRIVER_URL" 2>/dev/null || echo "⚠️ ChromeDriver download failed"

if [ -f chromedriver.zip ]; then
    unzip -o chromedriver.zip 2>/dev/null || echo "⚠️ ChromeDriver unzip failed"
    chmod +x chromedriver 2>/dev/null || echo "⚠️ ChromeDriver chmod failed"
    
    # Try to move to system directories
    if [ -w /usr/local/bin ]; then
        mv chromedriver /usr/local/bin/ 2>/dev/null || echo "⚠️ ChromeDriver move to /usr/local/bin failed"
    elif [ -w /usr/bin ]; then
        mv chromedriver /usr/bin/ 2>/dev/null || echo "⚠️ ChromeDriver move to /usr/bin failed"
    else
        echo "⚠️ No writable system bin directory found for ChromeDriver"
    fi
fi

# Verify ChromeDriver installation
echo "✅ Verifying ChromeDriver installation..."
chromedriver --version 2>/dev/null || echo "⚠️ ChromeDriver verification failed"

# Set environment variables
echo "🔧 Setting environment variables..."
export GOOGLE_CHROME_BIN="/usr/bin/google-chrome"
export CHROMEDRIVER_PATH="/usr/local/bin/chromedriver"

# Create symlinks for common paths (if possible)
echo "🔗 Creating symlinks..."
if [ -w /usr/bin ]; then
    ln -sf /usr/bin/google-chrome-stable /usr/bin/google-chrome 2>/dev/null || echo "⚠️ Chrome symlink creation failed"
    ln -sf /usr/local/bin/chromedriver /usr/bin/chromedriver 2>/dev/null || echo "⚠️ ChromeDriver symlink creation failed"
fi

# Cleanup
echo "🧹 Cleaning up..."
rm -f /tmp/chromedriver.zip 2>/dev/null || true
$APT_CMD apt-get clean 2>/dev/null || true
$APT_CMD rm -rf /var/lib/apt/lists/* 2>/dev/null || true

echo "✅ Chrome and ChromeDriver installation completed!"
echo "Chrome binary: $(which google-chrome 2>/dev/null || echo 'Not found in PATH')"
echo "ChromeDriver binary: $(which chromedriver 2>/dev/null || echo 'Not found in PATH')"
echo "Chrome version: $(google-chrome --version 2>/dev/null || echo 'Unable to get version')"
echo "ChromeDriver version: $(chromedriver --version 2>/dev/null || echo 'Unable to get version')"
