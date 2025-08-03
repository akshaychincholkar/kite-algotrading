import logging
from seleniumwire import webdriver
from selenium.webdriver.chrome.options import Options
import time
import urllib.parse
import time
import json
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from urllib.parse import parse_qs, unquote

# Get logger for chartink module
logger = logging.getLogger('chartink')


def setup_driver():
    """Setup Chrome WebDriver with enhanced options"""
    import os
    import logging
    logger = logging.getLogger('chartink')
    
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--headless')  # Run in headless mode
    chrome_options.add_argument('--disable-gpu')  # Additional for production
    chrome_options.add_argument('--remote-debugging-port=9222')  # Additional for production
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--allow-running-insecure-content')
    chrome_options.add_argument('--disable-features=VizDisplayCompositor')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Production environment detection
    is_production = any([
        os.environ.get('RENDER'),
        os.environ.get('RAILWAY_PROJECT_ID'), 
        os.environ.get('HEROKU_APP_NAME'),
        '/app' in os.getcwd(),  # Heroku/Render indicator
    ])
    
    # Set Chrome binary path for production
    if is_production:
        chrome_paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/opt/google/chrome/chrome',
            os.environ.get('GOOGLE_CHROME_BIN'),
        ]
        
        chrome_binary = None
        for path in chrome_paths:
            if path and os.path.exists(path):
                chrome_binary = path
                logger.info(f"Found Chrome binary at: {path}")
                break
        
        if chrome_binary:
            chrome_options.binary_location = chrome_binary
        else:
            logger.error("Chrome binary not found in production environment")
            # Log available paths for debugging
            for path in chrome_paths:
                if path:
                    logger.info(f"Checked path: {path} - exists: {os.path.exists(path) if path else False}")
    
    # Selenium-wire options
    seleniumwire_options = {
        'verify_ssl': False,
        'suppress_connection_errors': False,
        'disable_encoding': True
    }
    
    # Set up ChromeDriver service
    try:
        if is_production:
            # Try to use system ChromeDriver first
            chromedriver_paths = [
                '/usr/local/bin/chromedriver',
                '/usr/bin/chromedriver',
                '/opt/chromedriver/chromedriver',
                os.environ.get('CHROMEDRIVER_PATH'),
            ]
            
            chromedriver_binary = None
            for path in chromedriver_paths:
                if path and os.path.exists(path):
                    chromedriver_binary = path
                    logger.info(f"Found ChromeDriver at: {path}")
                    break
            
            if chromedriver_binary:
                service = Service(chromedriver_binary)
                logger.info("Using system ChromeDriver for production")
            else:
                logger.warning("System ChromeDriver not found, falling back to WebDriverManager")
                service = Service(ChromeDriverManager().install())
        else:
            # Use WebDriverManager in development
            service = Service(ChromeDriverManager().install())
            logger.info("Using WebDriverManager for development")
        
        driver = webdriver.Chrome(
            service=service,
            options=chrome_options,
            seleniumwire_options=seleniumwire_options
        )
        
        # Hide automation traces
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
        
    except Exception as e:
        logger.error(f"Failed to create Chrome WebDriver: {e}")
        # In production, don't fallback to avoid worker timeout
        if is_production:
            raise Exception(f"Chrome WebDriver setup failed in production: {e}")
        else:
            raise e


