from playwright.sync_api import sync_playwright

def verify_camera():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            page.wait_for_selector("text=Reset View", timeout=10000)

            # Click Reset View
            page.click("text=Reset View")
            page.wait_for_timeout(1000)

            # Take screenshot
            page.screenshot(path="verification_camera.png")
            print("Screenshot captured: verification_camera.png")
        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_camera()
