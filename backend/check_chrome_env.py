#!/usr/bin/env python3
"""
Production environment detector and Chrome tester
Run this to check if your production environment is properly configured
"""

import os
import sys
import subprocess
import platform
import logging

# Get logger for chrome environment checks
logger = logging.getLogger('chrome_env')


def check_environment():
    """Check if we're in a production environment"""
    logger.info("=== Environment Detection ===")
    
    env_indicators = {
        'RENDER': os.environ.get('RENDER'),
        'RAILWAY_PROJECT_ID': os.environ.get('RAILWAY_PROJECT_ID'),
        'HEROKU_APP_NAME': os.environ.get('HEROKU_APP_NAME'),
        'VERCEL': os.environ.get('VERCEL'),
        'NETLIFY': os.environ.get('NETLIFY'),
    }
    
    production_detected = any(env_indicators.values())
    
    logger.info(f"Platform: {platform.system()} {platform.release()}")
    logger.info(f"Python: {sys.version}")
    logger.info(f"Production environment detected: {production_detected}")
    
    for key, value in env_indicators.items():
        logger.info(f"  {key}: {value or 'Not set'}")
    
    return production_detected


def check_chrome_installation():
    """Check Chrome installation"""
    logger.info("\n=== Chrome Installation Check ===")
    
    chrome_paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
    ]
    
    chrome_found = False
    chrome_path = None
    
    for path in chrome_paths:
        if os.path.exists(path):
            print(f"✓ Chrome found at: {path}")
            chrome_found = True
            chrome_path = path
            break
    
    if not chrome_found:
        print("✗ Chrome not found in standard locations")
        print("Searched paths:")
        for path in chrome_paths:
            print(f"  {path}: {'exists' if os.path.exists(path) else 'not found'}")
        return False
    
    # Try to get Chrome version
    try:
        result = subprocess.run([chrome_path, '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"Chrome version: {result.stdout.strip()}")
        else:
            print(f"Chrome version check failed: {result.stderr}")
    except Exception as e:
        print(f"Could not get Chrome version: {e}")
    
    return True


def check_chromedriver_installation():
    """Check ChromeDriver installation"""
    print("\n=== ChromeDriver Installation Check ===")
    
    chromedriver_paths = [
        '/usr/local/bin/chromedriver',
        '/usr/bin/chromedriver',
        '/snap/bin/chromedriver',
    ]
    
    chromedriver_found = False
    chromedriver_path = None
    
    for path in chromedriver_paths:
        if os.path.exists(path):
            print(f"✓ ChromeDriver found at: {path}")
            chromedriver_found = True
            chromedriver_path = path
            break
    
    if not chromedriver_found:
        print("✗ ChromeDriver not found in standard locations")
        print("Searched paths:")
        for path in chromedriver_paths:
            print(f"  {path}: {'exists' if os.path.exists(path) else 'not found'}")
        return False
    
    # Try to get ChromeDriver version
    try:
        result = subprocess.run([chromedriver_path, '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"ChromeDriver version: {result.stdout.strip()}")
        else:
            print(f"ChromeDriver version check failed: {result.stderr}")
    except Exception as e:
        print(f"Could not get ChromeDriver version: {e}")
    
    return True


def test_selenium_import():
    """Test if Selenium can be imported"""
    print("\n=== Selenium Import Test ===")
    
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        print("✓ Selenium imports successful")
        return True
    except ImportError as e:
        print(f"✗ Selenium import failed: {e}")
        return False


def test_webdriver_manager():
    """Test WebDriverManager"""
    print("\n=== WebDriverManager Test ===")
    
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        print("✓ WebDriverManager import successful")
        
        # Try to get driver path (don't download, just check)
        print("Testing driver path resolution...")
        manager = ChromeDriverManager()
        print("✓ ChromeDriverManager initialized")
        return True
    except ImportError as e:
        print(f"✗ WebDriverManager import failed: {e}")
        return False
    except Exception as e:
        print(f"⚠ WebDriverManager test failed: {e}")
        return False


def test_basic_selenium():
    """Test basic Selenium functionality"""
    print("\n=== Basic Selenium Test ===")
    
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        
        print("Creating Chrome WebDriver...")
        driver = webdriver.Chrome(options=options)
        
        print("✓ WebDriver created successfully")
        
        print("Testing navigation...")
        driver.get("data:text/html,<html><body><h1>Test</h1></body></html>")
        
        title = driver.title
        print(f"✓ Navigation successful, title: {title}")
        
        driver.quit()
        print("✓ WebDriver closed successfully")
        
        return True
        
    except Exception as e:
        print(f"✗ Basic Selenium test failed: {e}")
        return False


def main():
    """Run all checks"""
    print("Chrome and Selenium Environment Checker")
    print("=" * 50)
    
    results = {
        'environment': check_environment(),
        'chrome': check_chrome_installation(),
        'chromedriver': check_chromedriver_installation(),
        'selenium': test_selenium_import(),
        'webdriver_manager': test_webdriver_manager(),
        'basic_selenium': False,  # Will test if other checks pass
    }
    
    # Only test Selenium if Chrome and ChromeDriver are available
    if results['chrome'] and results['chromedriver'] and results['selenium']:
        results['basic_selenium'] = test_basic_selenium()
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"Checks passed: {passed}/{total}")
    
    for check, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {check}: {status}")
    
    if results['chrome'] and results['chromedriver']:
        print("\n✓ Chrome and ChromeDriver are available - browser automation should work")
    else:
        print("\n⚠ Chrome or ChromeDriver missing - fallback methods will be used")
    
    return 0 if passed >= 3 else 1  # Allow some failures


if __name__ == "__main__":
    sys.exit(main())
