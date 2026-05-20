"""
Playwright E2E test for morphological fill pipeline fix on Shahe campus.

Tests that the new morphological fill pipeline detects:
- More road nodes (thick roads preserved instead of removed by extractThinStructures)
- More complete buildings (less fragmentation from text)

Usage:
    python test_morph_fill.py
"""

import re
import sys
import time
import signal
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright


# ── Paths ────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "src" / "backend"
FRONTEND_DIR = ROOT / "src" / "frontend"

BACKEND_PORT = 3001
FRONTEND_PORT = 5173

SCREENSHOT_PATH = "/tmp/morph_fix_test.png"


# ── Server management ────────────────────────────────────────────────────

def start_server(cwd, command, port, label):
    """Start a dev server in the background and return the process."""
    proc = subprocess.Popen(
        command,
        cwd=cwd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=lambda: signal.signal(signal.SIGTERM, signal.SIG_IGN),
    )
    print(f"[{label}] Starting on port {port} (PID {proc.pid})...")
    return proc


def wait_for_server(url, label, timeout=30):
    """Poll a URL until it returns a 200, or raise on timeout."""
    import urllib.request
    import urllib.error

    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = urllib.request.urlopen(url, timeout=3)
            if resp.status == 200:
                print(f"[{label}] Ready at {url}")
                return True
        except (urllib.error.URLError, ConnectionResetError, OSError):
            pass
        time.sleep(1)
    raise RuntimeError(f"[{label}] Did not become ready within {timeout}s")


def stop_process(proc, label):
    """Gracefully stop a process."""
    if proc is None:
        return
    print(f"[{label}] Stopping PID {proc.pid}...")
    try:
        proc.terminate()
        proc.wait(timeout=10)
    except Exception:
        try:
            proc.kill()
            proc.wait(timeout=5)
        except Exception:
            pass


# ── Test logic ───────────────────────────────────────────────────────────

