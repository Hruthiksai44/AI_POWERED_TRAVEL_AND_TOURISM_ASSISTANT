"""Quick agent test - verifies chat works end-to-end."""
import httpx
import time
import sys
import os

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8000"

print("\n=== Agent Chat Test ===\n")

# Login
r = httpx.post(f"{BASE}/api/auth/login", json={"email":"admin@travelassistant.com","password":"admin123456"}, timeout=10)
if r.status_code != 200:
    print("Login FAILED:", r.text[:200])
    sys.exit(1)
print("[OK] Login successful")
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# Test 1: Simple greeting
print("\nTest 1: Simple greeting...")
start = time.time()
r = httpx.post(f"{BASE}/api/assistant/chat", headers=h,
    json={"message": "Hello!", "language": "en"}, timeout=90)
elapsed = time.time() - start
if r.status_code == 200:
    resp = r.json()["response"]
    print(f"  [OK] Response in {elapsed:.1f}s: {resp[:150]}")
else:
    print(f"  [FAIL] Status {r.status_code}: {r.text[:200]}")

# Test 2: City query
print("\nTest 2: Ask about cities...")
start = time.time()
r = httpx.post(f"{BASE}/api/assistant/chat", headers=h,
    json={"message": "What cities do you have?", "language": "en"}, timeout=90)
elapsed = time.time() - start
if r.status_code == 200:
    resp = r.json()["response"]
    print(f"  [OK] Response in {elapsed:.1f}s: {resp[:200]}")
else:
    print(f"  [FAIL] Status {r.status_code}: {r.text[:200]}")

# Test 3: Hotel query
print("\nTest 3: Ask about hotels...")
start = time.time()
r = httpx.post(f"{BASE}/api/assistant/chat", headers=h,
    json={"message": "Show me hotels in Hyderabad", "language": "en"}, timeout=90)
elapsed = time.time() - start
if r.status_code == 200:
    resp = r.json()["response"]
    print(f"  [OK] Response in {elapsed:.1f}s: {resp[:200]}")
    tc = r.json().get("tool_calls")
    if tc:
        print(f"  Tools used: {[t['tool'] for t in tc]}")
else:
    print(f"  [FAIL] Status {r.status_code}: {r.text[:200]}")

print("\n=== Done ===")
