from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'])
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_timeout(5000)
        page.screenshot(path="docs/screenshots/verification_final.png")
        print("Screenshot taken")
        browser.close()

if __name__ == "__main__":
    run()