def wait_and_capture_requests(driver, wait_time=30):
    """Wait for requests and capture scan_clause"""
    logger.info(f"Waiting {wait_time} seconds for network activity...")
    logger.info("Running in headless mode - monitoring automatically...")
    
    start_time = time.time()
    scan_clause_found = None
    
    while time.time() - start_time < wait_time:
        # Check requests every 2 seconds
        for request in driver.requests:
            if 'chartink.com' in request.url and request.body:
                try:
                    body_str = request.body.decode('utf-8')
                    
                    # Look for scan_clause in any form
                    if 'scan_clause' in body_str:
                        logger.info(f"\n🎯 Found scan_clause in request to: {request.url}")
                        # logger.debug(f"Method: {request.method}")
                        # logger.debug(f"Headers: {dict(request.headers)}")
                        
                        # Extract scan_clause
                        scan_clause = extract_scan_clause_from_body(body_str, request.headers)
                        
                        if scan_clause:
                            logger.info(f"\n{'='*60}")
                            logger.info("✅ SCAN CLAUSE PAYLOAD CAPTURED:")
                            logger.info(f"{'='*60}")
                            logger.info(scan_clause)
                            logger.info(f"{'='*60}")
                            
                            # Save to file
                            # with open('c:\\workspace\\python\\kite\\screener_sample\\captured_scan_clause.txt', 'w', encoding='utf-8') as f:
                            #     f.write(scan_clause)
                            # logger.info("✅ Saved to captured_scan_clause.txt")
                            
                            return scan_clause
                            
                except Exception as e:
                    continue
        
        time.sleep(2)
        remaining = wait_time - (time.time() - start_time)
        if remaining > 0:
            logger.debug(f"⏱️  Still monitoring... {remaining:.0f}s remaining")
    
    return scan_clause_found


def extract_scan_clause_from_body(body_str, headers):
    """Extract scan_clause from request body"""
    try:
        content_type = str(headers.get('content-type', '')).lower()
        
        # Method 1: URL-encoded form data
        if 'application/x-www-form-urlencoded' in content_type:
            parsed_data = parse_qs(body_str)
            if 'scan_clause' in parsed_data:
                return unquote(parsed_data['scan_clause'][0])
        
        # Method 2: JSON data
        elif 'application/json' in content_type:
            json_data = json.loads(body_str)
            return json_data.get('scan_clause')
        
        # Method 3: Direct string search for scan_clause=
        if 'scan_clause=' in body_str:
            import re
            pattern = r'scan_clause=([^&\n\r]*)'
            match = re.search(pattern, body_str)
            if match:
                return unquote(match.group(1))
        
        # Method 4: JSON-like pattern in string
        if 'scan_clause' in body_str:
            import re
            # Look for "scan_clause":"value" or 'scan_clause':'value'
            patterns = [
                r'"scan_clause"\s*:\s*"([^"]*)"',
                r"'scan_clause'\s*:\s*'([^']*)'",
                r'scan_clause\s*:\s*"([^"]*)"',
                r'scan_clause\s*:\s*\'([^\']*)\''
            ]
            
            for pattern in patterns:
                match = re.search(pattern, body_str)
                if match:
                    return match.group(1)
    
    except Exception as e:
        logger.error(f"Error extracting scan_clause: {e}")
    
    return None


def try_auto_scan(driver):
    """Try to automatically trigger the scan"""
    try:
        logger.info("🔍 Looking for scan triggers...")
        
        # Wait for page to settle
        time.sleep(3)
        
        # Scroll down to load any lazy content
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        driver.execute_script("window.scrollTo(0, 0);")
        time.sleep(1)
        
        # Look for various button types
        button_selectors = [
            "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'scan')]",
            "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'run')]",
            "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'search')]",
            "//input[@type='submit']",
            "//button[@type='submit']",
            "//button[contains(@class, 'btn')]",
            "//a[contains(@href, 'scan') or contains(@onclick, 'scan')]"
        ]
        
        for selector in button_selectors:
            try:
                elements = driver.find_elements(By.XPATH, selector)
                for element in elements:
                    if element.is_displayed() and element.is_enabled():
                        logger.info(f"🎯 Found potential scan trigger: '{element.text}' or tag: {element.tag_name}")
                        try:
                            # Scroll to element
                            driver.execute_script("arguments[0].scrollIntoView(true);", element)
                            time.sleep(1)
                            
                            # Try click
                            element.click()
                            logger.info("✅ Successfully clicked scan trigger!")
                            return True
                            
                        except Exception as click_error:
                            try:
                                # Try JavaScript click
                                driver.execute_script("arguments[0].click();", element)
                                logger.info("✅ Successfully JavaScript clicked scan trigger!")
                                return True
                            except:
                                continue
            except:
                continue
        
        logger.warning("⚠️  No clickable scan triggers found. Scan might be automatic.")
        return False
        
    except Exception as e:
        logger.error(f"❌ Error in auto scan: {e}")
        return False


