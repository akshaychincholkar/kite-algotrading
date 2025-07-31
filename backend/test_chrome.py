#!/usr/bin/env python3
"""
Test script to verify Chrome and Selenium setup in production environment.
Run this script to test if Chrome is working properly.
"""

import os
import sys
import uuid
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_chrome_options():
    """Get Chrome options for testing"""
    chrome_options = Options()
    
    # Create unique user data directory
    unique_id = str(uuid.uuid4())
    user_data_dir = f"/tmp/chrome-test-{unique_id}"
    
    # Production settings
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
    chrome_options.add_argument("--remote-debugging-port=0")
    
    # Set binary location if in production
    if os.path.exists('/usr/bin/google-chrome'):
        chrome_options.binary_location = "/usr/bin/google-chrome"
    
    return chrome_options, user_data_dir

def test_chrome_basic():
    """Test basic Chrome functionality"""
    print("=" * 50)
    print("Testing Basic Chrome Setup")
    print("=" * 50)
    
    # Check if Chrome binary exists
    chrome_paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable']
    chrome_found = False
    
    for path in chrome_paths:
        if os.path.exists(path):
            print(f"✓ Chrome binary found at: {path}")
            chrome_found = True
            break
    
    if not chrome_found:
        print("✗ Chrome binary not found in standard locations")
        return False
    
    # Check ChromeDriver
    chromedriver_paths = ['/usr/local/bin/chromedriver', '/usr/bin/chromedriver']
    chromedriver_found = False
    
    for path in chromedriver_paths:
        if os.path.exists(path):
            print(f"✓ ChromeDriver found at: {path}")
            chromedriver_found = True
            break
    
    if not chromedriver_found:
        print("✗ ChromeDriver not found in standard locations")
        return False
    
    return True

def test_selenium_basic():
    """Test basic Selenium functionality"""
    print("\n" + "=" * 50)
    print("Testing Selenium WebDriver")
    print("=" * 50)
    
    chrome_options, user_data_dir = None, None
    driver = None
    
    try:
        chrome_options, user_data_dir = get_chrome_options()
        
        # Create service if chromedriver exists
        service = None
        if os.path.exists('/usr/local/bin/chromedriver'):
            service = Service('/usr/local/bin/chromedriver')
        
        print(f"Creating WebDriver with user data dir: {user_data_dir}")
        
        if service:
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            driver = webdriver.Chrome(options=chrome_options)
        
        print("✓ WebDriver created successfully")
        
        # Test navigation to a simple page
        print("Testing navigation to Google...")
        driver.get("https://www.google.com")
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        title = driver.title
        print(f"✓ Successfully navigated to page. Title: {title}")
        
        return True
        
    except Exception as e:
        print(f"✗ Selenium test failed: {e}")
        return False
        
    finally:
        if driver:
            try:
                driver.quit()
                print("✓ WebDriver closed successfully")
            except Exception as e:
                print(f"Warning: Error closing driver: {e}")
        
        # Cleanup
        if user_data_dir and os.path.exists(user_data_dir):
            try:
                shutil.rmtree(user_data_dir)
                print(f"✓ Cleaned up user data directory: {user_data_dir}")
            except Exception as e:
                print(f"Warning: Could not clean up {user_data_dir}: {e}")

def test_chartink_access():
    """Test access to ChartInk website"""
    print("\n" + "=" * 50)
    print("Testing ChartInk Access")
    print("=" * 50)
    
    chrome_options, user_data_dir = None, None
    driver = None
    
    try:
        chrome_options, user_data_dir = get_chrome_options()
        
        service = None
        if os.path.exists('/usr/local/bin/chromedriver'):
            service = Service('/usr/local/bin/chromedriver')
        
        if service:
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            driver = webdriver.Chrome(options=chrome_options)
        
        print("Testing access to ChartInk...")
        driver.get("https://chartink.com/")
        
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        title = driver.title
        print(f"✓ Successfully accessed ChartInk. Title: {title}")
        
        return True
        
    except Exception as e:
        print(f"✗ ChartInk access test failed: {e}")
        return False
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass
        
        if user_data_dir and os.path.exists(user_data_dir):
            try:
                shutil.rmtree(user_data_dir)
            except:
                pass

def main():
    """Run all tests"""
    print("Chrome and Selenium Setup Test")
    print("==============================")
    
    # Environment info
    print(f"Python version: {sys.version}")
    print(f"Operating System: {os.name}")
    print(f"Environment variables:")
    env_vars = ['RENDER', 'RAILWAY_ENVIRONMENT', 'HEROKU_APP_NAME']
    for var in env_vars:
        value = os.environ.get(var, 'Not set')
        print(f"  {var}: {value}")
    
    # Run tests
    tests_passed = 0
    total_tests = 3
    
    if test_chrome_basic():
        tests_passed += 1
    
    if test_selenium_basic():
        tests_passed += 1
    
    if test_chartink_access():
        tests_passed += 1
    
    # Results
    print("\n" + "=" * 50)
    print("TEST RESULTS")
    print("=" * 50)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✓ All tests passed! Chrome and Selenium are working correctly.")
        return 0
    else:
        print("✗ Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
