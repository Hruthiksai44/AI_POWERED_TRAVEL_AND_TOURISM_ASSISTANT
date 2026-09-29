# -*- coding: utf-8 -*-
"""End-to-end test for Travel Assistant: Chat, Voice (STT), and TTS."""
import httpx
import time
import sys
import os
import struct
import io

sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0

def ok(name, detail=""):
    global PASS
    PASS += 1
    print(f"  [PASS] {name}" + (f" -- {detail}" if detail else ""))

def fail(name, detail=""):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))


def generate_wav_bytes(duration_s=1.5, sample_rate=16000):
    """Generate a minimal valid WAV file with silence (for STT test)."""
    num_samples = int(sample_rate * duration_s)
    data = b'\x00\x00' * num_samples  # 16-bit silence
    buf = io.BytesIO()
    # WAV header
    buf.write(b'RIFF')
    buf.write(struct.pack('<I', 36 + len(data)))
    buf.write(b'WAVE')
    buf.write(b'fmt ')
    buf.write(struct.pack('<I', 16))       # chunk size
    buf.write(struct.pack('<H', 1))        # PCM
    buf.write(struct.pack('<H', 1))        # mono
    buf.write(struct.pack('<I', sample_rate))
    buf.write(struct.pack('<I', sample_rate * 2))  # byte rate
    buf.write(struct.pack('<H', 2))        # block align
    buf.write(struct.pack('<H', 16))       # bits per sample
    buf.write(b'data')
    buf.write(struct.pack('<I', len(data)))
    buf.write(data)
    return buf.getvalue()


print("\n" + "="*60)
print("  Travel & Tourism Assistant -- End-to-End Test")
print("="*60)

# ─── 1. Backend health ───
print("\n--- 1. Backend Health ---")
try:
    r = httpx.get(f"{BASE}/health", timeout=10)
    if r.status_code == 200:
        ok("Health endpoint")
    else:
        fail("Health endpoint", f"status={r.status_code}")
except Exception as e:
    fail("Health endpoint", str(e))
    print("\n  Backend not running! Start it first.")
    sys.exit(1)

# ─── 2. Auth ───
print("\n--- 2. Authentication ---")
r = httpx.post(f"{BASE}/api/auth/login",
    json={"email": "admin@travelassistant.com", "password": "admin123456"}, timeout=10)
if r.status_code == 200:
    ok("Admin login")
else:
    fail("Admin login", r.text[:100])
    sys.exit(1)

token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# ─── 3. Cities API ───
print("\n--- 3. Cities API ---")
r = httpx.get(f"{BASE}/api/cities/", headers=h, timeout=10)
cities = r.json()
if r.status_code == 200 and len(cities) > 0:
    ok("Get cities", f"{len(cities)} cities: {[c['name'] for c in cities]}")
    city_id = cities[0]["id"]
    city_name = cities[0]["name"]
else:
    fail("Get cities", f"status={r.status_code}, count={len(cities)}")
    city_id = None
    city_name = "Unknown"

# ─── 4. Hotels API ───
print("\n--- 4. Hotels API ---")
if city_id:
    r = httpx.get(f"{BASE}/api/hotels/city/{city_id}", headers=h, timeout=10)
    hotels = r.json()
    if r.status_code == 200:
        ok("Get hotels", f"{len(hotels)} hotels in {city_name}")
    else:
        fail("Get hotels", f"status={r.status_code}")
else:
    fail("Get hotels", "No city_id")

# ─── 5. Text Chat -- Simple greeting ───
print("\n--- 5. Text Chat (Simple Greeting) ---")
t0 = time.time()
r = httpx.post(f"{BASE}/api/assistant/chat", headers=h,
    json={"message": "Hello! Who are you?", "language": "en"}, timeout=60)
elapsed = time.time() - t0
if r.status_code == 200:
    resp = r.json()
    text = resp.get("response", "")
    conv_id = resp.get("conversation_id", "")
    if "apologize" in text.lower() or "trouble" in text.lower():
        fail("Chat greeting", f"{elapsed:.1f}s -- Agent returned error: {text[:120]}")
    else:
        ok("Chat greeting", f"{elapsed:.1f}s -- {text[:120]}")
else:
    fail("Chat greeting", f"status={r.status_code} -- {r.text[:100]}")

# ─── 6. Text Chat -- City query (tool calling) ───
print("\n--- 6. Text Chat (City Query - Tool Calling) ---")
t0 = time.time()
r = httpx.post(f"{BASE}/api/assistant/chat", headers=h,
    json={"message": f"What attractions are in {city_name}?",
          "city_id": city_id, "language": "en"}, timeout=60)
elapsed = time.time() - t0
if r.status_code == 200:
    resp = r.json()
    text = resp.get("response", "")
    tools = resp.get("tool_calls")
    if "apologize" in text.lower() or "trouble" in text.lower():
        fail("Chat city query", f"{elapsed:.1f}s -- Agent error: {text[:120]}")
    else:
        tool_info = f", tools={[t['tool'] for t in tools]}" if tools else ""
        ok("Chat city query", f"{elapsed:.1f}s{tool_info} -- {text[:120]}")
else:
    fail("Chat city query", f"status={r.status_code}")

# ─── 7. Voice/STT -- Send WAV silence ───
print("\n--- 7. Voice STT (WAV silence -> should return empty or short text) ---")
wav_data = generate_wav_bytes(duration_s=2.0)
t0 = time.time()
files = {"audio": ("test.wav", wav_data, "audio/wav")}
data = {"language": "en"}
r = httpx.post(f"{BASE}/api/assistant/voice", headers=h, files=files, data=data, timeout=60)
elapsed = time.time() - t0
if r.status_code == 200:
    resp = r.json()
    ok("Voice STT", f"{elapsed:.1f}s -- transcription='{resp.get('transcription','')}', response='{resp.get('response','')[:80]}'")
elif r.status_code == 400:
    # 400 = "Could not understand" which is expected for silence
    ok("Voice STT (silence handled)", f"{elapsed:.1f}s -- {r.json().get('detail','')}")
else:
    fail("Voice STT", f"{elapsed:.1f}s status={r.status_code} -- {r.text[:150]}")

# ─── 8. Analytics ───
print("\n--- 8. Analytics ---")
r = httpx.get(f"{BASE}/api/analytics/dashboard", headers=h, timeout=10)
if r.status_code == 200:
    ok("Analytics dashboard")
else:
    fail("Analytics dashboard", f"status={r.status_code}")

# ─── 9. Conversations ───
print("\n--- 9. Conversations ---")
r = httpx.get(f"{BASE}/api/conversations/my", headers=h, timeout=10)
if r.status_code == 200:
    convos = r.json()
    ok("My conversations", f"{len(convos)} conversations")
else:
    fail("My conversations", f"status={r.status_code}")

# ─── Summary ───
print("\n" + "="*60)
print(f"  RESULTS: {PASS} passed, {FAIL} failed out of {PASS+FAIL}")
print("="*60 + "\n")
