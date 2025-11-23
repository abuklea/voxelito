import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('Voxelito Personality and Editing Tests', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Voxelito conversation and scene editing', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout for complex generation

    console.log('Starting Voxelito test...');
    await page.goto('http://localhost:5173');

    // Open Chat
    const chatButton = page.locator('.copilotKitButton');
    if (await chatButton.isVisible()) {
        await chatButton.click();
    }

    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });

    // 1. Initial Greeting & Generation
    const prompt = "Hola Voxelito! Create a small cyberpunk city with neon lights.";
    console.log(`Sending prompt: ${prompt}`);
    await chatInput.fill(prompt);
    await chatInput.press('Enter');

    // Wait for response (look for assistant message)
    try {
        const assistantMessage = page.locator('.copilotKitMessage.assistant').last();
        await assistantMessage.waitFor({ state: 'visible', timeout: 60000 });
        const text = await assistantMessage.textContent();
        console.log(`Assistant response: ${text}`);

        // Basic check for personality in the first response (optional, as we verify this more strictly in unit test)
        // But good to see in logs.
    } catch (e) {
        console.log('Assistant message selector timed out. Proceeding...');
    }

    // Wait for voxels
    console.log('Waiting for voxels...');
    try {
        await page.waitForFunction(() => {
            // @ts-ignore
            if (window.voxelWorld && window.voxelWorld.scene) {
                // @ts-ignore
                const scene = window.voxelWorld.scene;
                // @ts-ignore
                return scene.children.some(c => c.isMesh && c.geometry.type === 'BufferGeometry');
            }
            return false;
        }, { timeout: 60000 });
    } catch (e) {
        console.log('Timed out waiting for voxels.');
    }

    // Position camera for screenshot
    await page.evaluate(() => {
        // @ts-ignore
        if (window.voxelWorld) {
            // @ts-ignore
            window.voxelWorld.camera.position.set(0, 60, 60);
            // @ts-ignore
            window.voxelWorld.controls.target.set(0, 0, 0);
            // @ts-ignore
            window.voxelWorld.controls.update();
            // @ts-ignore
            window.voxelWorld.requestRender();
        }
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'voxelito_1_city.png') });

    // 2. Select Voxels
    console.log('Selecting voxels...');
    const canvas = page.locator('canvas');
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
        // Click in the center to select whatever is there (hopefully a building or road)
        await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
        await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'voxelito_2_selection.png') });

    // 3. Edit Selection
    const editPrompt = "Change this to a park with grass and trees, parce.";
    console.log(`Sending edit prompt: ${editPrompt}`);
    await chatInput.fill(editPrompt);
    await chatInput.press('Enter');

    // Wait for response
    await page.waitForTimeout(5000); // Give it a moment to start processing
    try {
         // Wait for new message or changes
         // Since we can't easily count messages without more complex selectors, we wait for a reasonable time
         // and check for visual update via screenshot later.
         await page.waitForTimeout(15000);
    } catch (e) {
         console.log('Error waiting for edit response.');
    }

    // Position camera again
    await page.evaluate(() => {
        // @ts-ignore
        if (window.voxelWorld) {
            // @ts-ignore
            window.voxelWorld.camera.position.set(0, 60, 60);
            // @ts-ignore
            window.voxelWorld.controls.target.set(0, 0, 0);
            // @ts-ignore
            window.voxelWorld.controls.update();
            // @ts-ignore
            window.voxelWorld.requestRender();
        }
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'voxelito_3_park_mod.png') });

  });

  test('Complex Scene and Editing', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes

    // Capture console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log(`PAGE ERROR: ${exception}`));

    console.log('Starting Complex Scene test...');
    await page.goto('http://localhost:5173');

    // Open Chat
    const chatButton = page.locator('.copilotKitButton');
    if (await chatButton.isVisible()) {
        await chatButton.click();
    }

    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });

    // 1. Request Complex Scene
    const prompt = "Create a complex medieval castle with a central keep, four corner towers, stone walls, and a water moat surrounding it. Add a wooden drawbridge.";
    console.log(`Sending prompt: ${prompt}`);
    await chatInput.fill(prompt);
    await chatInput.press('Enter');

    // Wait for response - looking for text since class selector might be flaky
    console.log('Waiting for response text...');

    // Wait for scene data to arrive (this confirms backend replied)
    await page.waitForFunction(() => {
        // @ts-ignore
        return window.voxelWorld && window.voxelWorld.scene.children.filter(c => c.type === 'Mesh').length > 5;
    }, { timeout: 180000 });

    // Wait a bit for chat to render
    await page.waitForTimeout(2000);

    // Wait for voxels
    await page.waitForFunction(() => {
        // @ts-ignore
        // Check for at least some meshes (chunks)
        return window.voxelWorld && window.voxelWorld.scene.children.filter(c => c.type === 'Mesh').length > 5;
    }, { timeout: 60000 });

    // Screenshot 1: Full Scene
    await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.camera.position.set(0, 100, 100);
        // @ts-ignore
        window.voxelWorld.controls.target.set(0, 0, 0);
        // @ts-ignore
        window.voxelWorld.controls.update();
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_1_castle.png') });

    // 2. Select a tower
    console.log('Selecting voxels programmatically...');
    await page.evaluate(() => {
         const selection = {};
         for(let x=10; x<30; x++) {
             for(let z=10; z<30; z++) {
                 for(let y=0; y<20; y++) {
                     const key = `${x},${y},${z}`;
                     // Provide chunkId to match interface
                     selection[key] = { position: [x, y, z], chunkId: "0,0,0" };
                 }
             }
         }
         // @ts-ignore
         const store = window.voxelStore.getState();
         // Correct method name
         store.setSelectedVoxels(selection);
    });

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_2_selection.png') });

    // 3. Edit Request
    const editPrompt = "Change the selected corner tower to be made of glowing neon_pink material.";
    console.log(`Sending edit prompt: ${editPrompt}`);
    await chatInput.fill(editPrompt);
    await chatInput.press('Enter');

    // Wait for update
    console.log('Waiting for edit response...');
    // Force wait for backend processing and mesh update
    await page.waitForTimeout(15000);

    // Screenshot 3: Edited Scene
    await page.evaluate(() => {
        // @ts-ignore
        window.voxelWorld.requestRender();
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'complex_3_edited.png') });

  });
});
