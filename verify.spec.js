
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
    await expect(page.getByRole('button', { name: 'CopilotKit' })).toBeVisible({ timeout: 30000 });
  } catch (error) {
    // If it fails, dump the console logs before throwing the error
    console.log("Chat button not found. Console logs:");
    console.log(logs.join('\n'));
    throw error;
  }

  // Click the chat button to open the chat window
  await page.getByRole('button', { name: 'CopilotKit' }).click();

  // Find the chat input and type the prompt
  const chatInput = page.locator('textarea');
  await chatInput.fill('Generate a small tree with a brown trunk and green leaves.');
  await chatInput.press('Enter');

  // Wait for the response to appear in the chat.
  await expect(page.locator('div.CopilotKit-Message--assistant:has-text("chunks")')).toBeVisible({ timeout: 60000 });

  // Check the console for the success message
  const foundLog = logs.some(log => log.includes("Valid scene data received, updating viewer..."));
  expect(foundLog).toBe(true);

  // Take a screenshot to visually verify the viewer has updated
  await page.screenshot({ path: 'viewer-updated.png' });
});
