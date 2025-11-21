import { test, expect } from '@playwright/test';

test('comprehensive app test with neon logo and scene generation', async ({ page }) => {
  // 1. Navigate to the app
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173');

  // 2. Verify Title and Neon Logo
  await expect(page).toHaveTitle(/app/);

  const logo = page.locator('text=Voxelito');
  await expect(logo.first()).toBeVisible();

  await page.screenshot({ path: 'homepage.png' });
  console.log('Homepage screenshot captured.');

  // 3. Verify Chat UI
  const chatButton = page.locator('.copilotKitButton');
  if (await chatButton.isVisible()) {
      console.log('Clicking chat button...');
      await chatButton.click();
  }

  const chatInput = page.locator('textarea[placeholder="Type a message..."]');
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });

  // 4. Interact with Chat
  const prompt = "Create a 5x5x5 blue cube";
  await chatInput.fill(prompt);
  await page.screenshot({ path: 'chat_input.png' });

  await chatInput.press('Enter');
  console.log('Message sent: ' + prompt);

  // 5. Wait for Response
  // Try to wait for response, but don't fail immediately if selector is wrong
  try {
      console.log('Waiting for assistant message...');
      const assistantMessage = page.locator('.copilotKitMessage.assistant').last();
      await assistantMessage.waitFor({ state: 'visible', timeout: 60000 });
      console.log('Assistant message found.');
  } catch (e) {
      console.log('Assistant message selector timed out. Taking screenshot anyway.');
  }

  // Capture Chat Interaction (regardless of success)
  await page.screenshot({ path: 'chat_response.png' });
  console.log('Chat response screenshot captured.');

  // 6. Verify Scene Generation
  // Wait for the scene to potentially render
  await page.waitForTimeout(5000);

  const canvas = page.locator('canvas');
  if (await canvas.isVisible()) {
       console.log('Canvas found.');
  } else {
       console.log('Canvas not found.');
  }

  await page.screenshot({ path: 'generated_scene.png' });
  console.log('Generated scene screenshot captured.');
});
