import requests
import hmac
import hashlib
import urllib.parse

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

# Shared secret key used for HMAC signature generation in server-to-server communication.
# This should match the server secret used to verify the signature.
# Since the PRD does not provide it, we assume a test secret here for demonstration.
SHARED_SECRET_KEY = b"test_shared_secret_key"

def generate_hmac_signature(email: str, secret_key: bytes) -> str:
    """Generate SHA256 HMAC signature for the given email using the secret key."""
    return hmac.new(secret_key, email.encode('utf-8'), hashlib.sha256).hexdigest()

def test_get_user_prizes_by_email_with_valid_and_invalid_signature():
    email = "user@example.com"

    # Generate a valid signature for the email
    valid_signature = generate_hmac_signature(email, SHARED_SECRET_KEY)

    # Perform GET request with valid signature using params to handle encoding
    try:
        resp_valid = requests.get(
            f"{BASE_URL}/api/trpc/getUserPrizesByEmail",
            params={"email": email, "signature": valid_signature},
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        raise AssertionError(f"GET with valid signature request failed: {e}")

    # Validate the response for valid signature
    assert resp_valid.status_code == 200, f"Expected 200 OK, got {resp_valid.status_code}"
    try:
        prizes = resp_valid.json()
    except ValueError:
        raise AssertionError("Response with valid signature is not valid JSON")
    assert isinstance(prizes, list), "Response with valid signature should be a list of prizes"

    # Prepare an invalid signature (random string)
    invalid_signature = "invalid_signature_1234567890"

    # Perform GET request with invalid signature using params
    try:
        resp_invalid = requests.get(
            f"{BASE_URL}/api/trpc/getUserPrizesByEmail",
            params={"email": email, "signature": invalid_signature},
            timeout=TIMEOUT
        )
    except requests.RequestException as e:
        raise AssertionError(f"GET with invalid signature request failed: {e}")

    # Validate the response for invalid signature
    assert resp_invalid.status_code == 401, f"Expected 401 Unauthorized, got {resp_invalid.status_code}"
    text = resp_invalid.text.lower()
    assert "signature verification failed" in text, "Response with invalid signature should indicate signature verification failure"

test_get_user_prizes_by_email_with_valid_and_invalid_signature()
