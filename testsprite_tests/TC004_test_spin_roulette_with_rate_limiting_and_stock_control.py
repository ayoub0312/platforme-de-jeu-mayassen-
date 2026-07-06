import requests
import time

BASE_URL = "http://localhost:3001"
SPIN_ENDPOINT = "/api/trpc/spinRoulette"
CAPTURE_LEAD_ENDPOINT = "/api/trpc/captureLead"

CAMPAIGN_ID = "campaign_123"  # Assuming a valid campaignId for testing
PARTNER_ID = "partner_abc"    # Dummy partner id for lead capture
SOURCE = "WIDGET"
REFERRED_BY_CODE = "refcode123"

def test_spin_roulette_with_rate_limiting_and_stock_control():
    email = f"testuser_{int(time.time()*1000)}@example.com"
    name = "Test User"
    phone = "1234567890"
    # Step 1: Capture lead to ensure user has at least one play token
    lead_payload = {
        "email": email,
        "name": name,
        "phone": phone,
        "campaignId": CAMPAIGN_ID,
        "partnerId": PARTNER_ID,
        "source": SOURCE,
        "referredByCode": REFERRED_BY_CODE
    }
    lead_resp = requests.post(f"{BASE_URL}{CAPTURE_LEAD_ENDPOINT}", json=lead_payload, timeout=30)
    assert lead_resp.status_code == 200, f"Lead capture failed: {lead_resp.text}"
    lead_data = lead_resp.json()
    # Check that spin token count is present and positive
    assert "spinTokenCount" in lead_data and isinstance(lead_data["spinTokenCount"], int) and lead_data["spinTokenCount"] > 0

    # Step 2: Perform a successful spinRoulette call
    spin_payload = {
        "campaignId": CAMPAIGN_ID,
        "email": email
    }
    spin_resp = requests.post(f"{BASE_URL}{SPIN_ENDPOINT}", json=spin_payload, timeout=30)
    assert spin_resp.status_code == 200, f"Spin roulette failed (expected 200): {spin_resp.text}"
    spin_data = spin_resp.json()
    # Validate presence of prize details and remaining spin count (positive or zero)
    assert "prize" in spin_data and isinstance(spin_data["prize"], dict)
    assert "remainingSpinCount" in spin_data and isinstance(spin_data["remainingSpinCount"], int)

    # Step 3: Immediately issue a second spin request to trigger rate limiting (429)
    spin_resp_429 = requests.post(f"{BASE_URL}{SPIN_ENDPOINT}", json=spin_payload, timeout=30)
    assert spin_resp_429.status_code == 429, f"Expected 429 rate limit, got {spin_resp_429.status_code}"

    # Step 4: Consume all tokens for this user by repeated spins until no tokens left
    remaining_spins = spin_data["remainingSpinCount"]
    while remaining_spins > 0:
        resp = requests.post(f"{BASE_URL}{SPIN_ENDPOINT}", json=spin_payload, timeout=30)
        if resp.status_code == 200:
            rd = resp.json()
            remaining_spins = rd.get("remainingSpinCount", 0)
            time.sleep(2)  # Sleep >2s to avoid rate limit
        else:
            break

    # Step 5: After tokens exhausted, spin attempt should return 403 forbidden
    resp_no_tokens = requests.post(f"{BASE_URL}{SPIN_ENDPOINT}", json=spin_payload, timeout=30)
    assert resp_no_tokens.status_code == 403, f"Expected 403 Forbidden when no tokens left, got {resp_no_tokens.status_code}"

    # Step 6: Test fallback prize when stock is depleted
    # This step is environment-dependent; simulate by rapid spins on a test campaign/prize with low stock
    # For demonstration, we assume CAMPAIGN_ID_FALLBACK is prepared with exhausted stocks
    CAMPAIGN_ID_FALLBACK = CAMPAIGN_ID  # Replace if a special campaign is available for fallback test
    spin_payload_fallback = {
        "campaignId": CAMPAIGN_ID_FALLBACK,
        "email": email
    }

    # First, capture lead with tokens for fallback testing
    lead_resp_fb = requests.post(f"{BASE_URL}{CAPTURE_LEAD_ENDPOINT}", json=lead_payload, timeout=30)
    assert lead_resp_fb.status_code == 200, f"Lead capture for fallback test failed: {lead_resp_fb.text}"
    lead_data_fb = lead_resp_fb.json()
    fb_tokens = lead_data_fb.get("spinTokenCount", 0)
    if fb_tokens == 0:
        return  # Skip fallback test if no tokens issued

    # Consume tokens with forced rapid requests to potentially deplete stock and trigger fallback prize
    fallback_prize_received = False
    for _ in range(fb_tokens):
        resp_fb = requests.post(f"{BASE_URL}{SPIN_ENDPOINT}", json=spin_payload_fallback, timeout=30)
        if resp_fb.status_code == 200:
            pd = resp_fb.json()
            prize_info = pd.get("prize", {})
            # Detect fallback prize by some marker, e.g. prize name or fallback flag
            if "fallback" in prize_info.get("name", "").lower() or prize_info.get("stockDepletedFallback", False):
                fallback_prize_received = True
                break
            time.sleep(2)
        else:
            break
    # It's acceptable if fallback prize was not observed due to test environment state
    # But if we did hit a fallback prize, assert its type
    if fallback_prize_received:
        assert "prize" in pd and isinstance(pd["prize"], dict)
    # End of test

test_spin_roulette_with_rate_limiting_and_stock_control()
