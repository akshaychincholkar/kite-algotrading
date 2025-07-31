#!/bin/bash

# Deployment script for Render.com with Chrome support
# This script sets up the environment and tests Chrome functionality

echo "Starting deployment with Chrome support..."

# Set environment variables for Chrome
export CHROME_BIN=/usr/bin/google-chrome
export CHROME_PATH=/usr/bin/google-chrome
export CHROMIUM_PATH=/usr/bin/google-chrome
export GOOGLE_CHROME_SHIM=/usr/bin/google-chrome
export DISPLAY=:99

# Check if we're in a production environment
if [ ! -z "$RENDER" ] || [ ! -z "$RAILWAY_ENVIRONMENT" ] || [ ! -z "$HEROKU_APP_NAME" ]; then
    echo "Production environment detected"
    export PRODUCTION=true
else
    echo "Development environment detected"
    export PRODUCTION=false
fi

# Check Chrome installation
echo "Checking Chrome installation..."
if command -v google-chrome >/dev/null 2>&1; then
    echo "✓ Chrome is installed"
    google-chrome --version
else
    echo "✗ Chrome is not installed"
    exit 1
fi

# Check ChromeDriver installation
echo "Checking ChromeDriver installation..."
if command -v chromedriver >/dev/null 2>&1; then
    echo "✓ ChromeDriver is installed"
    chromedriver --version
else
    echo "✗ ChromeDriver is not installed"
    exit 1
fi

# Create necessary directories
echo "Creating Chrome user data directories..."
mkdir -p /tmp/chrome-user-data
chmod 755 /tmp/chrome-user-data

# Test Chrome functionality if test script exists
if [ -f "test_chrome.py" ]; then
    echo "Running Chrome functionality test..."
    python test_chrome.py
    if [ $? -eq 0 ]; then
        echo "✓ Chrome test passed"
    else
        echo "✗ Chrome test failed"
        echo "Continuing with deployment (Chrome tests may fail in headless environments)"
    fi
fi

# Start the application
echo "Starting Django application..."
if [ "$PRODUCTION" = "true" ]; then
    echo "Starting with Gunicorn..."
    exec gunicorn --bind 0.0.0.0:8000 --workers 3 backend.wsgi:application
else
    echo "Starting with Django development server..."
    exec python manage.py runserver 0.0.0.0:8000
fi
