#!/bin/bash

# chrome-setup.sh - Minimal Chrome setup for render.yaml start command
# This script sets up Chrome environment without heavy installation

echo "🔧 Setting up Chrome environment..."

# Check if Chrome binaries exist and set environment variables
if [ -f "/usr/bin/google-chrome-stable" ]; then
    export GOOGLE_CHROME_BIN="/usr/bin/google-chrome-stable"
    echo "✅ Found Chrome at: $GOOGLE_CHROME_BIN"
elif [ -f "/usr/bin/google-chrome" ]; then
    export GOOGLE_CHROME_BIN="/usr/bin/google-chrome"
    echo "✅ Found Chrome at: $GOOGLE_CHROME_BIN"
else
    echo "⚠️ Chrome not found, browser automation will be disabled"
    export GOOGLE_CHROME_BIN=""
fi

# Check ChromeDriver
if [ -f "/usr/local/bin/chromedriver" ]; then
    export CHROMEDRIVER_PATH="/usr/local/bin/chromedriver"
    echo "✅ Found ChromeDriver at: $CHROMEDRIVER_PATH"
elif [ -f "/usr/bin/chromedriver" ]; then
    export CHROMEDRIVER_PATH="/usr/bin/chromedriver"
    echo "✅ Found ChromeDriver at: $CHROMEDRIVER_PATH"
else
    echo "⚠️ ChromeDriver not found, browser automation will be disabled"
    export CHROMEDRIVER_PATH=""
fi

# Display versions if available
if [ -n "$GOOGLE_CHROME_BIN" ] && [ -f "$GOOGLE_CHROME_BIN" ]; then
    echo "Chrome version: $($GOOGLE_CHROME_BIN --version 2>/dev/null || echo 'Unable to get version')"
fi

if [ -n "$CHROMEDRIVER_PATH" ] && [ -f "$CHROMEDRIVER_PATH" ]; then
    echo "ChromeDriver version: $($CHROMEDRIVER_PATH --version 2>/dev/null || echo 'Unable to get version')"
fi

echo "🎯 Chrome environment setup completed!"
