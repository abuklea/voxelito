import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('Botanical Garden Construction', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Build a botanical garden step-by-step', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout

    console.log('Starting Botanical Garden test...');
    await page.goto('http://localhost:5173');

    // Open Chat
    const chatButton = page.locator('.copilotKitButton');
    await chatButton.waitFor({ state: 'visible', timeout: 10000 });
    await chatButton.click();

    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });

    // Reduce font size in chat window for better visibility in screenshots
    await page.addStyleTag({
      content: `
        .copilotKitMessage { font-size: 10px !important; line-height: 1.2 !important; padding: 4px !important; }
        .copilotKitInput { font-size: 10px !important; }
        .copilotKitResponseButton { font-size: 10px !important; }
      `
    });

    const assistantMessages = page.locator('.copilotKitAssistantMessage');

    // --- Step 1: Landscaped Field ---
    const prompt1 = "Hi Voxelito! I want to build a detailed botanical garden. Let's start with a large grassy landscaped field, 60x60 in size.";
    console.log(`Sending prompt 1: ${prompt1}`);
    await chatInput.fill(prompt1);
    await chatInput.press('Enter');

    console.log('Waiting for field generation...');
    await expect(assistantMessages.last()).toContainText(/field|grass|landscape/i, { timeout: 60000 });

    // Wait for voxels
    await page.waitForFunction(() => {
        // @ts-ignore
        if (window.voxelWorld && window.voxelWorld.scene) {
            // @ts-ignore
            const meshes = window.voxelWorld.scene.children.filter(c => c.isMesh && c.geometry.type === 'BufferGeometry');
            return meshes.length > 0;
        }
        return false;
    }, { timeout: 60000 });

    // Position camera
    await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.camera.position.set(0, 60, 60);
        // @ts-ignore
        window.voxelWorld.controls.target.set(0, 0, 0);
        // @ts-ignore
        window.voxelWorld.controls.update();
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.waitForTimeout(1000); // Wait for render
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'botanical_1_field.png') });


    // --- Step 2: Trees ---
    const prompt2 = "Now add some amazing different kinds of trees. Oak trees and pine trees scattered around.";
    console.log(`Sending prompt 2: ${prompt2}`);
    await chatInput.fill(prompt2);
    await chatInput.press('Enter');

    console.log('Waiting for trees generation...');
    await expect(assistantMessages.last()).toContainText(/tree|oak|pine/i, { timeout: 60000 });

    // Wait a bit for potential async rendering
    await page.waitForTimeout(2000);

    // Update Camera
    await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'botanical_2_trees.png') });


    // --- Step 3: Shrubs ---
    const prompt3 = "Let's add some shrubs. Place green bushes around the trees.";
    console.log(`Sending prompt 3: ${prompt3}`);
    await chatInput.fill(prompt3);
    await chatInput.press('Enter');

    console.log('Waiting for shrubs generation...');
    await expect(assistantMessages.last()).toContainText(/shrub|bush/i, { timeout: 60000 });

    await page.waitForTimeout(2000);
     await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'botanical_3_shrubs.png') });


    // --- Step 4: Flowers ---
    const prompt4 = "Finally, add beautiful flowers. Red, yellow, and purple flowers blooming in the garden.";
    console.log(`Sending prompt 4: ${prompt4}`);
    await chatInput.fill(prompt4);
    await chatInput.press('Enter');

    console.log('Waiting for flowers generation...');
    await expect(assistantMessages.last()).toContainText(/flower/i, { timeout: 60000 });

    await page.waitForTimeout(2000);
     await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'botanical_4_flowers.png') });

    console.log('Botanical Garden test completed successfully.');
  });
});
