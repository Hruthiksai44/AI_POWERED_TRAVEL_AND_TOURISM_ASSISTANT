# -*- coding: utf-8 -*-
"""Test auto-extraction: upload a document and verify entities are created."""
import httpx
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8000"

print("\n" + "="*60)
print("  Auto-Extraction Pipeline Test")
print("="*60)

# 1. Login
r = httpx.post(f"{BASE}/api/auth/login",
    json={"email": "admin@travelassistant.com", "password": "admin123456"}, timeout=10)
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}
print("[OK] Logged in as admin")

# 2. Check cities BEFORE upload
r = httpx.get(f"{BASE}/api/cities/", headers=h, timeout=10)
cities_before = [c["name"] for c in r.json()]
print(f"[INFO] Cities before upload: {cities_before}")

# 3. Upload the Jaipur guide
print("\n--- Uploading Jaipur travel guide ---")
with open("test_jaipur_guide.txt", "rb") as f:
    r = httpx.post(f"{BASE}/api/documents/upload",
        headers=h,
        files={"file": ("jaipur_guide.txt", f, "text/plain")},
        timeout=30)
assert r.status_code == 201, f"Upload failed: {r.text}"
doc = r.json()
doc_id = doc["id"]
print(f"[OK] Document uploaded: {doc_id} (status={doc['status']})")

# 4. Process the document (triggers RAG + auto-seed)
print("\n--- Processing document (RAG + Auto-Extraction) ---")
print("    This may take 30-60 seconds...")
t0 = time.time()
r = httpx.post(f"{BASE}/api/documents/{doc_id}/process", headers=h, timeout=120)
elapsed = time.time() - t0
if r.status_code == 200:
    doc = r.json()
    print(f"[OK] Processed in {elapsed:.1f}s: status={doc['status']}, chunks={doc.get('chunk_count', 0)}")
else:
    print(f"[FAIL] Processing failed ({r.status_code}): {r.text[:200]}")
    sys.exit(1)

# 5. Verify cities AFTER upload
print("\n--- Verifying extracted data ---")
r = httpx.get(f"{BASE}/api/cities/", headers=h, timeout=10)
cities_after = r.json()
city_names = [c["name"] for c in cities_after]
print(f"[INFO] Cities after upload: {city_names}")

new_cities = [c for c in city_names if c not in cities_before]
if new_cities:
    print(f"[OK] New cities created: {new_cities}")
else:
    print("[WARN] No new cities detected -- Jaipur may have been updated instead")

# 6. Find Jaipur and check its data
jaipur = None
for c in cities_after:
    if "jaipur" in c["name"].lower():
        jaipur = c
        break

if jaipur:
    city_id = jaipur["id"]
    print(f"\n[OK] Jaipur found (ID: {city_id})")

    # Check attractions
    r = httpx.get(f"{BASE}/api/cities/{city_id}", headers=h, timeout=10)
    if r.status_code == 200:
        detail = r.json()
        attractions = detail.get("attractions", [])
        foods = detail.get("foods", [])
        print(f"  Attractions: {len(attractions)} -- {[a['name'] for a in attractions[:5]]}")
        print(f"  Foods: {len(foods)} -- {[f['name'] for f in foods[:5]]}")

    # Check hotels
    r = httpx.get(f"{BASE}/api/hotels/city/{city_id}", headers=h, timeout=10)
    if r.status_code == 200:
        hotels = r.json()
        print(f"  Hotels: {len(hotels)}")
        for ht in hotels:
            print(f"    - {ht['name']} (rating: {ht.get('rating', 'N/A')})")

    # Check itineraries
    r = httpx.get(f"{BASE}/api/itineraries/city/{city_id}", headers=h, timeout=10)
    if r.status_code == 200:
        itineraries = r.json()
        print(f"  Itineraries: {len(itineraries)}")
        for it in itineraries:
            print(f"    - {it['name']} ({it.get('duration_days', '?')} days, INR {it.get('price', '?')})")
else:
    print("[FAIL] Jaipur not found in cities after upload!")

print("\n" + "="*60)
print("  Test Complete!")
print("="*60 + "\n")
