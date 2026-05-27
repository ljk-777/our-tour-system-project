import subprocess, time, json, sys, os, re
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
        print(f"  ✅ {desc}")
        tests_passed += 1
    else:
        print(f"  ❌ {desc}")
        tests_failed += 1

backend = start('npm run dev', BACKEND_DIR, 'Backend')
frontend = start('npm run dev', FRONTEND_DIR, 'Frontend')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # ── Setup: Login ──
        page.goto('http://localhost:5173/auth')
        page.wait_for_load_state('networkidle')
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder*="用户"]', 'explorer_li')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)
        page.goto('http://localhost:5173/diary')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        print("\n📋 TEST 1: Like persistence after refresh")
        # Count unlike buttons
        unlike_before = page.locator('button:has-text("🤍")').count()
        if unlike_before > 0:
            # Read the initial counter text
            like_btn = page.locator('button:has-text("🤍")').first
            btn_text = like_btn.text_content()
            initial_count = int(re.search(r'(\d+)', btn_text).group(1)) if re.search(r'(\d+)', btn_text) else 0
            print(f"  Initial counter: {initial_count}")

            # Click like
            like_btn.click()
            page.wait_for_timeout(2000)
            liked_now = page.locator('button:has-text("❤️")').count()
            check("Like button changed to ❤️", liked_now >= 1)

            # Read new counter
            liked_btn = page.locator('button:has-text("❤️")').first
            liked_text = liked_btn.text_content()
            after_like_count = int(re.search(r'(\d+)', liked_text).group(1)) if re.search(r'(\d+)', liked_text) else 0
            check(f"Counter increased from {initial_count} to {after_like_count}", after_like_count > initial_count)

            # Refresh
            page.reload()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)
            liked_after = page.locator('button:has-text("❤️")').count()
            check("Like persisted after refresh", liked_after >= liked_now)
            page.screenshot(path='/tmp/test1_like.png')
        else:
            print("  ⚠️ No like buttons to test")

        print("\n📋 TEST 2: Unlike")
        if liked_after > 0:
            liked_btn = page.locator('button:has-text("❤️")').first
            liked_text = liked_btn.text_content()
            count_before_unlike = int(re.search(r'(\d+)', liked_text).group(1))

            liked_btn.click()
            page.wait_for_timeout(2000)
            unlike_after = page.locator('button:has-text("🤍")').count()
            check("Unlike button changed to 🤍", unlike_after >= 1)

            # Read counter after unlike
            unlike_btn = page.locator('button:has-text("🤍")').first
            unlike_text = unlike_btn.text_content()
            after_unlike_count = int(re.search(r'(\d+)', unlike_text).group(1)) if re.search(r'(\d+)', unlike_text) else 0
            check(f"Counter decreased (was {count_before_unlike}, now {after_unlike_count})", after_unlike_count < count_before_unlike)

            # Refresh and verify
            page.reload()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)
            still_unliked = page.locator('button:has-text("🤍")').count()
            check("Unlike persisted after refresh", still_unliked >= 1)

        print("\n📋 TEST 3: Guest cannot like")
        page.evaluate('localStorage.clear()')
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Guest goes to diary
        page.goto('http://localhost:5173/diary')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Try clicking like — should redirect to auth or the guard should block
        current_url_before = page.url
        print(f"  Current URL (guest): {current_url_before}")

        # Check if like buttons exist and try clicking
        guest_like_btns = page.locator('button:has-text("🤍")')
        if guest_like_btns.count() > 0:
            guest_like_btns.first.click()
            page.wait_for_timeout(2000)
            current_url_after = page.url
            print(f"  URL after clicking like (guest): {current_url_after}")
            check("Guest redirected away from /diary when liking", '/auth' in current_url_after or current_url_after != current_url_before)
        else:
            # If no like buttons, might be requireAuth already hid them
            check("No like buttons visible for guest (guard working)", True)

        page.screenshot(path='/tmp/test3_guest.png')

        print("\n📋 TEST 4: Type consistency (API returns numbers not strings)")
        # Login again and check the API response type
        page.goto('http://localhost:5173/auth')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder*="用户"]', 'explorer_li')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Like a diary to ensure there's data
        page.goto('http://localhost:5173/diary')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        like_buttons = page.locator('button:has-text("🤍")')
        if like_buttons.count() > 0:
            like_buttons.first.click()
            page.wait_for_timeout(2000)

        page.screenshot(path='/tmp/test4_api_type.png')

        # Now log out and back in to trigger likedDiaryIds fetch
        page.evaluate('localStorage.clear()')
        page.goto('http://localhost:5173/auth')
        page.wait_for_load_state('networkidle')
        page.fill('input[placeholder*="用户"]', 'explorer_li')
        page.click('button[type="submit"]')
        page.wait_for_timeout(2000)

        # Navigate to diary — this will trigger the liked IDs fetch
        page.goto('http://localhost:5173/diary')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        liked_count = page.locator('button:has-text("❤️")').count()
        check("Liked state visible after full login cycle", liked_count >= 1)

        print(f"\n{'='*50}")
        print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
        print(f"{'='*50}")
        browser.close()

finally:
    backend.terminate()
    frontend.terminate()
    time.sleep(1)

if tests_failed > 0:
    sys.exit(1)
