import { test, expect } from "@playwright/test";

test.describe("Vessify Extractor End-to-End User Flow & Data Isolation", () => {
  const aliceEmail = `alice-e2e-${Date.now()}@example.com`;
  const bobEmail = `bob-e2e-${Date.now()}@example.com`;
  const password = "password123";

  test("Should support registration, login, transaction extraction, and multi-tenant isolation", async ({ page, context }) => {
    
    // --- Step 1: Alice Registers ---
    await page.goto("http://localhost:3000/register");
    await page.fill("#name", "Alice");
    await page.fill("#email", aliceEmail);
    await page.fill("#password", password);
    await page.click("button[type='submit']");

    // Redirection check: Should auto-login and navigate to the protected dashboard
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.locator("text=Active Org: Alice's Workspace")).toBeVisible();

    // --- Step 2: Alice Extracts Starbucks Transaction ---
    const starbucksText = [
      "Date: 11 Dec 2025",
      "Description: STARBUCKS COFFEE MUMBAI",
      "Amount: -420.00",
      "Balance after transaction: 18,420.50"
    ].join("\n");

    await page.fill("#statement", starbucksText);
    await page.click("button:has-text('Parse & Save')");

    // Success feedback should trigger
    await expect(page.locator("text=Transaction parsed and saved to database successfully.")).toBeVisible();

    // Verifying it appears in the ledger history table
    await expect(page.locator("td:has-text('STARBUCKS COFFEE MUMBAI')")).toBeVisible();
    const aliceAmount = page.locator("td:has-text('- ₹420.00')");
    await expect(aliceAmount).toBeVisible();

    // --- Step 3: Sign Out Alice ---
    await page.click("button:has-text('Sign Out')");
    await expect(page).toHaveURL("http://localhost:3000/login");

    // --- Step 4: Bob Registers ---
    await page.goto("http://localhost:3000/register");
    await page.fill("#name", "Bob");
    await page.fill("#email", bobEmail);
    await page.fill("#password", password);
    await page.click("button[type='submit']");

    // Redirection check
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.locator("text=Active Org: Bob's Workspace")).toBeVisible();

    // --- Step 5: Verify Bob's Ledger is Empty (Data Isolation check) ---
    // Bob should NOT be able to see Alice's Starbucks transaction.
    const starbucksRow = page.locator("td:has-text('STARBUCKS COFFEE MUMBAI')");
    await expect(starbucksRow).not.toBeVisible();
    await expect(page.locator("text=No transactions recorded")).toBeVisible();

    // --- Step 6: Bob Extracts Uber Transaction ---
    const uberText = [
      "Uber Ride * Airport Drop",
      "12/11/2025 → ₹1,250.00 debited",
      "Available Balance → ₹17,170.50"
    ].join("\n");

    await page.fill("#statement", uberText);
    await page.click("button:has-text('Parse & Save')");

    // Success feedback check
    await expect(page.locator("text=Transaction parsed and saved to database successfully.")).toBeVisible();
    await expect(page.locator("td:has-text('Uber Ride * Airport Drop')")).toBeVisible();
    await expect(page.locator("td:has-text('- ₹1,250.00')")).toBeVisible();

    // Alice's data still shouldn't leak to Bob's view
    await expect(starbucksRow).not.toBeVisible();
  });
});
