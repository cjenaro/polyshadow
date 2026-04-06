import { test, expect } from "@playwright/test";

test("game loads without critical errors", async ({ page }) => {
  const errors = [];
  
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  
  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto("http://127.0.0.1:8765/index.html");
  await page.waitForTimeout(3000);
  
  const criticalErrors = errors.filter(e => 
    !e.includes("AudioContext") && 
    !e.includes("warning") &&
    !e.includes("deprecated")
  );
  
  console.log("Errors found:", criticalErrors);
  expect(criticalErrors.length).toBe(0);
});