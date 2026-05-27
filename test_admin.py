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
        page = browser.new_page()

        print("\n📋 ADMIN PAGE TESTS")
        print("─" * 40)

        # Load admin page
        page.goto('http://localhost:5173/admin')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        check("Admin page loaded", '数据管理' in page.title() or page.locator('h1:has-text("数据管理")').count() > 0)

        # Take screenshot
        page.screenshot(path='/tmp/admin_test.png')

        # Check tab buttons exist
        users_tab = page.locator('button:has-text("用户")')
        diaries_tab = page.locator('button:has-text("日记")')
        spots_tab = page.locator('button:has-text("景点")')
        check("Users tab exists", users_tab.count() > 0)
        check("Diaries tab exists", diaries_tab.count() > 0)
        check("Spots tab exists", spots_tab.count() > 0)

        # Check stats cards exist
        total_stat = page.locator('text=总用户数, text=总日记数, text=总景点数').count()
        # Actually check for stat cards
        stat_cards = page.locator('.grid.grid-cols-2 div')
        check("Stat cards visible", stat_cards.count() >= 1)

        # Check table renders
        table_rows = page.locator('table tbody tr')
        row_count = table_rows.count()
        check(f"Table has rows (got {row_count})", row_count > 0)

        # Check CSV export button
        csv_btn = page.locator('button:has-text("导出 CSV")')
        check("CSV export button exists", csv_btn.count() > 0)

        # Check refresh button
        refresh_btn = page.locator('button:has-text("刷新")')
        check("Refresh button exists", refresh_btn.count() > 0)

        # Check search input
        search_input = page.locator('input[placeholder*="搜索"]')
        check("Search input exists", search_input.count() > 0)

        # Switch to diaries tab
        diaries_tab.click()
        page.wait_for_timeout(2000)
        check("Switched to diaries tab", '日记' in page.text_content('h1') or '日记' in page.text_content('p'))

        # Switch to spots tab
        spots_tab.click()
        page.wait_for_timeout(2000)
        check("Switched to spots tab", '景点' in page.text_content('h1') or '景点' in page.text_content('p'))

        # Check sort by clicking a column header
        first_sort_header = page.locator('th').first
        if first_sort_header.count() > 0:
            first_sort_header.click()
            page.wait_for_timeout(500)
            check("Clicked sort header (no crash)", True)

        # Try CSV export (just check the button is clickable)
        csv_btn.click()
        page.wait_for_timeout(1000)
        check("CSV export button clickable", True)

        # Check no console errors
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)
        check(f"No console errors (found {len(console_errors)})", len(console_errors) == 0)

        page.screenshot(path='/tmp/admin_test2.png')

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
