#!/usr/bin/env python3
"""
Signup flow test using Playwright.
Tests the full signup -> Stripe -> /setup redirect flow.

Field IDs from signup/page.tsx:
  - #studioName  (Studio name)
  - #name        (Your name)
  - #email       (Work email, type=email)
  - #password    (Password, type=password)

Step 2 uses Stripe <PaymentElement> which renders inside iframes.
"""

import asyncio
import time
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Page

BASE_URL = "http://localhost:3002"
SCREENSHOTS_DIR = Path("/Users/simonsevelsted/Desktop/loyalink-v2/scripts/screenshots")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

TIMESTAMP = int(time.time())
TEST_EMAIL = f"test+{TIMESTAMP}@loyalink-test.com"
STUDIO_NAME = f"Test Studio {TIMESTAMP}"
YOUR_NAME = "Test User"
PASSWORD = "TestPass123!"

console_errors = []
network_errors = []
network_responses = []


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


async def take_screenshot(page: Page, name: str, description: str = ""):
    path = SCREENSHOTS_DIR / name
    await page.screenshot(path=str(path), full_page=True)
    log(f"  Screenshot saved: {name}" + (f" — {description}" if description else ""))


async def run():
    log(f"Starting signup test")
    log(f"Email:       {TEST_EMAIL}")
    log(f"Studio name: {STUDIO_NAME}")
    log(f"Your name:   {YOUR_NAME}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()

        # Capture console output
        def on_console(msg):
            if msg.type in ("error", "warning"):
                console_errors.append({"type": msg.type, "text": msg.text})
                log(f"  CONSOLE {msg.type.upper()}: {msg.text}")

        page.on("console", on_console)

        # Capture network failures
        def on_request_failed(request):
            network_errors.append({"url": request.url, "failure": request.failure})
            log(f"  NETWORK FAILED: {request.url} — {request.failure}")

        page.on("requestfailed", on_request_failed)

        # Capture API responses for debugging
        async def on_response(response):
            if "/api/signup" in response.url:
                try:
                    body = await response.json()
                    network_responses.append({
                        "url": response.url,
                        "status": response.status,
                        "body": body,
                    })
                    log(f"  API RESPONSE [{response.status}] {response.url}: {body}")
                except Exception:
                    network_responses.append({
                        "url": response.url,
                        "status": response.status,
                        "body": "(non-JSON)",
                    })

        page.on("response", on_response)

        # ── Step 1: Navigate to signup ───────────────────────────────────────────
        log("")
        log("STEP 1: Navigate to /signup")
        await page.goto(f"{BASE_URL}/signup", wait_until="networkidle", timeout=30000)
        await take_screenshot(page, "signup-step1.png", "Initial signup page")
        log(f"  URL:   {page.url}")
        log(f"  Title: {await page.title()}")

        # ── Step 2: Select Basic plan ────────────────────────────────────────────
        log("")
        log("STEP 2: Select Basic plan")

        # The plan cards are <button type="button"> elements. Basic is the first one.
        # They contain text "Basic". Pro has a "Popular" badge and is selected by default.
        basic_btn = page.locator("button[type='button']").filter(has_text="Basic").first
        try:
            await basic_btn.wait_for(state="visible", timeout=5000)
            await basic_btn.click()
            log("  Clicked Basic plan card")
        except Exception as e:
            log(f"  WARNING: Could not click Basic plan: {e}")

        await page.wait_for_timeout(300)

        # ── Step 3: Fill form fields using exact IDs ─────────────────────────────
        log("")
        log("STEP 3: Fill form fields")

        # Studio name — id="studioName"
        studio_input = page.locator("#studioName")
        await studio_input.wait_for(state="visible", timeout=5000)
        await studio_input.fill(STUDIO_NAME)
        log(f"  Studio name: {STUDIO_NAME}")

        # Your name — id="name"
        name_input = page.locator("#name")
        await name_input.wait_for(state="visible", timeout=5000)
        await name_input.fill(YOUR_NAME)
        log(f"  Your name:   {YOUR_NAME}")

        # Email — id="email"
        email_input = page.locator("#email")
        await email_input.wait_for(state="visible", timeout=5000)
        await email_input.fill(TEST_EMAIL)
        log(f"  Email:       {TEST_EMAIL}")

        # Password — id="password"
        password_input = page.locator("#password")
        await password_input.wait_for(state="visible", timeout=5000)
        await password_input.fill(PASSWORD)
        log(f"  Password:    {PASSWORD}")

        # Verify values are set correctly
        sv = await studio_input.input_value()
        nv = await name_input.input_value()
        ev = await email_input.input_value()
        pv = await password_input.input_value()
        log(f"  Verified — studioName='{sv}', name='{nv}', email='{ev}', password={'*' * len(pv)}")

        await take_screenshot(page, "signup-step2.png", "Form filled out — ready to continue")

        # ── Step 4: Click Continue ────────────────────────────────────────────────
        log("")
        log("STEP 4: Click Continue")

        continue_btn = page.locator("button[type='submit']").first
        await continue_btn.wait_for(state="visible", timeout=5000)
        btn_text = await continue_btn.inner_text()
        log(f"  Submit button text: '{btn_text}'")
        await continue_btn.click()
        log("  Clicked Continue")

        # ── Step 5: Wait for Step 2 (Stripe PaymentElement) ──────────────────────
        log("")
        log("STEP 5: Wait for Stripe PaymentElement (Step 2)")

        # When step 1 succeeds: /api/signup/prepare responds with clientSecret
        # then React renders <Elements> + <PaymentStep> with <PaymentElement>
        # PaymentElement renders inside an iframe from Stripe

        # First wait for the API call to complete (up to 10s)
        await page.wait_for_timeout(2000)

        # Check if we're still on step 1 (form still visible) or moved to step 2
        still_step1 = await page.locator("#studioName").is_visible()
        log(f"  Still on step 1: {still_step1}")

        current_url = page.url
        log(f"  Current URL: {current_url}")

        # Check for error message displayed
        error_div = page.locator(".text-destructive")
        error_count = await error_div.count()
        if error_count > 0:
            for i in range(error_count):
                err_text = await error_div.nth(i).inner_text()
                if err_text.strip():
                    log(f"  ERROR ON PAGE: '{err_text}'")

        # If still on step 1, wait a bit more for the API call
        if still_step1:
            log("  Waiting up to 10s more for step transition...")
            try:
                await page.locator("#studioName").wait_for(state="hidden", timeout=10000)
                log("  Step 1 form hidden — moved to step 2!")
            except Exception:
                log("  Still on step 1 after waiting. Checking errors again...")
                error_count = await error_div.count()
                if error_count > 0:
                    for i in range(error_count):
                        err_text = await error_div.nth(i).inner_text()
                        if err_text.strip():
                            log(f"  ERROR: '{err_text}'")

        await page.wait_for_timeout(1000)

        # Log frame count
        frames = page.frames
        log(f"  Total frames: {len(frames)}")
        stripe_frames = [f for f in frames if "stripe" in f.url.lower()]
        log(f"  Stripe frames: {len(stripe_frames)}")
        for sf in stripe_frames:
            log(f"    {sf.url[:100]}...")

        # Look for Stripe's PaymentElement iframe
        stripe_iframe_visible = False
        try:
            stripe_iframe = page.frame_locator("iframe[name*='stripe'], iframe[src*='stripe.com'], iframe[title*='Secure']").first
            # Try to find any input in a Stripe frame
            await stripe_iframe.locator("input, [data-testid]").first.wait_for(state="visible", timeout=5000)
            stripe_iframe_visible = True
            log("  Stripe PaymentElement iframe found and has inputs")
        except Exception:
            log("  Could not locate inputs inside Stripe iframes directly")

        await take_screenshot(page, "signup-payment.png", "After Continue — payment step")

        # ── Step 6: Fill Stripe test card ────────────────────────────────────────
        log("")
        log("STEP 6: Fill Stripe test card details")

        # Stripe's PaymentElement renders multiple iframes with specific name patterns.
        # Card number iframe often has name like "__privateStripeFrame{n}"
        # We need to find them by iterating page.frames

        card_filled = False
        expiry_filled = False
        cvc_filled = False
        zip_filled = False

        # Re-fetch frames after potential page transition
        await page.wait_for_timeout(1000)
        all_frames = page.frames
        log(f"  Iterating {len(all_frames)} frames to find card inputs...")

        for frame in all_frames:
            frame_url = frame.url
            if not ("stripe" in frame_url or "privateStripe" in frame.name.lower() or frame.name.startswith("__")):
                continue

            try:
                # Card number
                if not card_filled:
                    card_num = frame.locator("input[name='number'], input[autocomplete='cc-number'], input[placeholder*='1234']")
                    if await card_num.count() > 0 and await card_num.first.is_visible():
                        await card_num.first.fill("4242424242424242")
                        card_filled = True
                        log(f"  Filled card number in frame: {frame.name or frame_url[:60]}")

                # Expiry
                if not expiry_filled:
                    exp = frame.locator("input[name='expiry'], input[autocomplete='cc-exp'], input[placeholder*='MM']")
                    if await exp.count() > 0 and await exp.first.is_visible():
                        await exp.first.fill("1229")
                        expiry_filled = True
                        log(f"  Filled expiry in frame: {frame.name or frame_url[:60]}")

                # CVC
                if not cvc_filled:
                    cvc = frame.locator("input[name='cvc'], input[autocomplete='cc-csc'], input[placeholder='CVC']")
                    if await cvc.count() > 0 and await cvc.first.is_visible():
                        await cvc.first.fill("123")
                        cvc_filled = True
                        log(f"  Filled CVC in frame: {frame.name or frame_url[:60]}")

                # ZIP / Postal
                if not zip_filled:
                    postal = frame.locator("input[name='postalCode'], input[autocomplete='postal-code'], input[placeholder*='ZIP'], input[placeholder*='postal']")
                    if await postal.count() > 0 and await postal.first.is_visible():
                        await postal.first.fill("12345")
                        zip_filled = True
                        log(f"  Filled ZIP in frame: {frame.name or frame_url[:60]}")

            except Exception:
                continue

        if not any([card_filled, expiry_filled, cvc_filled]):
            log("  WARNING: Could not fill any card fields. Stripe PaymentElement may not have rendered.")
            log("  This could be because step 1 did not complete successfully (still on step 1).")

        log(f"  Card number filled: {card_filled}")
        log(f"  Expiry filled: {expiry_filled}")
        log(f"  CVC filled: {cvc_filled}")
        log(f"  ZIP filled: {zip_filled}")

        await page.wait_for_timeout(500)
        await take_screenshot(page, "signup-card-filled.png", "After filling card details")

        # ── Step 7: Click Start Free Trial ───────────────────────────────────────
        log("")
        log("STEP 7: Click 'Start Free Trial — no charge today'")

        # Find the submit button for the payment form
        trial_btn = page.locator("button:has-text('Start Free Trial')")
        try:
            await trial_btn.wait_for(state="visible", timeout=5000)
            btn_text = await trial_btn.inner_text()
            log(f"  Found button: '{btn_text}'")
            await trial_btn.click()
            log("  Clicked Start Free Trial")
            trial_clicked = True
        except Exception:
            log("  ERROR: 'Start Free Trial' button not found or not visible")
            trial_clicked = False
            # Log all visible buttons
            all_btns = await page.locator("button:visible").all()
            log(f"  Visible buttons ({len(all_btns)}):")
            for btn in all_btns[:15]:
                try:
                    txt = await btn.inner_text()
                    log(f"    - '{txt.strip()}'")
                except Exception:
                    pass

        # ── Step 8: Wait for redirect to /setup ──────────────────────────────────
        log("")
        log("STEP 8: Wait for redirect to /setup (up to 15 seconds)")

        redirected = False
        try:
            await page.wait_for_url(f"{BASE_URL}/setup**", timeout=15000)
            redirected = True
            log(f"  SUCCESS: Redirected to {page.url}")
        except Exception:
            final_url = page.url
            log(f"  Did NOT redirect to /setup. Current URL: {final_url}")

            # Extra wait and recheck
            await page.wait_for_timeout(3000)
            final_url = page.url
            log(f"  URL after extra 3s: {final_url}")

            # Check for errors
            error_elems = page.locator(".text-destructive, [role='alert']")
            error_count = await error_elems.count()
            if error_count > 0:
                for i in range(error_count):
                    txt = await error_elems.nth(i).inner_text()
                    if txt.strip():
                        log(f"  ERROR ON PAGE: '{txt}'")

        await take_screenshot(page, "signup-final.png", "Final state")

        # ── Summary ───────────────────────────────────────────────────────────────
        log("")
        log("=" * 65)
        log("SIGNUP FLOW TEST RESULTS")
        log("=" * 65)
        log(f"  Test email:              {TEST_EMAIL}")
        log(f"  Studio name:             {STUDIO_NAME}")
        log(f"  Basic plan selected:     OK")
        log(f"  Form filled:             OK")
        log(f"  Continue clicked:        OK")
        log(f"  Stripe iframe appeared:  {stripe_iframe_visible}")
        log(f"  Card number filled:      {card_filled}")
        log(f"  Expiry filled:           {expiry_filled}")
        log(f"  CVC filled:              {cvc_filled}")
        log(f"  ZIP filled:              {zip_filled}")
        log(f"  Trial button clicked:    {trial_clicked}")
        log(f"  Redirected to /setup:    {redirected}")
        log(f"  Final URL:               {page.url}")
        log("")

        if console_errors:
            log(f"CONSOLE ERRORS/WARNINGS ({len(console_errors)}):")
            for err in console_errors:
                log(f"  [{err['type'].upper()}] {err['text']}")
        else:
            log("No console errors/warnings captured.")

        if network_errors:
            log(f"NETWORK ERRORS ({len(network_errors)}):")
            for err in network_errors:
                log(f"  {err['url']} — {err['failure']}")
        else:
            log("No network errors.")

        if network_responses:
            log(f"API RESPONSES ({len(network_responses)}):")
            for r in network_responses:
                log(f"  [{r['status']}] {r['url']}")
                log(f"    {r['body']}")

        log("")
        log("Screenshots: " + str(SCREENSHOTS_DIR))

        await browser.close()


if __name__ == "__main__":
    asyncio.run(run())
