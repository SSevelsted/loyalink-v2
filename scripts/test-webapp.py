#!/usr/bin/env python3
"""
Loyalink webapp bug-finding script using Playwright.
Authenticates by injecting Supabase session cookies, then tests all dashboard pages.
"""

import asyncio
import json
import urllib.request
import urllib.parse
import urllib.error
import http.cookiejar
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:3000"
SUPABASE_URL = "https://ryjyhddvwsmpagggepgk.supabase.co"
SUPABASE_SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5anloZGR2d3NtcGFnZ2dlcGdrIiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY3MzUyNywiZXhwIjoyMDg1MjQ5NTI3fQ"
    ".3y5pchiB-yKUR9CRMdX74gL0CDx5U6AttKuFR3tjyNs"
)
PROJECT_REF = "ryjyhddvwsmpagggepgk"
COOKIE_KEY = f"sb-{PROJECT_REF}-auth-token"

SCREENSHOTS_DIR = Path("scripts/screenshots")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

issues = []
console_errors = {}
network_errors = {}


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def add_issue(page_name: str, issue_type: str, description: str, severity: str = "medium"):
    issues.append({"page": page_name, "type": issue_type, "description": description, "severity": severity})
    emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵"}.get(severity, "⚠️")
    print(f"  {emoji} [{severity.upper()}] {issue_type}: {description}", flush=True)


def supabase_request(method: str, path: str, body: dict = None) -> dict:
    url = f"{SUPABASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(
        url, data=data,
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        log(f"  ⚠️  Supabase API error: {e}")
        return {}


def get_tokens_from_magic_link(action_link: str) -> dict | None:
    """
    Follow the magic link URL, capture the redirect with tokens in the fragment.
    Supabase redirects to: http://localhost:3000/#access_token=...&refresh_token=...
    We capture the Location header from the 303 redirect without following it.
    """
    # Don't follow redirects — capture the Location header
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def http_error_303(self, req, fp, code, msg, hdrs):
            return fp
        def http_error_302(self, req, fp, code, msg, hdrs):
            return fp
        def http_error_301(self, req, fp, code, msg, hdrs):
            return fp

    opener = urllib.request.build_opener(NoRedirect())
    try:
        req = urllib.request.Request(action_link)
        try:
            resp = opener.open(req, timeout=10)
            location = resp.headers.get("Location", "")
        except urllib.error.HTTPError as e:
            location = e.headers.get("Location", "")

        if not location:
            log(f"  ❌ No Location header in magic link response")
            return None

        log(f"  Redirect location: {location[:80]}...")

        # Parse the fragment from the redirect URL
        fragment = location.split("#", 1)[-1] if "#" in location else ""
        if not fragment:
            log(f"  ❌ No fragment in redirect URL")
            return None

        params = dict(urllib.parse.parse_qsl(fragment))
        return params

    except Exception as e:
        log(f"  ❌ Error following magic link: {e}")
        return None


async def setup_auth(context: BrowserContext) -> bool:
    """
    Generate a magic link, extract tokens, and inject them as cookies into the browser context.
    """
    log("\n--- Setting up authentication ---")

    # 1. Get users
    result = supabase_request("GET", "/auth/v1/admin/users?per_page=10")
    users = result.get("users", [])
    if not users:
        log("  ❌ No users found")
        return False

    user = next((u for u in users if u.get("email_confirmed_at") or u.get("confirmed_at")), users[0])
    email = user["email"]
    user_id = user["id"]
    log(f"  User: {email}")

    # 2. Generate magic link
    link_result = supabase_request("POST", "/auth/v1/admin/generate_link", {
        "type": "magiclink",
        "email": email,
    })
    action_link = link_result.get("action_link", "")
    if not action_link:
        log(f"  ❌ No action_link: {link_result}")
        return False

    log(f"  Magic link: {action_link[:70]}...")

    # 3. Follow magic link and capture tokens from redirect fragment
    tokens = get_tokens_from_magic_link(action_link)
    if not tokens or "access_token" not in tokens:
        log("  ❌ Could not extract tokens from magic link redirect")
        return False

    access_token = tokens["access_token"]
    refresh_token = tokens.get("refresh_token", "")
    expires_in = int(tokens.get("expires_in", 3600))
    expires_at = int(tokens.get("expires_at", 0))

    log(f"  ✅ Tokens extracted (expires_in={expires_in}s)")

    # 4. Decode JWT to get user ID (avoids relying on admin API for user shape)
    import base64
    jwt_payload_b64 = access_token.split(".")[1]
    # Pad to multiple of 4
    jwt_payload_b64 += "=" * (4 - len(jwt_payload_b64) % 4)
    jwt_payload = json.loads(base64.urlsafe_b64decode(jwt_payload_b64))
    decoded_user_id = jwt_payload.get("sub", user_id)

    # 5. Get full user data from admin API
    user_data = supabase_request("GET", f"/auth/v1/admin/users/{decoded_user_id}")
    if not user_data or not user_data.get("id"):
        # Fallback: build minimal user from JWT claims
        user_data = {
            "id": decoded_user_id,
            "email": jwt_payload.get("email", email),
            "aud": jwt_payload.get("aud", "authenticated"),
            "role": jwt_payload.get("role", "authenticated"),
        }

    # 6. Build session JSON (what @supabase/ssr stores in the cookie)
    session = {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "expires_at": expires_at,
        "refresh_token": refresh_token,
        "user": user_data,
    }
    session_json = json.dumps(session)

    # 6. Supabase SSR v0.8 may chunk the cookie if > 3180 bytes
    # Cookie name: sb-{project_ref}-auth-token or sb-{project_ref}-auth-token.{0,1,2...}
    CHUNK_SIZE = 3180
    if len(session_json) <= CHUNK_SIZE:
        cookies_to_set = [{"name": COOKIE_KEY, "value": session_json}]
    else:
        # Split into chunks
        chunks = [session_json[i:i+CHUNK_SIZE] for i in range(0, len(session_json), CHUNK_SIZE)]
        cookies_to_set = [
            {"name": f"{COOKIE_KEY}.{i}", "value": chunk}
            for i, chunk in enumerate(chunks)
        ]
        log(f"  Session chunked into {len(chunks)} cookies")

    # 7. Inject cookies into browser context
    for cookie in cookies_to_set:
        await context.add_cookies([{
            "name": cookie["name"],
            "value": cookie["value"],
            "domain": "localhost",
            "path": "/",
            "httpOnly": False,
            "secure": False,
            "sameSite": "Lax",
        }])

    log(f"  ✅ Auth cookies injected ({len(cookies_to_set)} cookie(s))")
    return True


