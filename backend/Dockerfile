# Backend Dockerfile for AlgoTrading Application
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=money_multiplier.settings

# Install Chrome dependencies first
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add Google Chrome repository and install
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver using ChromeDriver Manager approach
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver using multiple methods for maximum compatibility
# Method 1: Direct download with fallback versions
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1) \
    && echo "Chrome major version: $CHROME_VERSION" \
    && for version in $CHROME_VERSION 114 113 112; do \
        echo "Trying ChromeDriver version for Chrome $version" \
        && DRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_$version" 2>/dev/null || echo "") \
        && if [ ! -z "$DRIVER_VERSION" ]; then \
            echo "Found driver version: $DRIVER_VERSION" \
            && wget -O /tmp/chromedriver.zip "https://chromedriver.storage.googleapis.com/$DRIVER_VERSION/chromedriver_linux64.zip" 2>/dev/null \
            && if [ -f /tmp/chromedriver.zip ]; then \
                unzip /tmp/chromedriver.zip -d /tmp/ \
                && mv /tmp/chromedriver /usr/local/bin/ \
                && chmod +x /usr/local/bin/chromedriver \
                && rm /tmp/chromedriver.zip \
                && break; \
            fi; \
        fi; \
    done

# Method 2: Fallback to latest stable if version matching fails
RUN if [ ! -f /usr/local/bin/chromedriver ]; then \
        echo "Version matching failed, downloading latest stable..." \
        && LATEST_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE") \
        && wget -O /tmp/chromedriver.zip "https://chromedriver.storage.googleapis.com/$LATEST_VERSION/chromedriver_linux64.zip" \
        && unzip /tmp/chromedriver.zip -d /tmp/ \
        && mv /tmp/chromedriver /usr/local/bin/ \
        && chmod +x /usr/local/bin/chromedriver \
        && rm /tmp/chromedriver.zip; \
    fi

# Method 3: Create symlinks and make available in PATH
RUN ln -sf /usr/local/bin/chromedriver /usr/bin/chromedriver \
    && ln -sf /usr/bin/google-chrome /usr/bin/chromium-browser \
    && which chromedriver \
    && which google-chrome

# Verify installations and create a test script
RUN google-chrome --version \
    && chromedriver --version \
    && echo '#!/bin/bash\necho "Chrome: $(which google-chrome)"\necho "ChromeDriver: $(which chromedriver)"\ngoogle-chrome --version\nchromedriver --version' > /usr/local/bin/verify-chrome \
    && chmod +x /usr/local/bin/verify-chrome \
    && echo "Chrome and ChromeDriver verification completed"

# Create additional environment setup
RUN echo 'export PATH="/usr/local/bin:/usr/bin:$PATH"' >> /etc/environment \
    && echo 'export CHROME_BIN=/usr/bin/google-chrome' >> /etc/environment \
    && echo 'export CHROMEDRIVER_PATH=/usr/local/bin/chromedriver' >> /etc/environment

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy project
COPY . .

# Make startup script executable
RUN chmod +x startup.sh check_chrome_env.py

# Create directories for Chrome user data with proper permissions
RUN mkdir -p /tmp/chrome-user-data \
    && chmod 755 /tmp/chrome-user-data

# Collect static files
RUN python manage.py collectstatic --noinput

# Create a non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /tmp/chrome-user-data

# Set Chrome environment variables
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROME_PATH=/usr/bin/google-chrome
ENV CHROMIUM_PATH=/usr/bin/google-chrome
ENV GOOGLE_CHROME_SHIM=/usr/bin/google-chrome
ENV DISPLAY=:99

USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["./startup.sh", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "backend.wsgi:application"]
