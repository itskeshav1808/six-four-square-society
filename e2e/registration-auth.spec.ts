import { expect, test } from "@playwright/test";

test.describe("registration account gate", () => {
  test("register sends visitors to sign in", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth/, { timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("the individual vs group choice is gone", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Register a group/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Register as an individual/i })).toHaveCount(0);
  });

  test("player signup asks for name, mobile or email, and password", async ({ page }) => {
    await page.goto("/auth", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Mobile number or email")).toBeVisible();
    await expect(page.getByText("Password")).toBeVisible();
  });
});
