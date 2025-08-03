#!/bin/bash

# install-chrome-light.sh - Lightweight Chrome and ChromeDriver installation for render.yaml
# This script is optimized for use in render.yaml start command

set -e  # Exit on any error

echo "🚀 Installing Chrome and ChromeDriver (lightweight)..."

# Check if Chrome is already installed
if command -v google-chrome >/dev/null 2>&1; then
    echo "✅ Chrome already installed: $(google-chrome --version)"
else
    echo "📦 Installing Chrome..."
    
    # Add Google repository and install Chrome
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - 2>/dev/null || true
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list 2>/dev/null || true
    
    apt-get update -qq 2>/dev/null || true
    apt-get install -y google-chrome-stable 2>/dev/null || true
    
    echo "✅ Chrome installed: $(google-chrome --version 2>/dev/null || echo 'Chrome installation may have failed')"
fi

# Check if ChromeDriver is already installed
if command -v chromedriver >/dev/null 2>&1; then
    echo "✅ ChromeDriver already installed: $(chromedriver --version)"
else
    echo "🚗 Installing ChromeDriver..."
    
    # Get Chrome version and install matching ChromeDriver
    CHROME_VERSION=$(google-chrome --version 2>/dev/null | awk '{print $3}' | cut -d'.' -f1-3 || echo "114")
    CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION" 2>/dev/null || echo "114.0.5735.90")
    
    # Download and install ChromeDriver
    cd /tmp
    wget -q -O chromedriver.zip "https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip" 2>/dev/null || true
    
    if [ -f chromedriver.zip ]; then
        unzip -o chromedriver.zip 2>/dev/null || true
        chmod +x chromedriver 2>/dev/null || true
        mv chromedriver /usr/local/bin/ 2>/dev/null || true
        rm -f chromedriver.zip
        echo "✅ ChromeDriver installed: $(chromedriver --version 2>/dev/null || echo 'ChromeDriver installation may have failed')"
    else
        echo "⚠️ ChromeDriver download failed, continuing..."
    fi
fi

# Set up environment
export GOOGLE_CHROME_BIN="/usr/bin/google-chrome"
export CHROMEDRIVER_PATH="/usr/local/bin/chromedriver"

echo "🎯 Chrome setup completed!"
echo "GOOGLE_CHROME_BIN=$GOOGLE_CHROME_BIN"
echo "CHROMEDRIVER_PATH=$CHROMEDRIVER_PATH"