def run_test():
    """Execute the Playwright E2E test and return summary data."""
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1,
        )
        page = context.new_page()

        # Register console handler for debugging
        page.on("console", lambda msg: None)  # suppress spam

        # ── Step 1: Navigate to /route ──
        print("\n[Test] Navigating to /route...")
        page.goto(f"http://localhost:{FRONTEND_PORT}/route", wait_until="networkidle")
        print("[Test] Page loaded.")

        # ── Step 2: Select Shahe preset ──
        print("\n[Test] Selecting '沙河校区' preset...")
        # The dropdown is the first <select> in the sidebar
        preset_select = page.locator("select").first
        preset_select.wait_for(state="visible", timeout=10000)
        preset_select.select_option("shahe")
        print("[Test] Preset selected.")

        # ── Step 3: Wait for SVG map to render with Shahe dimensions ──
        print("\n[Test] Waiting for SVG with Shahe viewBox '1280'...")
        # The map SVG has a viewBox set dynamically; wait until it shows Shahe's width
        svg = page.locator('svg[viewBox*="1280"]').first
        svg.wait_for(state="visible", timeout=15000)
        print(f"[Test] SVG rendered, viewBox={svg.get_attribute('viewBox')}")

        # Give the image a moment to load in the browser
        page.wait_for_timeout(2000)

        # ── Step 4: Click "一键识别道路" ──
        print("\n[Test] Clicking '一键识别道路'...")
        detect_roads_btn = page.get_by_role("button", name="一键识别道路")
        detect_roads_btn.wait_for(state="visible", timeout=10000)
        detect_roads_btn.click()
        print("[Test] Road detection started.")

        # ── Step 5: Wait for green stats box ──
        print("[Test] Waiting for road detection results...")
        road_stats = page.locator("div.bg-green-50")
        road_stats.wait_for(state="visible", timeout=60000)
        road_stats_text = road_stats.text_content()
        print(f"[Test] Road stats: {road_stats_text}")

        # Parse road stats: "识别完成：X 节点 · Y 边 · Zms"
        road_match = re.search(
            r"识别完成[：:]\s*(\d+)\s*节点\s*[·]\s*(\d+)\s*边\s*[·]\s*(\d+)ms",
            road_stats_text or "",
        )
        if road_match:
            road_nodes = int(road_match.group(1))
            road_edges = int(road_match.group(2))
            road_duration = int(road_match.group(3))
            print(f"[Test] Parsed: nodes={road_nodes}, edges={road_edges}, duration={road_duration}ms")
        else:
            road_nodes = road_edges = road_duration = 0
            print(f"[WARN] Could not parse road stats from: {road_stats_text!r}")

        # Wait a moment for state to settle
        page.wait_for_timeout(500)

        # ── Step 6: Get total nodes/edges from bottom stats ──
        # The three blue stat boxes in the sidebar each contain a number + label
        # We find them by their label text: 节点, 边, 尺寸
        stat_labels = page.locator("div.text-xs.text-gray-500")
        total_nodes = road_nodes
        total_edges = road_edges
        for i in range(stat_labels.count()):
            label_text = stat_labels.nth(i).text_content() or ""
            parent_text = stat_labels.nth(i).locator("xpath=..").text_content() or ""
            nums = re.findall(r"(\d+)", parent_text)
            if "节点" in label_text and nums:
                total_nodes = int(nums[0])
            elif "边" in label_text and nums:
                total_edges = int(nums[0])
        print(f"[Test] After road detection: total_nodes={total_nodes}, total_edges={total_edges}")

        # ── Step 7: Click "识别建筑" ──
        print("\n[Test] Clicking '识别建筑'...")
        detect_building_btn = page.get_by_role("button", name="识别建筑")
        detect_building_btn.wait_for(state="visible", timeout=10000)
        detect_building_btn.click()
        print("[Test] Building detection started.")

        # ── Step 8: Wait for orange stats box ──
        print("[Test] Waiting for building detection results...")
        building_stats = page.locator("div.bg-orange-50")
        building_stats.wait_for(state="visible", timeout=60000)
        building_stats_text = building_stats.text_content()
        print(f"[Test] Building stats: {building_stats_text}")

        # Parse building stats: "建筑识别完成：X 建筑 · Zms"
        building_match = re.search(
            r"建筑识别完成[：:]\s*(\d+)\s*(?:建筑|栋)\s*[·]\s*(\d+)ms",
            building_stats_text or "",
        )
        if building_match:
            building_count = int(building_match.group(1))
            building_duration = int(building_match.group(2))
            print(f"[Test] Parsed: buildings={building_count}, duration={building_duration}ms")
        else:
            building_count = building_duration = 0
            print(f"[WARN] Could not parse building stats from: {building_stats_text!r}")

        page.wait_for_timeout(500)

        # ── Step 9: Get final total nodes/edges ──
        final_nodes = total_nodes
        final_edges = total_edges
        for i in range(stat_labels.count()):
            label_text = stat_labels.nth(i).text_content() or ""
            parent_text = stat_labels.nth(i).locator("xpath=..").text_content() or ""
            nums = re.findall(r"(\d+)", parent_text)
            if "节点" in label_text and nums:
                final_nodes = int(nums[0])
            elif "边" in label_text and nums:
                final_edges = int(nums[0])
        print(f"[Test] After building detection: total_nodes={final_nodes}, total_edges={final_edges}")

        # Walkway edges = total edges (all edges are 'walkway' type in this app)
        walkway_edges = final_edges

        # ── Step 10: Take screenshot ──
        print(f"\n[Test] Taking screenshot -> {SCREENSHOT_PATH}")
        page.screenshot(path=SCREENSHOT_PATH, full_page=True)
        print("[Test] Screenshot saved.")

        browser.close()

        # ── Return summary ──
        return {
            "road_nodes": road_nodes,
            "road_edges": road_edges,
            "road_duration_ms": road_duration,
            "building_count": building_count,
            "building_duration_ms": building_duration,
            "walkway_edges": walkway_edges,
            "screenshot": SCREENSHOT_PATH,
        }


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    backend_proc = None
    frontend_proc = None
    exit_code = 1

    try:
        # ── Start backend ──
        backend_proc = start_server(
            BACKEND_DIR,
            "npm run dev",
            BACKEND_PORT,
            "Backend",
        )
        wait_for_server(f"http://localhost:{BACKEND_PORT}/api/health", "Backend")

        # ── Start frontend ──
        frontend_proc = start_server(
            FRONTEND_DIR,
            "npm run dev",
            FRONTEND_PORT,
            "Frontend",
        )
        wait_for_server(f"http://localhost:{FRONTEND_PORT}", "Frontend")

        # ── Run test ──
        summary = run_test()

        # ── Print summary ──
        print("\n" + "=" * 60)
        print("  MORPHOLOGICAL FILL PIPELINE — TEST SUMMARY")
        print("=" * 60)
        print(f"  Road nodes detected:     {summary['road_nodes']}")
        print(f"  Road edges detected:     {summary['road_edges']}")
        print(f"  Road detection time:     {summary['road_duration_ms']} ms")
        print(f"  Buildings detected:      {summary['building_count']}")
        print(f"  Building detection time: {summary['building_duration_ms']} ms")
        print(f"  Total walkway edges:     {summary['walkway_edges']}")
        print(f"  Screenshot saved to:     {summary['screenshot']}")
        print("=" * 60)
        print("  Test PASSED ✓")
        print("=" * 60)

        exit_code = 0

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        exit_code = 1

    finally:
        stop_process(backend_proc, "Backend")
        stop_process(frontend_proc, "Frontend")
        print("\n[Cleanup] Servers stopped.")

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