async def setup_page_listeners(page: Page, page_name: str):
    errors = []
    net_errors = []

    page.on("console", lambda msg: errors.append({"type": msg.type, "text": msg.text})
            if msg.type in ("error", "warning") else None)
    page.on("pageerror", lambda exc: errors.append({"type": "pageerror", "text": str(exc)}))
    page.on("requestfailed", lambda req: net_errors.append({
        "url": req.url, "failure": req.failure, "method": req.method,
    }))

    console_errors[page_name] = errors
    network_errors[page_name] = net_errors


async def screenshot(page: Page, name: str):
    path = SCREENSHOTS_DIR / f"{name}.png"
    await page.screenshot(path=str(path), full_page=True)
    log(f"  📸 {path.name}")


async def wait_for_idle(page: Page, timeout=10000):
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout)
    except Exception:
        pass


async def test_page(page: Page, path: str, page_name: str, interaction=None):
    log(f"\n{'─'*56}")
    log(f"Testing: {page_name} → {path}")

    console_errors[page_name] = []
    network_errors[page_name] = []
    await setup_page_listeners(page, page_name)

    try:
        resp = await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=15000)
        await wait_for_idle(page)

        # Redirected to login?
        if "/login" in page.url or "/auth/error" in page.url:
            add_issue(page_name, "Auth Redirect", f"Redirected to login from {path}", "high")
            await screenshot(page, f"{page_name}-auth-redirect")
            return

        # HTTP error?
        if resp and resp.status >= 400:
            add_issue(page_name, "HTTP Error", f"Status {resp.status}", "high")

        await screenshot(page, page_name)

        if interaction:
            await interaction(page, page_name)

        # Visible error messages
        for el in (await page.locator("text=/something went wrong|error occurred|failed to load/i").all())[:3]:
            text = (await el.text_content() or "").strip()
            if len(text) > 3:
                add_issue(page_name, "Error Message Visible", text[:150], "high")

    except Exception as e:
        add_issue(page_name, "Navigation Error", str(e)[:200], "critical")
        await screenshot(page, f"{page_name}-error")

    # Console errors
    for err in console_errors.get(page_name, []):
        text = err["text"]
        if err["type"] in ("error", "pageerror") and not any(skip in text for skip in [
            "favicon", "ResizeObserver", "Non-Error promise", "net::ERR_ABORTED",
            "hot-update", "webpack-hmr", "Failed to fetch",
        ]):
            add_issue(page_name, "Console Error", text[:200], "high")

    # Network failures
    for err in network_errors.get(page_name, []):
        url_str = err.get("url", "")
        if not any(skip in url_str for skip in [
            "hot-update", "webpack", "_next/static", "favicon",
            "posthog", "sentry", "analytics",
        ]):
            add_issue(page_name, "Network Error",
                      f"{err.get('method')} {url_str[:100]} — {err.get('failure')}", "medium")


# ─── Page Interactions ────────────────────────────────────────────────────────

