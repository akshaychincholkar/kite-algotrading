


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


def setup_driver():
    """Setup Chrome WebDriver with enhanced options"""
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--headless')  # Run in headless mode
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Selenium-wire options
    seleniumwire_options = {
        'verify_ssl': False,
        'suppress_connection_errors': False,
        'disable_encoding': True
    }
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(
        service=service,
        options=chrome_options,
        seleniumwire_options=seleniumwire_options
    )
    
    # Hide automation traces
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver


def wait_and_capture_requests(driver, wait_time=30):
    """Wait for requests and capture scan_clause"""
    print(f"Waiting {wait_time} seconds for network activity...")
    print("Running in headless mode - monitoring automatically...")
    
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
                        print(f"\n🎯 Found scan_clause in request to: {request.url}")
                        # print(f"Method: {request.method}")
                        # print(f"Headers: {dict(request.headers)}")
                        
                        # Extract scan_clause
                        scan_clause = extract_scan_clause_from_body(body_str, request.headers)
                        
                        if scan_clause:
                            print(f"\n{'='*60}")
                            print("✅ SCAN CLAUSE PAYLOAD CAPTURED:")
                            print(f"{'='*60}")
                            print(scan_clause)
                            print(f"{'='*60}")
                            
                            # Save to file
                            # with open('c:\\workspace\\python\\kite\\screener_sample\\captured_scan_clause.txt', 'w', encoding='utf-8') as f:
                            #     f.write(scan_clause)
                            # print("✅ Saved to captured_scan_clause.txt")
                            
                            return scan_clause
                            
                except Exception as e:
                    continue
        
        time.sleep(2)
        remaining = wait_time - (time.time() - start_time)
        if remaining > 0:
            print(f"⏱️  Still monitoring... {remaining:.0f}s remaining")
    
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
        print(f"Error extracting scan_clause: {e}")
    
    return None


def try_auto_scan(driver):
    """Try to automatically trigger the scan"""
    try:
        print("🔍 Looking for scan triggers...")
        
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
                        print(f"🎯 Found potential scan trigger: '{element.text}' or tag: {element.tag_name}")
                        try:
                            # Scroll to element
                            driver.execute_script("arguments[0].scrollIntoView(true);", element)
                            time.sleep(1)
                            
                            # Try click
                            element.click()
                            print("✅ Successfully clicked scan trigger!")
                            return True
                            
                        except Exception as click_error:
                            try:
                                # Try JavaScript click
                                driver.execute_script("arguments[0].click();", element)
                                print("✅ Successfully JavaScript clicked scan trigger!")
                                return True
                            except:
                                continue
            except:
                continue
        
        print("⚠️  No clickable scan triggers found. Scan might be automatic.")
        return False
        
    except Exception as e:
        print(f"❌ Error in auto scan: {e}")
        return False


def open_chartink_browser_and_print_scan_clause(scanner_name):
    """Main function"""
    url = f"https://chartink.com/screener/{scanner_name}"
    print(f"🚀 Starting enhanced Chartink screener for: {url}")
    
    driver = setup_driver()
    
    try:
        # Navigate to page
        print("📱 Loading page...")
        driver.get(url)
        time.sleep(5)
        
        # Clear any pre-existing requests
        del driver.requests
        
        # Try to trigger scan automatically
        try_auto_scan(driver)
        
        # Wait and monitor for requests
        scan_clause = wait_and_capture_requests(driver, wait_time=45)
        
        if not scan_clause:
            print("\n❌ No scan_clause found in network traffic.")
            print("\nDebugging info:")
            print(f"Total requests captured: {len(driver.requests)}")
            
            chartink_requests = [req for req in driver.requests if 'chartink.com' in req.url]
            print(f"Chartink requests: {len(chartink_requests)}")
            
            for req in chartink_requests[:10]:  # Show first 10
                print(f"  - {req.method} {req.url}")
                if req.body:
                    try:
                        body_preview = req.body.decode('utf-8')[:100]
                        print(f"    Body preview: {body_preview}...")
                    except:
                        pass
        else:
            print(f"\n🎉 Successfully captured scan_clause!")
            driver.quit()
            return scan_clause
    except Exception as e:
        driver.quit()
        print(f"❌ Error: {e}")
        
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
