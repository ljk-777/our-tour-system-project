import subprocess, time, sys
from playwright.sync_api import sync_playwright

BACKEND_DIR = '/home/mas/our-tour-system-project/src/backend'
FRONTEND_DIR = '/home/mas/our-tour-system-project/src/frontend'

def start(cmd, cwd, name):
    p = subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    return p

tests_passed = 0
tests_failed = 0

def check(desc, condition):
    global tests_passed, tests_failed
    if condition:
        print(f"  \u2705 {desc}")
        tests_passed += 1
    else:
        print(f"  \u274c {desc}")
        tests_failed += 1

backend = start('npm run dev', BACKEND_DIR, 'Backend')
frontend = start('npm run dev', FRONTEND_DIR, 'Frontend')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("\n\U0001f4cb PROFILE PAGE TESTS")

        # Login first
        page.goto('http://localhost:5173/auth')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder*="\u7528\u6237"]', 'explorer_li')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Navigate to profile
        page.goto('http://localhost:5173/profile')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        check("Profile page loaded without crash", 'profile' in page.url or 'Profile' in page.title())

        # Take screenshot
        page.screenshot(path='/tmp/profile_test.png')

        # Check for user info
        user_nickname = page.text_content('h2')
        check(f"Shows user nickname: {user_nickname}", user_nickname and len(user_nickname) > 0)

        # Check tab buttons
        overview_tab = page.locator('button:has-text("\u6570\u636e\u6982\u89c8")')
        diaries_tab = page.locator('button:has-text("\u6211\u7684\u65e5\u8bb0")')
        info_tab = page.locator('button:has-text("\u57fa\u672c\u8d44\u6599")')
        check("Overview tab exists", overview_tab.count() > 0)
        check("Diaries tab exists", diaries_tab.count() > 0)
        check("Info tab exists", info_tab.count() > 0)

        # Check edit button
        edit_btn = page.locator('button:has-text("\u7f16\u8f91\u8d44\u6599")')
        check("Edit button exists", edit_btn.count() > 0)

        # Check stat card labels individually
        check("Stat card '\u65e5\u8bb0' exists", page.locator('text=\u65e5\u8bb0').count() > 0)
        check("Stat card '\u666f\u70b9' exists", page.locator('text=\u666f\u70b9').count() > 0)
        check("Stat card '\u5728\u7ad9\u5929' exists", page.locator('text=\u5728\u7ad9\u5929').count() > 0)
        check("Stat card '\u83b7\u8d5e' exists", page.locator('text=\u83b7\u8d5e').count() > 0)

        # Check guest mode (no login)
        page.evaluate('localStorage.clear()')
        page.goto('http://localhost:5173/profile')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        check("Guest sees login prompt", page.locator('text=\u8bf7\u5148\u767b\u5f55').count() > 0 or page.locator('text=\u53bb\u767b\u5f55').count() > 0)

        page.screenshot(path='/tmp/profile_guest.png')

        print(f"\n{'='*40}")
        print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
        print(f"{'='*40}")
        browser.close()
finally:
    backend.terminate()
    frontend.terminate()
    time.sleep(1)

if tests_failed > 0:
    sys.exit(1)
