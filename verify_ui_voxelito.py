"""
Specific UI verification script for the 'Voxelito' branding.
"""
from playwright.sync_api import sync_playwright
import time

def verify_ui():
    """
    Verifies that the application loads with the correct 'Voxelito' branding.
    Waits for the network to be idle and checks for the presence of the chat button.
    Captures a screenshot.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the app
            page.goto("http://localhost:5173")

            # Wait for the app to load (check for VOXELITO header)
            # It seems the text is "Voxelito" and inside SVG, so just check for SVG text or any content
            # page.wait_for_selector("text=Voxelito", timeout=10000)
            # Let's wait for the root element or canvas
            # page.wait_for_selector("#root", timeout=10000)

            # Just wait for the body to be loaded
            page.wait_for_load_state("networkidle")

            # Wait for the chat popup to be visible (CopilotKit)
            # The class might be different or inside shadow DOM.
            # Let's try waiting for a button generically
            page.wait_for_selector("button", timeout=10000)

            # Click the chat button to open the popup
            page.click(".copilotKitButton")

            # Wait for the popup to open and check for the title "Voxelito"
            page.wait_for_selector("text=Voxelito", timeout=5000)

            # Take a screenshot of the entire UI with the open chat

            # Adjust camera to see the full scene
            page.evaluate("""
                if (window.voxelWorld) {
                    window.voxelWorld.camera.position.set(0, 60, 60);
                    window.voxelWorld.controls.target.set(0, 0, 0);
                    window.voxelWorld.controls.update();
                    window.voxelWorld.requestRender();
                }
            """)
            page.wait_for_timeout(1000)

            page.screenshot(path="verification_voxelito.png")
            print("Screenshot captured: verification_voxelito.png")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
