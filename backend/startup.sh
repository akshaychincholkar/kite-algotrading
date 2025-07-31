#!/bin/bash

# Startup script for production environment with Chrome support
echo "=== AlgoTrading Application Startup ==="

# Set environment variables
export CHROME_BIN=/usr/bin/google-chrome
export CHROME_PATH=/usr/bin/google-chrome
export CHROMIUM_PATH=/usr/bin/google-chrome
export GOOGLE_CHROME_SHIM=/usr/bin/google-chrome
export CHROMEDRIVER_PATH=/usr/local/bin/chromedriver
export DISPLAY=:99
export PATH="/usr/local/bin:/usr/bin:$PATH"

echo "Environment variables set:"
echo "CHROME_BIN: $CHROME_BIN"
echo "CHROMEDRIVER_PATH: $CHROMEDRIVER_PATH"

# Check Chrome installation
echo "Checking Chrome installation..."
if command -v google-chrome >/dev/null 2>&1; then
    echo "✓ Chrome is available"
    google-chrome --version
else
    echo "✗ Chrome is not available"
    echo "Available browsers:"
    ls -la /usr/bin/*chrome* 2>/dev/null || echo "No Chrome browsers found"
fi

# Check ChromeDriver installation
echo "Checking ChromeDriver installation..."
if command -v chromedriver >/dev/null 2>&1; then
    echo "✓ ChromeDriver is available"
    chromedriver --version
else
    echo "✗ ChromeDriver is not available"
    echo "Checking standard locations:"
    ls -la /usr/local/bin/chromedriver /usr/bin/chromedriver 2>/dev/null || echo "ChromeDriver not found in standard locations"
fi

# Check if we can create a test Chrome instance
echo "Testing Chrome functionality..."
if [ -f "/usr/bin/google-chrome" ] && [ -f "/usr/local/bin/chromedriver" ]; then
    echo "✓ Both Chrome and ChromeDriver are present"
    
    # Try to run a simple Chrome test
    timeout 10s google-chrome --headless --no-sandbox --disable-gpu --dump-dom about:blank >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Chrome basic test passed"
    else
        echo "⚠ Chrome basic test failed (may work in application context)"
    fi
else
    echo "⚠ Chrome or ChromeDriver missing - browser automation will be disabled"
fi

# Create chrome user data directory with proper permissions
echo "Setting up Chrome user data directory..."
mkdir -p /tmp/chrome-user-data
chmod 755 /tmp/chrome-user-data
chown -R $(whoami) /tmp/chrome-user-data 2>/dev/null || echo "Note: Could not change ownership (may be running as non-root)"

echo "=== Starting Django Application ==="

# Start the application
exec "$@"
