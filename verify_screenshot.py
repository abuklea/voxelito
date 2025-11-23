from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader', '--use-gl=swiftshader', '--ignore-gpu-blocklist'])
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.wait_for_timeout(5000)

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

        page.screenshot(path="docs/screenshots/verification_final.png")
        print("Screenshot taken")
        browser.close()

if __name__ == "__main__":
    run()
