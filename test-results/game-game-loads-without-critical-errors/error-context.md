# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: game.test.js >> game loads without critical errors
- Location: e2e/game.test.js:3:1

# Error details

```
Test timeout of 15000ms exceeded.
```

```
Error: page.goto: Test timeout of 15000ms exceeded.
Call log:
  - navigating to "http://127.0.0.1:8765/index.html", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - heading "Polyshadow" [level=1]
    - paragraph: Press any key to begin
  - generic: Gamepad connected
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("game loads without critical errors", async ({ page }) => {
  4  |   const errors = [];
  5  |   
  6  |   page.on("console", (msg) => {
  7  |     if (msg.type() === "error") {
  8  |       errors.push(msg.text());
  9  |     }
  10 |   });
  11 |   
  12 |   page.on("pageerror", (err) => {
  13 |     errors.push(err.message);
  14 |   });
  15 | 
> 16 |   await page.goto("http://127.0.0.1:8765/index.html");
     |              ^ Error: page.goto: Test timeout of 15000ms exceeded.
  17 |   await page.waitForTimeout(3000);
  18 |   
  19 |   const criticalErrors = errors.filter(e => 
  20 |     !e.includes("AudioContext") && 
  21 |     !e.includes("warning") &&
  22 |     !e.includes("deprecated")
  23 |   );
  24 |   
  25 |   console.log("Errors found:", criticalErrors);
  26 |   expect(criticalErrors.length).toBe(0);
  27 | });
```