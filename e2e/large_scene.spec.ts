import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('Large Scene Generation', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('generate large city', async ({ page }) => {
    test.setTimeout(120000); // Increase timeout to 2 minutes

    console.log('Starting large city test...');
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

    const prompt = "Create a large city with skyscrapers, roads, and a park.";
    await chatInput.fill(prompt);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'large_city_1_input.png') });
    await chatInput.press('Enter');

    // Wait for response
    const assistantMessage = page.locator('.copilotKitMessage.assistant').last();
    await assistantMessage.waitFor({ state: 'visible', timeout: 60000 });

    console.log('Assistant responded.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'large_city_2_response.png') });

    // Wait for rendering (give it some time to process the RLE and mesh)
    await page.waitForTimeout(10000);

    // Zoom out to see the full model
    console.log('Zooming out...');
    await page.evaluate(() => {
        // @ts-ignore
        if (window.voxelWorld) {
            // @ts-ignore
            // Set camera position further back and up for large scenes
            window.voxelWorld.camera.position.set(0, 120, 120);
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

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'large_city_3_rendered.png') });

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
    for (let i = 0; i < 4; i++) {
        await page.waitForTimeout(3000);
        console.log(`Taking rotation screenshot ${i}...`);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `large_city_rotate_${i}.png`) });
    }

    // Simple visual verification (check if canvas is present)
    await expect(page.locator('canvas')).toBeVisible();
  });
});
