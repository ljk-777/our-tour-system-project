import subprocess, time, sys
from playwright.sync_api import sync_playwright

BACKEND_DIR = '/home/mas/our-tour-system-project/src/backend'
FRONTEND_DIR = '/home/mas/our-tour-system-project/src/frontend'

PAGES = [
    '/',
    '/auth',
    '/spots',
    '/foods',
    '/route',
    '/diary',
    '/plaza',
    '/admin',
    '/algo',
]

def start(cmd, cwd, name):
    p = subprocess.Popen(cmd, shell=True, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    return p

backend = start('npm run dev', BACKEND_DIR, 'Backend')
frontend = start('npm run dev', FRONTEND_DIR, 'Frontend')

all_errors = []
pages_without_crash = 0
pages_with_error = 0

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture ALL console messages
        page.on('console', lambda msg: all_errors.append({
            'type': msg.type,
            'text': msg.text,
            'page': current_page
        }) if msg.type in ('error', 'warning') else None)

        # Capture page errors (unhandled exceptions)
        page.on('pageerror', lambda err: all_errors.append({
            'type': 'pageerror',
            'text': str(err),
            'page': current_page
        }))

        current_page = ''

        for url_path in PAGES:
            current_page = url_path
            full_url = f'http://localhost:5173{url_path}'
            print(f"\n🌐 {full_url}")
            try:
                page.goto(full_url, wait_until='networkidle', timeout=15000)
                page.wait_for_timeout(2000)
                pages_without_crash += 1
                print(f"  ✅ Loaded successfully")
            except Exception as e:
                print(f"  ❌ Failed to load: {e}")
                all_errors.append({'type': 'navigation', 'text': str(e), 'page': url_path})

        # Take screenshots of each page
        for url_path in PAGES:
            try:
                page.goto(f'http://localhost:5173{url_path}', wait_until='networkidle', timeout=10000)
                page.wait_for_timeout(1000)
                page.screenshot(path=f'/tmp/page_{url_path.replace("/","_")}.png')
            except:
                pass

        browser.close()

finally:
    backend.terminate()
    frontend.terminate()
    time.sleep(1)

print(f"\n{'='*60}")
print(f"PAGES LOADED: {pages_without_crash}/{len(PAGES)}")
print(f"CONSOLE ERRORS/WARNINGS: {len(all_errors)}")
print(f"{'='*60}")

if all_errors:
    print("\nERRORS FOUND:")
    for err in all_errors:
        print(f"  [{err['type']}] on {err['page']}: {err['text'][:200]}")
else:
    print("\n✅ No console errors found on any page!")

print(f"\nScreenshots saved to /tmp/page_*.png")
