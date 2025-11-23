import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'docs/screenshots';

test.describe('Chat Dialogue and Conversational UI', () => {

  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Verify conversational responses and chat UI', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes timeout

    console.log('Starting Chat Dialogue test...');
    await page.goto('http://localhost:5173');

    // Open Chat
    const chatButton = page.locator('.copilotKitButton');
    await chatButton.waitFor({ state: 'visible', timeout: 10000 });
    await chatButton.click();

    const chatInput = page.locator('textarea[placeholder="Type a message..."]');
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });

    const assistantMessages = page.locator('.copilotKitAssistantMessage');

    // 1. Initial Greeting
    const greetingPrompt = "Hello! Who are you?";
    console.log(`Sending prompt: ${greetingPrompt}`);
    await chatInput.fill(greetingPrompt);
    await chatInput.press('Enter');

    // Wait for response
    console.log('Waiting for response to greeting...');
    await expect(assistantMessages.last()).toContainText(/Voxelito/, { timeout: 30000 });
    await expect(assistantMessages.last()).toContainText(/expert|scenes|voxel/i);

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat_1_greeting.png') });

    // 2. Request Generation with conversational context
    const genPrompt = "Please create a simple red cube.";
    console.log(`Sending prompt: ${genPrompt}`);
    await chatInput.fill(genPrompt);
    await chatInput.press('Enter');

    // Capture "thinking" state
    await page.waitForTimeout(500); // Short wait to let the UI update with the user message and potential loading indicator
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat_2_generating_progress.png') });

    console.log('Waiting for generation response and voxels...');
    await page.waitForFunction(() => {
        // @ts-ignore
        if (window.voxelWorld && window.voxelWorld.scene) {
            // @ts-ignore
            const meshes = window.voxelWorld.scene.children.filter(c => c.isMesh && c.geometry.type === 'BufferGeometry');
            return meshes.length > 0;
        }
        return false;
    }, { timeout: 90000 });

    console.log('Voxels detected.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat_3_generation_complete.png') });

    // 3. Conversational Follow-up
    const followUpPrompt = "That looks great! Can you make it blue instead?";
    console.log(`Sending prompt: ${followUpPrompt}`);
    await chatInput.fill(followUpPrompt);
    await chatInput.press('Enter');

    console.log('Waiting for edit response...');
    await expect(assistantMessages.last()).toContainText(/blue/i, { timeout: 60000 });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat_4_followup_complete.png') });

    console.log('Chat dialogue test completed successfully.');
  });
});