def open_chartink_browser_and_print_scan_clause(scanner_name):
    """Main function with timeout protection"""
    import signal
    import logging
    import os
    logger = logging.getLogger('chartink')
    
    url = f"https://chartink.com/screener/{scanner_name}"
    logger.info(f"🚀 Starting enhanced Chartink screener for: {url}")
    
    # Set up timeout handler
    def timeout_handler(signum, frame):
        raise TimeoutError("Browser automation timed out")
    
    # Production environment detection
    is_production = any([
        os.environ.get('RENDER'),
        os.environ.get('RAILWAY_PROJECT_ID'), 
        os.environ.get('HEROKU_APP_NAME'),
    ])
    
    # Set shorter timeout for production to avoid worker timeouts
    timeout_seconds = 20 if is_production else 45
    
    driver = None
    try:
        # Set timeout alarm
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout_seconds)
        
        driver = setup_driver()
        
        # Navigate to page
        logger.info("📱 Loading page...")
        driver.get(url)
        time.sleep(3)  # Reduced wait time for production
        
        # Clear any pre-existing requests
        del driver.requests
        
        # Try to trigger scan automatically
        try_auto_scan(driver)
        
        # Wait and monitor for requests (shorter time for production)
        scan_clause = wait_and_capture_requests(driver, wait_time=15 if is_production else 30)
        
        # Disable alarm
        signal.alarm(0)
        
        if not scan_clause:
            logger.warning("\n❌ No scan_clause found in network traffic.")
            logger.info("\nDebugging info:")
            logger.info(f"Total requests captured: {len(driver.requests) if driver.requests else 0}")
            
            if driver.requests:
                chartink_requests = [req for req in driver.requests if 'chartink.com' in req.url]
                logger.info(f"Chartink requests: {len(chartink_requests)}")
                
                for req in chartink_requests[:5]:  # Show first 5 only
                    logger.debug(f"  - {req.method} {req.url}")
        else:
            logger.info(f"\n🎉 Successfully captured scan_clause!")
            return scan_clause
            
    except TimeoutError:
        logger.error(f"❌ Browser automation timed out after {timeout_seconds} seconds")
        signal.alarm(0)  # Disable alarm
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        signal.alarm(0)  # Disable alarm
    finally:
        if driver:
            try:
                driver.quit()
                logger.info("🔄 Browser closed")
            except:
                pass
    
    return None
        
    # finally:
    #     print("\n🔄 Closing browser...")
    #     driver.quit()
    #     print("✅ Browser closed. Script completed.")


# if __name__ == "__main__":
#     main()




# def open_chartink_browser_and_print_scan_clause(scanner_name):
#     """
#     Opens the Chartink screener URL in a browser, intercepts the /backtest/process request,
#     prints the scan_clause from the payload, and keeps the browser open for 10 seconds.
#     """
#     screener_url = f"https://chartink.com/screener/{scanner_name}"
#     chrome_options = Options()
#     # Run in headless mode so the browser window does not open
#     chrome_options.add_argument("--headless")
#     driver = webdriver.Chrome(options=chrome_options)
#     driver.get(screener_url)
#     scan_clause = None
#     # Wait for network requests to be made
#     for _ in range(5):
#         for request in driver.requests:
#             if request.method == 'POST' and 'backtest/process' in request.url:
#                 if request.body:
#                     body = request.body.decode('utf-8')
#                     params = urllib.parse.parse_qs(body)
#                     if 'scan_clause' in params:
#                         scan_clause = params['scan_clause'][0]
#                         print("scan_clause:", scan_clause)
#                         return scan_clause
#         if scan_clause:
#             return scan_clause
#         time.sleep(1)
#     if not scan_clause:
#         print("scan_clause not found in network requests.")
#         driver.quit()
#         return scan_clause
#     driver.quit()

# Example usage:
# open_chartink_browser_and_print_scan_clause("https://chartink.com/screener/bittu-daily-trading")