async def interact_dashboard(page: Page, name: str):
    await page.wait_for_timeout(1500)
    skeletons = await page.locator("[class*='skeleton']").all()
    if len(skeletons) > 2:
        add_issue(name, "Stale Skeletons", f"{len(skeletons)} skeleton elements still visible", "medium")
    cards = await page.locator("[class*='card']").all()
    log(f"  {len(cards)} card elements")


async def interact_customers(page: Page, name: str):
    # Search
    search = page.locator("input[placeholder*='earch'], input[type='search']").first
    if await search.is_visible():
        await search.fill("test")
        await page.wait_for_timeout(800)
        await screenshot(page, f"{name}-search")
        await search.clear()
    else:
        add_issue(name, "Missing Search", "No search input visible", "low")

    # Click first customer
    first_link = page.locator("a[href*='/customers/'], tr[class*='cursor']").first
    if await first_link.is_visible():
        try:
            await first_link.click(timeout=3000)
            await wait_for_idle(page)
            await screenshot(page, f"{name}-detail")
            current = page.url
            log(f"  Customer detail: {current}")
            if "/customers/" in current:
                # Test stamps/notes/timeline tabs
                tabs = await page.locator("[role='tab']").all()
                log(f"  {len(tabs)} tabs on customer detail")
                for tab in tabs[1:3]:
                    tab_text = (await tab.text_content() or "").strip()[:10]
                    await tab.click()
                    await page.wait_for_timeout(600)
                    await screenshot(page, f"{name}-detail-{tab_text}")
            await page.go_back()
            await wait_for_idle(page)
        except Exception as e:
            add_issue(name, "Customer Detail", str(e)[:100], "low")


async def interact_wallet(page: Page, name: str):
    await page.wait_for_timeout(1000)

    # Color inputs
    color_inputs = await page.locator("input[type='color']").all()
    log(f"  {len(color_inputs)} color inputs")

    # Pass preview
    preview = page.locator("[class*='pass'], [class*='preview']")
    if await preview.count() == 0:
        add_issue(name, "Missing Pass Preview", "No pass preview found in wallet designer", "medium")

    # Save button
    save_btn = page.locator("button:has-text('Save'), button:has-text('Update'), button:has-text('Publish')")
    if await save_btn.count() == 0:
        add_issue(name, "Missing Save Button", "No Save/Update button in wallet designer", "medium")
    else:
        log("  ✅ Save button found")

    # Tabs
    tabs = await page.locator("[role='tab']").all()
    log(f"  {len(tabs)} tabs")
    for tab in tabs[1:4]:
        tab_text = (await tab.text_content() or "tab").strip()[:10]
        try:
            await tab.click()
            await page.wait_for_timeout(500)
            await screenshot(page, f"{name}-{tab_text}")
        except Exception:
            pass


async def interact_analytics(page: Page, name: str):
    await page.wait_for_timeout(2500)
    svgs = await page.locator("svg").all()
    canvases = await page.locator("canvas").all()
    log(f"  {len(svgs)} SVGs, {len(canvases)} canvases")
    if len(svgs) + len(canvases) < 2:
        add_issue(name, "Missing Charts", "Expected at least 2 chart elements on analytics", "medium")

    # Date range / tabs
    tabs = await page.locator("[role='tab']").all()
    for tab in tabs[:4]:
        try:
            await tab.click()
            await page.wait_for_timeout(600)
        except Exception:
            pass
    await screenshot(page, f"{name}-after-tabs")


async def interact_stories(page: Page, name: str):
    await page.wait_for_timeout(1000)
    btns = await page.locator("button:has-text('Generate'), button:has-text('Create'), button:has-text('New')").all()
    if not btns:
        add_issue(name, "Missing Generate Button", "No generate/create button", "low")
    else:
        log(f"  ✅ {len(btns)} action button(s) found")


async def interact_members(page: Page, name: str):
    await page.wait_for_timeout(1000)
    rows = await page.locator("tr:has(td), [class*='row']").all()
    log(f"  {len(rows)} member rows")
    if len(rows) == 0:
        add_issue(name, "Empty List", "No member rows visible", "low")


async def interact_transactions(page: Page, name: str):
    await page.wait_for_timeout(1000)
    rows = await page.locator("tr:has(td)").all()
    log(f"  {len(rows)} transaction rows")


async def interact_notifications(page: Page, name: str):
    await page.wait_for_timeout(1000)
    log("  Checking for create/send button...")
    create_btn = page.locator("button:has-text('Send'), button:has-text('Create'), button:has-text('New')")
    if await create_btn.count() > 0:
        log("  ✅ Create/send button found")
    else:
        add_issue(name, "Missing Create Button", "No create/send button on notifications page", "low")


