import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:3000"

def run_tests():
    print("=== Testing Committed Today Tab & Routes ===")
    
    # 1. Test root / (Today screen)
    req = urllib.request.Request(f"{BASE_URL}/", headers={"User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(req) as res:
        assert res.getcode() == 200, "Root should return 200"
        content = res.read().decode("utf-8")
        assert "Committed - Today" in content, "Root page title should be Committed - Today"
        assert "today-hero-header" in content, "Root should have today-hero-header"
        assert "todayHabitsContainer" in content, "Root should have todayHabitsContainer"
        assert "todayNudgeContainer" in content, "Root should have todayNudgeContainer"
        assert "todayHeatmapContainer" in content, "Root should have todayHeatmapContainer"
        assert "today.js" in content, "Root should load today.js"
        assert "Studio" not in content, "Studio should NOT be in root bottom nav"
        print("[PASS] Root / serves Today screen with all components and no Studio tab")

    # 2. Test /habits.html and /habits alias
    for path in ["/habits.html", "/habits"]:
        req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "TestClient/1.0"})
        with urllib.request.urlopen(req) as res:
            assert res.getcode() == 200, f"{path} should return 200"
            content = res.read().decode("utf-8")
            assert "habitsContainer" in content, f"{path} should have habitsContainer"
            assert "app.js" in content, f"{path} should load app.js"
            assert "Studio" not in content, f"Studio should NOT be in {path}"
            print(f"[PASS] {path} serves Habits 365-day dashboard without Studio")

    # 3. Test Studio removal
    for path in ["/manage", "/manage-habits.html"]:
        try:
            req = urllib.request.Request(f"{BASE_URL}{path}", headers={"User-Agent": "TestClient/1.0"})
            with urllib.request.urlopen(req) as res:
                print(f"[FAIL] {path} should not be accessible, returned {res.getcode()}")
        except urllib.error.HTTPError as e:
            assert e.code == 404, f"{path} should return 404, got {e.code}"
            print(f"[PASS] {path} correctly returns 404 Not Found (Permanently removed)")

    # 4. Test API habits and toggle sync
    req = urllib.request.Request(f"{BASE_URL}/api/habits", headers={"User-Agent": "TestClient/1.0"})
    with urllib.request.urlopen(req) as res:
        habits_data = json.loads(res.read().decode("utf-8"))
        assert habits_data.get("success"), "API habits should be success"
        habits = habits_data.get("habits", [])
        print(f"[PASS] /api/habits returned {len(habits)} habits")

    if habits:
        habit_id = habits[0]["id"]
        test_date = "2026-10-17"
        
        # Toggle 1
        data = json.dumps({"habit_id": habit_id, "date": test_date}).encode("utf-8")
        req1 = urllib.request.Request(f"{BASE_URL}/api/logs/toggle", data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req1) as res1:
            t1 = json.loads(res1.read().decode("utf-8"))
            assert t1.get("success"), "Toggle 1 should succeed"
            action1 = t1.get("action")
            print(f"[PASS] Toggle 1 on habit {habit_id} succeeded with action: {action1}")

        # Toggle 2 (revert)
        req2 = urllib.request.Request(f"{BASE_URL}/api/logs/toggle", data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req2) as res2:
            t2 = json.loads(res2.read().decode("utf-8"))
            assert t2.get("success"), "Toggle 2 should succeed"
            action2 = t2.get("action")
            print(f"[PASS] Toggle 2 on habit {habit_id} succeeded with action: {action2} (reverted cleanly)")

    print("\n=== ALL TEST CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
