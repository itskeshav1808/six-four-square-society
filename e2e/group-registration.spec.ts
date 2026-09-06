import { expect, test, type Page } from "@playwright/test";

/**
 * Full group-registration journey:
 *   choose group mode -> price/discount maths -> demo payment -> tokenised
 *   dashboard -> edit member names -> names persist -> deadline guidance.
 *
 * These run against the live dev server and the real backend, so each run
 * creates one throwaway group booking with a unique organizer name.
 */

const stamp = () => Date.now().toString().slice(-8);
const rupees = (text: string) => Number(text.replace(/[^\d]/g, ""));

async function openGroupForm(page: Page) {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Register a group/i }).click();
  await expect(page.getByText(/Group entry —/i)).toBeVisible();
  // The tournament <select> is populated from the backend before we continue.
  await expect(page.locator("select").first().locator("option")).not.toHaveCount(0);
}

async function fillOrganizer(page: Page, name: string) {
  await page.locator("#g-name").fill(name);
  await page.locator("#g-email").fill(`e2e.${stamp()}@example.com`);
  await page.locator("#g-phone").fill("9876543210");
  await page.locator("#g-city").fill("Pune");
  await page.getByRole("checkbox").first().check();
}

test.describe("group registration", () => {
  test("group mode shows the discounted price and enforces the minimum size", async ({ page }) => {
    await openGroupForm(page);

    const counter = page.locator("span.tabular-nums").first();
    const minimum = Number((await counter.innerText()).trim());
    expect(minimum).toBeGreaterThanOrEqual(2);

    // Cannot go below the group threshold.
    await expect(page.getByRole("button", { name: "Fewer entries" })).toBeDisabled();

    const normal = rupees(await page.locator("span.line-through").first().innerText());
    const group = rupees(await page.getByText(/^Group rate/).locator("xpath=../span[2]").innerText());
    expect(group).toBeLessThan(normal);

    // Adding an entry increases both the count and the amount payable.
    await page.getByRole("button", { name: "More entries" }).click();
    await expect(counter).toHaveText(String(minimum + 1));
    const groupAfter = rupees(await page.getByText(/^Group rate/).locator("xpath=../span[2]").innerText());
    expect(groupAfter).toBeGreaterThan(group);
  });

  test("the pay button stays locked until organizer details are valid", async ({ page }) => {
    await openGroupForm(page);
    const payButton = page.getByRole("button", { name: /Complete your details to continue|^Pay ₹/ });
    await expect(payButton).toBeDisabled();

    await page.locator("#g-name").fill("E2E Organizer");
    await page.locator("#g-email").fill("not-an-email");
    await page.locator("#g-phone").fill("1234567890"); // invalid Indian mobile
    await expect(page.locator("#g-email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#g-phone")).toHaveAttribute("aria-invalid", "true");
    await expect(payButton).toBeDisabled();

    await page.locator("#g-email").fill(`e2e.${stamp()}@example.com`);
    await page.locator("#g-phone").fill("9876543210");
    await expect(payButton).toBeDisabled(); // terms still unchecked
    await page.getByRole("checkbox").first().check();
    await expect(payButton).toBeEnabled();
  });

  test("pay online, land on the token dashboard, edit member names and see deadline guidance", async ({ page }) => {
    const organizer = `E2E Group ${stamp()}`;
    await openGroupForm(page);
    await fillOrganizer(page, organizer);

    const entries = Number((await page.locator("span.tabular-nums").first().innerText()).trim());
    const payButton = page.getByRole("button", { name: /^Pay ₹/ });
    const payable = rupees(await payButton.innerText());
    await payButton.click();

    // Demo payment sheet.
    await expect(page.getByText(/Demo payment \(no real charge\)/)).toBeVisible();
    await expect(page.getByText(new RegExp(`${entries} group entries`))).toBeVisible();
    await page.getByRole("button", { name: "UPI" }).click();
    const gatewayPay = page.getByRole("button", { name: `Pay ₹${payable}` });
    await gatewayPay.click();
    await expect(page.getByText("Payment successful")).toBeVisible({ timeout: 30_000 });

    // Redirected to the tokenised group dashboard.
    await page.waitForURL(/\/g\/[A-Za-z0-9_-]{8,}/, { timeout: 30_000 });
    const manageUrl = page.url();
    await expect(page.getByText("Group entry", { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`Booked by ${organizer}`))).toBeVisible();
    await expect(page.getByText(new RegExp(`${entries} entries at ₹`))).toBeVisible();
    await expect(page.getByText("Confirmed")).toBeVisible(); // paid online => verified

    // One editable slot per paid entry, all unnamed to begin with.
    const nameInputs = page.getByPlaceholder("Full name");
    await expect(nameInputs).toHaveCount(entries);
    await expect(page.getByText("name pending").first()).toBeVisible();

    // Deadline guidance is always present in one of its three forms.
    await expect(
      page.getByText(/Add every player's name before entries close|Entries close in under 48 hours|Entries closed on/),
    ).toBeVisible();

    // Edit member names and save.
    const names = Array.from({ length: entries }, (_, i) => `Player ${i + 1} ${stamp()}`);
    for (let i = 0; i < entries; i++) await nameInputs.nth(i).fill(names[i]!);
    await expect(page.getByText("named").first()).toBeVisible();
    await page.getByRole("button", { name: /Save player names/i }).click();
    await expect(page.getByText("Player names saved")).toBeVisible({ timeout: 30_000 });

    // Names survive a full reload of the manage link.
    await page.goto(manageUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("Full name").first()).toHaveValue(names[0]!);
    await expect(page.getByPlaceholder("Full name").nth(entries - 1)).toHaveValue(names[entries - 1]!);
    await expect(page.getByText("name pending")).toHaveCount(0);
  });

  test("an unknown manage token shows a not-found message instead of a blank page", async ({ page }) => {
    await page.goto("/g/definitely-not-a-real-token", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Group not found/i })).toBeVisible();
  });
});
