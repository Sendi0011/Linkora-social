import { Page } from "@playwright/test";

/**
 * Utility functions for E2E tests
 */

/**
 * Wait for wallet to be connected and return the connected address
 */
export async function waitForWalletConnection(page: Page, timeout = 10000): Promise<string> {
  try {
    const addressBadge = page.locator('div:has-text("Disconnect")').first();
    await addressBadge.waitFor({ timeout });

    // Extract address from localStorage since UI displays a truncated/formatted address
    const addressText = await page.evaluate(() =>
      localStorage.getItem("linkora_wallet_public_key")
    );
    return addressText || "";
  } catch (e) {
    throw new Error(`Failed to detect wallet connection within ${timeout}ms`);
  }
}

/**
 * Connect wallet by clicking Connect Wallet button
 */
export async function connectWallet(page: Page): Promise<void> {
  // Mock window.freighterApi and window.freighter before connecting
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighterApi = {
      getPublicKey: async () => ({
        publicKey: "GBRPYHIL2CI3WHZDTOOQFC6EB4RBIGSJRVSBUOYS77TQ7CQK5FHQ6SR",
      }),
      isConnected: async () => true,
      onNetworkChange: () => {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighter = {
      getPublicKey: async () => "GBRPYHIL2CI3WHZDTOOQFC6EB4RBIGSJRVSBUOYS77TQ7CQK5FHQ6SR",
      isConnected: async () => true,
    };
  });

  const connectButton = page.locator('button:has-text("Connect Wallet")').first();
  await connectButton.click();

  // Wait for wallet to be connected
  await waitForWalletConnection(page);
}

/**
 * Navigate to profile page for a given address
 */
export async function navigateToProfile(page: Page, address: string): Promise<void> {
  await page.goto(`/profile/${address}`);
}

/**
 * Navigate to post detail page
 */
export async function navigateToPostDetail(page: Page, postId: string): Promise<void> {
  await page.goto(`/posts/${postId}`);
}

/**
 * Navigate to feed page
 */
export async function navigateToFeed(page: Page): Promise<void> {
  await page.goto("/feed");
}

/**
 * Fill and submit create post form
 */
export async function createPost(page: Page, content: string): Promise<void> {
  // Click compose button or navigate to create post
  const composeButton = page
    .locator('button:has-text("Compose"), button:has-text("New Post")')
    .first();
  await composeButton.click();

  const dialog = page.locator('[role="dialog"]');
  const isDialogVisible = await dialog.isVisible();

  // Fill post content
  const textarea = isDialogVisible
    ? dialog.locator("textarea").first()
    : page.locator("textarea").first();
  await textarea.fill(content);

  // Submit
  const submitButton = isDialogVisible
    ? dialog
        .locator('button[type="submit"], button[form="compose-form"], button:has-text("Post")')
        .first()
    : page.locator('button[form="compose-form"], button[type="submit"]').first();
  await submitButton.click();

  // Wait for post to appear
  await page.waitForTimeout(1000);
}

/**
 * Wait for post to appear in feed with specific content
 */
export async function waitForPostInFeed(
  page: Page,
  content: string,
  timeout = 5000
): Promise<void> {
  await page.locator(`text="${content}"`).first().waitFor({ timeout });
}

/**
 * Click on a post in the feed to view details
 */
export async function clickPostInFeed(page: Page, content: string): Promise<void> {
  const post = page.locator(`article:has-text("${content}")`).first();
  await post.click();
}

/**
 * Tip a post by clicking tip button
 */
export async function tipPost(page: Page, amount = 1): Promise<void> {
  const tipButton = page.locator('button:has-text("Tip"), button:has-text("Support")').first();
  await tipButton.click();

  // If there's an input for amount
  const amountInput = page.locator('input[type="number"]').first();
  if (await amountInput.isVisible()) {
    await amountInput.fill(amount.toString());
  }

  // Click confirm
  const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Send")').first();
  await confirmButton.click();

  // Wait for transaction to complete
  await page.waitForTimeout(2000);
}

/**
 * Wait for element and return its text content
 */
export async function getElementText(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).first().textContent();
}

/**
 * Verify that a URL contains a specific path
 */
export async function verifyUrl(page: Page, expectedPath: string): Promise<boolean> {
  const url = page.url();
  return url.includes(expectedPath);
}
