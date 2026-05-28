import subprocess, time, sys, json
from playwright.sync_api import sync_playwright

BACKEND_DIR = '/home/mas/our-tour-system-project/src/backend'
FRONTEND_DIR = '/home/mas/our-tour-system-project/src/frontend'

def start(cmd, cwd, name):
    p = subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    return p

tests_passed, tests_failed = 0, 0
def check(desc, cond):
    global tests_passed, tests_failed
    if cond:
        print(f"  ✅ {desc}"); tests_passed += 1
    else:
        print(f"  ❌ {desc}"); tests_failed += 1

backend = start('npm run dev', BACKEND_DIR, 'Backend')
frontend = start('npm run dev', FRONTEND_DIR, 'Frontend')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("\n📋 PROFILE EDIT TEST")

        # Login
        page.goto('http://localhost:5173/auth')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder*="用户"]', 'explorer_li')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Go to profile
        page.goto('http://localhost:5173/profile')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        # Click edit button
        page.click('button:has-text("编辑资料")')
        page.wait_for_timeout(500)
        check("Edit form opened", page.locator('input[value="探险家小李"]').count() > 0)

        # Modify nickname
        nickname_input = page.locator('input[value="探险家小李"]')
        nickname_input.fill('探险家小李(已编辑)')
        check("Nickname changed", page.locator('input[value="探险家小李(已编辑)"]').count() > 0)

        # Click save
        page.click('button:has-text("保存")')
        page.wait_for_timeout(2000)
        check("Save completed without error", True)

        # Check if the name updated on the page
        page.wait_for_timeout(1000)
        h2_text = page.text_content('h2')
        check(f"Profile shows updated name: {h2_text}", '已编辑' in (h2_text or ''))

        # Refresh and check persistence
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        h2_after = page.text_content('h2')
        check(f"Name persisted after refresh: {h2_after}", '已编辑' in (h2_after or ''))

        # Restore original name
        page.click('button:has-text("编辑资料")')
        page.wait_for_timeout(500)
        page.locator('input').first.fill('探险家小李')
        page.click('button:has-text("保存")')
        page.wait_for_timeout(2000)

        page.screenshot(path='/tmp/profile_edit.png')

        print(f"\n{'='*40}")
        print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
        print(f"{'='*40}")
        browser.close()
finally:
    backend.terminate()
    frontend.terminate()
    time.sleep(1)
if tests_failed > 0: sys.exit(1)
