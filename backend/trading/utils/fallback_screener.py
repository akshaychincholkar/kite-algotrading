"""
Fallback screener implementation that works without browser automation.
This is used when Chrome/Selenium is not available in production.
"""

import requests
import json
import re
from bs4 import BeautifulSoup


class FallbackScreener:
    """
    Fallback screener that tries to extract data without browser automation
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def try_extract_scan_clause(self, screener_name):
        """
        Try to extract scan clause without browser automation
        """
        try:
            url = f"https://chartink.com/screener/{screener_name}"
            print(f"Attempting HTTP-based extraction from: {url}")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            # Parse the HTML to look for scan clause
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Method 1: Look for scan clause in script tags
            scan_clause = self._extract_from_scripts(soup)
            if scan_clause:
                return scan_clause
            
            # Method 2: Look for scan clause in meta tags
            scan_clause = self._extract_from_meta(soup)
            if scan_clause:
                return scan_clause
            
            # Method 3: Look for scan clause in form inputs
            scan_clause = self._extract_from_forms(soup)
            if scan_clause:
                return scan_clause
            
            print("Could not extract scan clause using HTTP methods")
            return None
            
        except Exception as e:
            print(f"HTTP-based extraction failed: {e}")
            return None
    
    def _extract_from_scripts(self, soup):
        """Extract scan clause from JavaScript code"""
        try:
            script_tags = soup.find_all('script')
            for script in script_tags:
                if script.string:
                    content = script.string
                    # Look for scan_clause pattern
                    patterns = [
                        r'scan_clause["\']?\s*[:=]\s*["\']([^"\']+)["\']',
                        r'scanClause["\']?\s*[:=]\s*["\']([^"\']+)["\']',
                        r'"scan_clause"\s*:\s*"([^"]+)"',
                        r"'scan_clause'\s*:\s*'([^']+)'",
                    ]
                    
                    for pattern in patterns:
                        match = re.search(pattern, content, re.IGNORECASE)
                        if match:
                            scan_clause = match.group(1)
                            print(f"Found scan clause in script: {scan_clause[:100]}...")
                            return scan_clause
            return None
        except Exception as e:
            print(f"Error extracting from scripts: {e}")
            return None
    
    def _extract_from_meta(self, soup):
        """Extract scan clause from meta tags"""
        try:
            meta_tags = soup.find_all('meta')
            for meta in meta_tags:
                name = meta.get('name', '')
                content = meta.get('content', '')
                if 'scan' in name.lower() or 'clause' in name.lower():
                    if content:
                        print(f"Found scan clause in meta tag: {content[:100]}...")
                        return content
            return None
        except Exception as e:
            print(f"Error extracting from meta tags: {e}")
            return None
    
    def _extract_from_forms(self, soup):
        """Extract scan clause from form inputs"""
        try:
            inputs = soup.find_all('input')
            textareas = soup.find_all('textarea')
            
            for element in inputs + textareas:
                name = element.get('name', '')
                value = element.get('value', '')
                placeholder = element.get('placeholder', '')
                
                if any(keyword in attr.lower() for attr in [name, placeholder] for keyword in ['scan', 'clause', 'query']):
                    if value:
                        print(f"Found scan clause in form element: {value[:100]}...")
                        return value
            
            return None
        except Exception as e:
            print(f"Error extracting from forms: {e}")
            return None


def fallback_get_scan_clause(screener_name):
    """
    Fallback function to get scan clause without browser automation
    """
    print(f"Using fallback method for screener: {screener_name}")
    
    fallback = FallbackScreener()
    scan_clause = fallback.try_extract_scan_clause(screener_name)
    
    if scan_clause:
        print(f"Successfully extracted scan clause using fallback method")
        return scan_clause
    else:
        print("Fallback method could not extract scan clause")
        return None
