"""Comprehensive API quality test for Travel & Tourism Assistant."""
import httpx
import sys

BASE = "http://localhost:8000"
results = []

def check(name, passed, detail=""):
    status = "[OK]" if passed else "[FAIL]"
    results.append((name, passed))
    print(f"  {status}: {name}" + (f" - {detail}" if detail else ""))

print("\n=== Travel & Tourism Assistant - API Quality Check ===\n")

# 1. Health check
try:
    r = httpx.get(f"{BASE}/api/cities/", timeout=10)
    cities = r.json()
    check("Health Check", r.status_code == 200, f"{len(cities)} cities")
except Exception as e:
    check("Health Check", False, str(e))
    print("Backend not running! Aborting.")
    sys.exit(1)

# 2. Login
r = httpx.post(f"{BASE}/api/auth/login", json={"email":"admin@travelassistant.com","password":"admin123456"})
check("Login", r.status_code == 200)
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# 3. Cities
r = httpx.get(f"{BASE}/api/cities/", headers=h, timeout=10)
city_names = [c["name"] for c in r.json()]
check("Get Cities", r.status_code == 200, str(city_names))
city_id = r.json()[0]["id"] if r.json() else None

# 4. Hotels by city
if city_id:
    r = httpx.get(f"{BASE}/api/hotels/city/{city_id}", headers=h, timeout=10)
    check("Hotels by City", r.status_code == 200, f"{len(r.json())} hotels")

# 5. Analytics dashboard
r = httpx.get(f"{BASE}/api/analytics/dashboard", headers=h, timeout=10)
check("Analytics Dashboard", r.status_code == 200)

# 6. User profile
r = httpx.get(f"{BASE}/api/users/me", headers=h, timeout=10)
check("User Profile", r.status_code == 200, r.json().get("name", ""))

# 7. Reservations
r = httpx.get(f"{BASE}/api/reservations/my", headers=h, timeout=10)
check("My Reservations", r.status_code == 200)

# 8. Conversations
r = httpx.get(f"{BASE}/api/conversations/my", headers=h, timeout=10)
check("My Conversations", r.status_code == 200)

# 9. Date validation
r = httpx.get(f"{BASE}/api/inventory/room-type/00000000-0000-0000-0000-000000000000?start_date=bad-date", headers=h, timeout=10)
check("Date Validation (400)", r.status_code == 400, r.json().get("detail", ""))

# 10. Chat (text)
print("\n  Testing AI Chat (may take 10-60s)...")
r = httpx.post(f"{BASE}/api/assistant/chat",
    headers=h,
    json={"message": "Hello! What cities do you have?", "language": "en"},
    timeout=90)
check("AI Chat", r.status_code == 200, r.json().get("response", "")[:100] if r.status_code == 200 else "")

# Summary
passed = sum(1 for _, p in results if p)
total = len(results)
print(f"\n=== Results: {passed}/{total} passed ===\n")
