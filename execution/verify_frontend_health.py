import urllib.request
import json

ROUTES = [
    "/",
    "/habits.html",
    "/habits",
    "/progress.html",
    "/analytics.html",
    "/settings.html",
    "/habit-detail.html",
    "/api/habits",
    "/api/categories",
    "/api/progression"
]

def check_all():
    all_ok = True
    for route in ROUTES:
        url = f"http://127.0.0.1:3000{route}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HealthCheck/1.0"})
            with urllib.request.urlopen(req, timeout=3) as res:
                code = res.getcode()
                content_type = res.headers.get("Content-Type", "")
                print(f"[OK] {route:<22} -> HTTP {code} ({content_type.split(';')[0]})", flush=True)
        except Exception as e:
            print(f"[ERR] {route:<22} -> {e}", flush=True)
            all_ok = False
    return all_ok

if __name__ == "__main__":
    success = check_all()
    if success:
        print("\nAll routes verified successfully!")
    else:
        print("\nSome routes had errors.")
