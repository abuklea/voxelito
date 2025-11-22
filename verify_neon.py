"""
Verification script for the Neon UI components.
Uses Playwright to launch the browser, verify the neon logo, and capture screenshots.
"""
from playwright.sync_api import sync_playwright
import time

def verify_neon_ui():
    """
    Verifies the presence and rendering of the Neon Logo component.
    Captures screenshots of the logo and the full page.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:5173")

            # Wait for the app to load and the neon logo container
            page.wait_for_selector(".neon-logo-container", timeout=10000)

            # Take a screenshot of the neon logo area specifically
            logo = page.locator(".neon-logo-container")
            logo.screenshot(path="verification_neon_logo.png")

            # Take a full page screenshot
            page.screenshot(path="verification_neon_full.png")
            print("Screenshots captured: verification_neon_logo.png, verification_neon_full.png")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_neon_ui()
