# Chrome Installation Scripts for Render.com

This directory contains scripts to install Google Chrome and ChromeDriver on Render.com as an alternative to using buildpacks.

## Scripts

### 1. `install-chrome.sh` 
**Full Installation Script**
- Installs all dependencies, Google Chrome, and ChromeDriver
- Downloads the latest compatible ChromeDriver version
- Best used in `buildCommand` for complete setup
- Takes more time but ensures everything is properly installed

### 2. `install-chrome-light.sh`
**Lightweight Installation Script** 
- Minimal installation with error handling
- Faster than full installation
- Good for `startCommand` if you need installation at runtime
- Includes fallbacks and graceful error handling

### 3. `chrome-setup.sh`
**Environment Setup Only**
- Does NOT install Chrome/ChromeDriver
- Only sets up environment variables and detects existing installations
- Fastest option, works with buildpacks
- Best for `startCommand` when Chrome is already installed via buildpacks

## Usage Options

### Option 1: Buildpacks (Recommended)
```yaml
buildpacks:
  - heroku/google-chrome  
  - heroku/chromedriver
startCommand: "chmod +x scripts/chrome-setup.sh && bash scripts/chrome-setup.sh && cd backend && python -m gunicorn ..."
```

### Option 2: Full Installation in Build
```yaml  
buildCommand: "chmod +x scripts/install-chrome.sh && bash scripts/install-chrome.sh && pip install ..."
startCommand: "bash scripts/chrome-setup.sh && cd backend && python -m gunicorn ..."
```

### Option 3: Light Installation at Start  
```yaml
startCommand: "chmod +x scripts/install-chrome-light.sh && bash scripts/install-chrome-light.sh && cd backend && python -m gunicorn ..."
```

## Environment Variables Set

All scripts set these environment variables:
- `GOOGLE_CHROME_BIN` - Path to Chrome binary
- `CHROMEDRIVER_PATH` - Path to ChromeDriver binary

## Notes

- **Option 1 (buildpacks)** is recommended for reliability
- **Option 2** is good if buildpacks don't work  
- **Option 3** is fastest for debugging but may have permission issues
- All scripts include error handling and fallbacks
- Browser automation is currently disabled in production to prevent worker timeouts
