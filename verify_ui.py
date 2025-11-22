"""
General UI verification script.
Checks if the main application components (header, chat popup) are loading correctly.
"""
from playwright.sync_api import sync_playwright
import time

def verify_ui():
    """
    Launches the application in a headless browser and performs a sanity check on the UI.
    Verifies the presence of the 'VOXELVERSE' text and the CopilotKit chat button.
    Takes a screenshot upon success.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:5173")

            # Wait for the app to load (check for VoxelVerse header)
            page.wait_for_selector("text=VOXELVERSE", timeout=10000)

            # Wait for the chat popup to be visible (CopilotKit)
            page.wait_for_selector(".copilotKitButton", timeout=10000)

            # Click the chat button to open the popup
            page.click(".copilotKitButton")

            # Wait for the popup to open
            page.wait_for_selector(".copilotKitPopup", timeout=5000)

            # Take a screenshot of the entire UI with the open chat
            page.screenshot(path="verification.png")
            print("Screenshot captured: verification.png")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