async def interact_settings(page: Page, name: str):
    await page.wait_for_timeout(1000)
    inputs = await page.locator("input:not([type='hidden']):not([type='submit']), textarea, select").all()
    log(f"  {len(inputs)} form inputs")
    if len(inputs) == 0:
        add_issue(name, "Empty Form", "No form inputs on settings page", "medium")

    save = page.locator("button:has-text('Save'), button[type='submit']")
    if await save.count() == 0:
        add_issue(name, "Missing Save", "No save button on settings page", "medium")

    tabs = await page.locator("[role='tab']").all()
    for tab in tabs[1:]:
        tab_text = (await tab.text_content() or "tab").strip()[:10]
        try:
            await tab.click()
            await page.wait_for_timeout(500)
            await screenshot(page, f"{name}-{tab_text}")
            # Check each tab's inputs
            tab_inputs = await page.locator("input:not([type='hidden']), textarea").all()
            log(f"    Tab '{tab_text}': {len(tab_inputs)} inputs")
        except Exception:
            pass


async def interact_support(page: Page, name: str):
    links = await page.locator("a[href]").all()
    buttons = await page.locator("button").all()
    log(f"  {len(links)} links, {len(buttons)} buttons")


async def interact_admin(page: Page, name: str):
    await page.wait_for_timeout(1000)
    rows = await page.locator("tr:has(td)").all()
    log(f"  {len(rows)} studio rows")

    create_btn = page.locator("button:has-text('Create'), button:has-text('New'), button:has-text('Add')")
    if await create_btn.count() > 0:
        log("  ✅ Create button found")
        try:
            await create_btn.first.click()
            await page.wait_for_timeout(800)
            await screenshot(page, f"{name}-create-modal")
            # Close
            esc = page.locator("button:has-text('Cancel'), [aria-label='Close']")
            if await esc.count() > 0:
                await esc.first.click()
            else:
                await page.keyboard.press("Escape")
        except Exception as e:
            add_issue(name, "Create Modal Error", str(e)[:100], "low")


# ─── Pages ────────────────────────────────────────────────────────────────────

PAGES = [
    ("/", "dashboard", interact_dashboard),
    ("/analytics", "analytics", interact_analytics),
    ("/customers", "customers", interact_customers),
    ("/transactions", "transactions", interact_transactions),
    ("/notifications", "notifications", interact_notifications),
    ("/wallet", "wallet", interact_wallet),
    ("/stories", "stories", interact_stories),
    ("/members", "members", interact_members),
    ("/settings", "settings", interact_settings),
    ("/support", "support", interact_support),
    ("/admin", "admin", interact_admin),
]


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main():
    log("🚀 Loyalink webapp bug-finding scan")
    log(f"   Base URL: {BASE_URL}")
    log(f"   Screenshots: {SCREENSHOTS_DIR.absolute()}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})

        # Inject auth cookies
        authenticated = await setup_auth(context)
        if not authenticated:
            log("\n❌ Auth setup failed. Exiting.")
            await browser.close()
            return

        page = await context.new_page()

        # Verify auth works
        log("\n--- Verifying auth works ---")
        await page.goto(BASE_URL, wait_until="domcontentloaded", timeout=15000)
        await wait_for_idle(page)
        await screenshot(page, "00-authenticated-check")
        log(f"  URL after navigate: {page.url}")

        if "/login" in page.url:
            log("  ❌ Still redirecting to login — cookie injection failed")
            await browser.close()
            return

        log("  ✅ Authentication confirmed!")

        # Run page tests
        for path, name, interaction in PAGES:
            await test_page(page, path, name, interaction)
            await page.wait_for_timeout(300)

        await context.close()
        await browser.close()

    # ── Report ────────────────────────────────────────────────────────────────
    log("\n" + "="*60)
    log("📊 BUG REPORT")
    log("="*60)

    by_severity = {"critical": [], "high": [], "medium": [], "low": []}
    for issue in issues:
        by_severity[issue["severity"]].append(issue)

    if not issues:
        log("✅ No issues found!")
    else:
        for sev in ["critical", "high", "medium", "low"]:
            sev_issues = by_severity[sev]
            if sev_issues:
                emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵"}[sev]
                log(f"\n{emoji} {sev.upper()} ({len(sev_issues)}):")
                for issue in sev_issues:
                    log(f"  [{issue['page']}] {issue['type']}: {issue['description']}")

    log(f"\n📁 Screenshots: {SCREENSHOTS_DIR.absolute()}")
    log(f"🐛 Total issues: {len(issues)}")

    report = SCREENSHOTS_DIR / "bug-report.json"
    with open(report, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "issues": issues,
            "console_errors": {k: v for k, v in console_errors.items() if v},
            "network_errors": {k: v for k, v in network_errors.items() if v},
        }, f, indent=2)
    log(f"📄 Report: {report}")


if __name__ == "__main__":
    asyncio.run(main())
