


import os
import uuid
import shutil
from seleniumwire import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import time
import urllib.parse


def get_chrome_options():
    """Get Chrome options optimized for production environments with unique user data directory"""
    chrome_options = Options()
    
    # Create unique user data directory for each session
    unique_id = str(uuid.uuid4())
    user_data_dir = f"/tmp/chrome-user-data-{unique_id}"
    
    # Essential arguments for production
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--disable-background-timer-throttling")
    chrome_options.add_argument("--disable-backgrounding-occluded-windows")
    chrome_options.add_argument("--disable-renderer-backgrounding")
    chrome_options.add_argument("--disable-features=TranslateUI")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-plugins")
    chrome_options.add_argument("--disable-default-apps")
    chrome_options.add_argument("--disable-sync")
    chrome_options.add_argument("--disable-translate")
    chrome_options.add_argument("--hide-scrollbars")
    chrome_options.add_argument("--metrics-recording-only")
    chrome_options.add_argument("--mute-audio")
    chrome_options.add_argument("--no-first-run")
    chrome_options.add_argument("--safebrowsing-disable-auto-update")
    chrome_options.add_argument("--disable-logging")
    chrome_options.add_argument("--disable-permissions-api")
    chrome_options.add_argument("--disable-presentation-api")
    chrome_options.add_argument("--disable-print-preview")
    chrome_options.add_argument("--disable-speech-api")
    chrome_options.add_argument("--disable-file-system")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--remote-debugging-port=0")  # Use random port
    
    # Use unique user data directory
    chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
    
    # Set user agent
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    # Production environment settings
    if os.environ.get('RENDER') or os.environ.get('RAILWAY_ENVIRONMENT') or os.path.exists('/usr/bin/google-chrome'):
        chrome_options.binary_location = "/usr/bin/google-chrome"
    
    return chrome_options, user_data_dir


def cleanup_user_data_dir(user_data_dir):
    """Clean up the temporary user data directory"""
    try:
        if os.path.exists(user_data_dir):
            shutil.rmtree(user_data_dir)
            print(f"Cleaned up user data directory: {user_data_dir}")
    except Exception as e:
        print(f"Warning: Could not clean up user data directory {user_data_dir}: {e}")


def open_chartink_browser_and_print_scan_clause(scanner_name):
    """
    Opens the Chartink screener URL in a browser, intercepts the /backtest/process request,
    prints the scan_clause from the payload, and keeps the browser open for 10 seconds.
    Enhanced with unique session handling and proper cleanup.
    """
    chrome_options, user_data_dir = None, None
    driver = None
    
    try:
        # Get Chrome options with unique user data directory
        chrome_options, user_data_dir = get_chrome_options()
        
        print(f"Creating Chrome session for screener: {scanner_name}")
        print(f"Using user data directory: {user_data_dir}")
        
        # Create ChromeDriver service if chromedriver path exists
        service = None
        if os.path.exists('/usr/local/bin/chromedriver'):
            service = Service('/usr/local/bin/chromedriver')
        
        # Create driver with options
        if service:
            driver = webdriver.Chrome(service=service, options=chrome_options)
        else:
            driver = webdriver.Chrome(options=chrome_options)
        
        print("Successfully created Chrome WebDriver")
        
        # Set timeouts
        driver.set_page_load_timeout(30)
        driver.implicitly_wait(10)
        
        screener_url = f"https://chartink.com/screener/{scanner_name}"
        print(f"Navigating to: {screener_url}")
        driver.get(screener_url)
        
        scan_clause = None
        # Wait for network requests to be made
        for attempt in range(5):
            print(f"Checking network requests (attempt {attempt + 1}/5)...")
            for request in driver.requests:
                if request.method == 'POST' and 'backtest/process' in request.url:
                    if request.body:
                        body = request.body.decode('utf-8')
                        params = urllib.parse.parse_qs(body)
                        if 'scan_clause' in params:
                            scan_clause = params['scan_clause'][0]
                            print(f"Found scan_clause: {scan_clause}")
                            return scan_clause
            
            if scan_clause:
                return scan_clause
            time.sleep(2)  # Increased wait time
        
        if not scan_clause:
            print("scan_clause not found in network requests.")
            return ""
        
        return scan_clause
        
    except Exception as e:
        print(f"Error in browser automation for {scanner_name}: {e}")
        raise Exception(f"Browser automation failed: {e}")
        
    finally:
        # Cleanup
        if driver:
            try:
                driver.quit()
                print("Chrome driver session closed")
            except Exception as e:
                print(f"Error closing driver: {e}")
        
        # Clean up user data directory
        if user_data_dir:
            cleanup_user_data_dir(user_data_dir)

# Example usage:
# open_chartink_browser_and_print_scan_clause("https://chartink.com/screener/bittu-daily-trading")
