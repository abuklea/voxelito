import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('Complex Scene Generation', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('generate complex castle and screenshot', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout

    // Listen for console logs
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', exception => console.log(`BROWSER ERROR: ${exception}`));

    console.log('Starting complex scene test...');
    await page.goto('http://localhost:5173');

    // Wait for the app to stabilize
    await page.waitForTimeout(5000);

    const chatButton = page.locator('.copilotKitButton');
    // Wait for button to be attached
    await chatButton.waitFor({ state: 'attached', timeout: 30000 });

    if (await chatButton.isVisible()) {
        await chatButton.click();
    } else {
        console.log("Chat button not visible, maybe already open?");
    }

    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });

    const prompt = "Create a detailed medieval castle with high stone walls, four corner towers, a central keep, and a moat surrounding it.";
    await chatInput.fill(prompt);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_scene_1_input.png') });
    await chatInput.press('Enter');

    // Wait for response and rendering
    console.log('Waiting for scene generation...');

    // Wait for the explicit success log from the App
    const consolePromise = page.waitForEvent('console', msg => msg.text().includes('Valid scene data received'));

    // Also wait for scene objects to populate, but ensure we got the data first
    await consolePromise;
    console.log('Scene data received by frontend.');

    // Wait for meshing worker to finish (give it some time)
    await page.waitForTimeout(10000);

    console.log('Scene generated.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_scene_2_response.png') });

    // Extra wait for mesh generation to fully settle
    await page.waitForTimeout(5000);

    // Zoom out to see the full model
    console.log('Zooming out...');
    await page.evaluate(() => {
        // @ts-ignore
        if (window.voxelWorld) {
            // @ts-ignore
            // Set camera position further back and up
            window.voxelWorld.camera.position.set(0, 100, 100); // Further out to ensure full visibility
            // @ts-ignore
            window.voxelWorld.controls.target.set(0, 0, 0); // Look at origin
            // @ts-ignore
            window.voxelWorld.controls.update();
            // @ts-ignore
            window.voxelWorld.requestRender();
        }
    });

    // Wait for camera move to settle
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_scene_3_zoomed_out.png') });

    // Enable auto-rotate for multiple angles
    console.log('Enabling auto-rotate...');
    await page.evaluate(() => {
        // @ts-ignore
        if (window.voxelWorld) {
            // @ts-ignore
            window.voxelWorld.setAutoRotate(true);
        }
    });

    // Take sequence of screenshots to capture different angles
    // Since auto-rotate speed is default 2.0 (approx 30 seconds per rotation),
    // we wait a bit between shots.
    for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(5000); // Wait 5 seconds between shots
        console.log(`Taking rotation screenshot ${i}...`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `complex_scene_rotate_${i}.png`) });
    }

    // Simple visual verification (check if canvas is present)
    await expect(page.locator('canvas')).toBeVisible();
  });
});
