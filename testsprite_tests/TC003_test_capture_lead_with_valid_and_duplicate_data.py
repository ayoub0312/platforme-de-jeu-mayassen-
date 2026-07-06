import requests
import uuid

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_capture_lead_with_valid_and_duplicate_data():
    url = f"{BASE_URL}/api/trpc/captureLead"
    headers = {
        "Content-Type": "application/json"
    }

    # Generate unique identifiers to avoid actual duplicates except for duplicate test
    unique_email = f"user_{uuid.uuid4()}@example.com"
    name = "Test User"
    phone = "1234567890"  # Changed phone to digits only to avoid validation errors
    campaign_id = "campaign_test_001"
    partner_id = "partner_test_001"
    source = "unit_test"
    referred_by_code = "ref_test_001"

    payload_valid = {
        "email": unique_email,
        "name": name,
        "phone": phone,
        "campaignId": campaign_id,
        "partnerId": partner_id,
        "source": source,
        "referredByCode": referred_by_code
    }

    # First call: register a new lead with valid data
    created_lead = None
    try:
        resp = requests.post(url, json=payload_valid, headers=headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Expected 200 OK but got {resp.status_code}"
        data = resp.json()
        # Validate response has player profile details and spin tokens count
        assert isinstance(data, dict), "Response should be a JSON object"
        # Check for email string in response
        assert "email" in data and isinstance(data["email"], str), "Response missing or invalid email"
        # For spin tokens, check for 'spinTokens' key and that it's an int
        assert "spinTokens" in data and isinstance(data["spinTokens"], int), "Response missing or invalid spinTokens count"

        created_lead = data
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Failed on valid lead creation: {e}")

    # Second call: post with the same userId (email) and campaignId -> expect conflict or validation error
    try:
        resp_dup = requests.post(url, json=payload_valid, headers=headers, timeout=TIMEOUT)
        # Should return either 4xx (likely 409 conflict or 400 validation error)
        assert resp_dup.status_code in (400, 409), f"Expected 400 or 409 on duplicate but got {resp_dup.status_code}"
        err_data = resp_dup.json()
        # Optionally check for error message keys in response
        error_keys = ["error", "message", "validationErrors"]
        assert any(key in err_data for key in error_keys), "Error response missing error message"
    except (requests.RequestException, AssertionError) as e:
        raise AssertionError(f"Failed on duplicate lead rejection: {e}")

    # Third call: post with invalid data (e.g. missing email or invalid email)
    invalid_payloads = [
        {**payload_valid, "email": ""},  # Empty email
        {**payload_valid, "email": "invalid-email-format"},  # bad email format
        {**payload_valid, "campaignId": ""},  # Missing campaignId
        {**payload_valid, "phone": ""},  # Missing phone maybe invalid
        {**payload_valid, "name": ""},  # Empty name
    ]
    for invalid_data in invalid_payloads:
        try:
            resp_invalid = requests.post(url, json=invalid_data, headers=headers, timeout=TIMEOUT)
            assert resp_invalid.status_code in (400, 422), f"Expected 400 or 422 on invalid data but got {resp_invalid.status_code}"
            err_data = resp_invalid.json()
            error_keys = ["error", "message", "validationErrors"]
            assert any(key in err_data for key in error_keys), "Invalid error response missing error info"
        except (requests.RequestException, AssertionError) as e:
            raise AssertionError(f"Failed on invalid data rejection: {e}")

# Call the test function
test_capture_lead_with_valid_and_duplicate_data()
