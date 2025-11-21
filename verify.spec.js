
import { test, expect } from '@playwright/test';

test('Voxel Viewer Updates from Chat', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  // Log network requests to see if the availableAgents call is made
  page.on('request', request => {
    if (request.url().includes('/api/generate')) {
      console.log('>>', request.method(), request.url());
    }
  });
  page.on('response', response => {
    if (response.url().includes('/api/generate')) {
      console.log('<<', response.status(), response.url());
    }
  });

  await page.goto('http://localhost:5173');

  // Wait for the chat button to be visible. Increased timeout for slower machines.
  try {
    await expect(page.getByRole('button', { name: 'Open Chat' })).toBeVisible({ timeout: 30000 });
  } catch (error) {
    // If it fails, dump the console logs before throwing the error
    console.log("Chat button not found. Console logs:");
    console.log(logs.join('\n'));
    throw error;
  }

  // Click the chat button to open the chat window
  await page.getByRole('button', { name: 'Open Chat' }).click();

  // Find the chat input and type the prompt
  const chatInput = page.locator('textarea');
  await chatInput.fill('Generate a small tree with a brown trunk and green leaves.');
  await chatInput.press('Enter');

  // Wait for the response to appear in the chat.
  // The CopilotKit renders messages in paragraphs, so we look for the text "chunks" or "voxels" or "brown" inside the message container
  // Since the CopilotKit might not use the .copilotKitMessage class consistently or inside shadow DOM/specific structure,
  // we'll look for the text content broadly within the chat area or wait for the console log.

  // We rely on the console log for verification of successful parsing
  // because the UI might not render the raw JSON chunks visibly or easily selectable.
  await expect.poll(() => logs.some(log => log.includes("Valid scene data received, updating viewer...")), {
    timeout: 60000,
  }).toBe(true);

  // Check the console for the success message
  const foundLog = logs.some(log => log.includes("Valid scene data received, updating viewer..."));
  expect(foundLog).toBe(true);

  // Take a screenshot to visually verify the viewer has updated
  await page.screenshot({ path: 'viewer-updated.png' });
});
