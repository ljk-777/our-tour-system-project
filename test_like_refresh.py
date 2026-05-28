import subprocess, time, json, sys, os
from playwright.sync_api import sync_playwright

BACKEND_DIR = '/home/mas/our-tour-system-project/src/backend'
FRONTEND_DIR = '/home/mas/our-tour-system-project/src/frontend'

def start_server(cmd, cwd, name):
    p = subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    print(f"[{name}] server PID {p.pid}")
    return p

def main():
    backend = start_server('npm run dev', BACKEND_DIR, 'Backend')
    frontend = start_server('npm run dev', FRONTEND_DIR, 'Frontend')

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()

            # Step 1: Clear all localStorage to start fresh
            page.goto('http://localhost:5173/diary')
            page.wait_for_load_state('networkidle')
            page.evaluate('localStorage.clear()')
            page.reload()
            page.wait_for_load_state('networkidle')
            print("✅ Cleared localStorage")

            # Step 2: Login as a known user
            page.goto('http://localhost:5173/auth')
            page.wait_for_load_state('networkidle')
            page.fill('input[placeholder*="用户"]', 'explorer_li')
            page.click('button[type="submit"]')
            page.wait_for_timeout(2000)

            # Verify auth state
            auth_user = page.evaluate('localStorage.getItem("tour_auth_user")')
            print(f"✅ Logged in, localStorage auth present: {auth_user is not None}")

            # Step 3: Navigate to diary page
            page.goto('http://localhost:5173/diary')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)
            print("✅ Diary page loaded")

            # Step 4: Examine current like button state
            unlike_buttons = page.locator('button:has-text("🤍")')
            liked_buttons = page.locator('button:has-text("❤️")')
            count_unlike = unlike_buttons.count()
            count_liked = liked_buttons.count()
            print(f"Unlike buttons (🤍): {count_unlike}")
            print(f"Liked buttons (❤️): {count_liked}")

            if count_unlike == 0 and count_liked == 0:
                print("⚠️ No heart buttons at all! Checking page content...")
                body_text = page.evaluate('document.body.innerText.substring(0, 500)')
                print(f"Page text: {body_text[:200]}")
                page.screenshot(path='/tmp/like_test_no_buttons.png')
            else:
                # Click a like button (prefer unlike button to create a new like)
                if count_unlike > 0:
                    target_button = unlike_buttons.first
                    print("Clicking first 🤍 button to like a diary...")
                else:
                    target_button = liked_buttons.first
                    print("Clicking first ❤️ button to unlike a diary...")

                target_button.click()
                page.wait_for_timeout(2000)

                # Check the new state
                liked_after = page.locator('button:has-text("❤️")').count()
                unlike_after = page.locator('button:has-text("🤍")').count()
                print(f"After click - Heart (❤️): {liked_after}, Unlike (🤍): {unlike_after}")

                # Verify the click changed state
                if count_unlike > 0:
                    state_changed = liked_after > count_liked
                else:
                    state_changed = liked_after < count_liked
                print(f"State changed: {state_changed}")

                # Step 6: REFRESH the page
                page.reload()
                page.wait_for_load_state('networkidle')
                page.wait_for_timeout(4000)
                print("✅ Page refreshed, waited for liked IDs to load")

                # Step 7: Check like persistence
                liked_after_refresh = page.locator('button:has-text("❤️")').count()
                unlike_after_refresh = page.locator('button:has-text("🤍")').count()
                print(f"After refresh - Heart (❤️): {liked_after_refresh}, Unlike (🤍): {unlike_after_refresh}")

                # Determine if like persisted
                if count_unlike > 0:
                    # We liked a diary, so expect one more ❤️ than initially
                    if liked_after_refresh >= liked_after:
                        print("✅ PASS: Like persisted after refresh!")
                    else:
                        print("❌ FAIL: Like count dropped after refresh!")
                else:
                    # We unliked a diary, so expect fewer ❤️
                    if liked_after_refresh <= liked_after:
                        print("✅ PASS: Unlike persisted after refresh!")
                    else:
                        print("❌ FAIL: Unlike disappeared after refresh!")

                # Debug API check
                print("\n--- Debug: Direct API check ---")
                result = page.evaluate('''async () => {
                    try {
                        const resp = await fetch('/api/users/me/liked-diaries', {
                            headers: { 'x-user-id': '1' }
                        });
                        const data = await resp.json();
                        return JSON.stringify(data);
                    } catch(e) { return 'ERROR: ' + e.message; }
                }''')
                print(f"GET /api/users/me/liked-diaries response: {result}")

                # Also check raw diary list for first diary likes count
                result2 = page.evaluate('''async () => {
                    try {
                        const resp = await fetch('/api/diaries?limit=1');
                        const data = await resp.json();
                        if (data.data && data.data.length > 0) {
                            const d = data.data[0];
                            return 'First diary: id=' + d.id + ' title=' + d.title + ' likes=' + d.likes;
                        }
                        return 'No diaries found';
                    } catch(e) { return 'ERROR: ' + e.message; }
                }''')
                print(f"{result2}")

            browser.close()

    finally:
        backend.terminate()
        frontend.terminate()
        time.sleep(1)

if __name__ == '__main__':
    main()
