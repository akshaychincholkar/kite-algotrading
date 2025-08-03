#!/bin/bash

# install-chrome.sh - Install Google Chrome and ChromeDriver for Render.com
# This script installs Chrome and ChromeDriver without using buildpacks

set -e  # Exit on any error

echo "🚀 Starting Chrome and ChromeDriver installation..."

# Update package lists
echo "📦 Updating package lists..."
apt-get update -qq

# Install dependencies
echo "🔧 Installing dependencies..."
apt-get install -y -qq \
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
    xdg-utils

# Add Google Chrome repository
echo "🌐 Adding Google Chrome repository..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Update package lists again
apt-get update -qq

# Install Google Chrome
echo "🌐 Installing Google Chrome..."
apt-get install -y -qq google-chrome-stable

# Verify Chrome installation
echo "✅ Verifying Chrome installation..."
google-chrome --version

# Install ChromeDriver
echo "🚗 Installing ChromeDriver..."

# Get Chrome version to match ChromeDriver version
CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d'.' -f1-3)
echo "Chrome version: $CHROME_VERSION"

# Get the latest ChromeDriver version that matches Chrome
CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$CHROME_VERSION")
echo "ChromeDriver version: $CHROMEDRIVER_VERSION"

# Download and install ChromeDriver
CHROMEDRIVER_URL="https://chromedriver.storage.googleapis.com/$CHROMEDRIVER_VERSION/chromedriver_linux64.zip"
echo "Downloading ChromeDriver from: $CHROMEDRIVER_URL"

cd /tmp
wget -O chromedriver.zip "$CHROMEDRIVER_URL"
unzip -o chromedriver.zip
chmod +x chromedriver
mv chromedriver /usr/local/bin/

# Verify ChromeDriver installation
echo "✅ Verifying ChromeDriver installation..."
chromedriver --version

# Set environment variables
echo "🔧 Setting environment variables..."
export GOOGLE_CHROME_BIN="/usr/bin/google-chrome"
export CHROMEDRIVER_PATH="/usr/local/bin/chromedriver"

# Create symlinks for common paths
echo "🔗 Creating symlinks..."
ln -sf /usr/bin/google-chrome-stable /usr/bin/google-chrome
ln -sf /usr/local/bin/chromedriver /usr/bin/chromedriver

# Cleanup
echo "🧹 Cleaning up..."
rm -f /tmp/chromedriver.zip
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "✅ Chrome and ChromeDriver installation completed successfully!"
echo "Chrome binary: $(which google-chrome)"
echo "ChromeDriver binary: $(which chromedriver)"
echo "Chrome version: $(google-chrome --version)"
echo "ChromeDriver version: $(chromedriver --version)"
