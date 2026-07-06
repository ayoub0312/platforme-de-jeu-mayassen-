import requests

BASE_URL = "http://localhost:3001"
LOGIN_ADMIN_ENDPOINT = "/api/trpc/loginAdmin"
TIMEOUT = 30

def test_admin_authentication_with_valid_and_invalid_credentials():
    url = BASE_URL + LOGIN_ADMIN_ENDPOINT
    headers = {
        "Content-Type": "application/json"
    }

    # Valid credentials test
    valid_payload = {
        "email": "valid_admin@example.com",
        "password": "ValidPassword123!"
    }
    try:
        response = requests.post(url, json=valid_payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data and isinstance(data["token"], str) and data["token"], "Token missing or invalid"
        assert "role" in data and isinstance(data["role"], str) and data["role"], "Role missing or invalid"
        assert "partnerId" in data and isinstance(data["partnerId"], str) and data["partnerId"], "partnerId missing or invalid"
    except requests.RequestException as e:
        assert False, f"Request failed for valid credentials: {e}"

    # Invalid credentials test
    invalid_payload = {
        "email": "invalid_admin@example.com",
        "password": "WrongPassword!"
    }
    try:
        response = requests.post(url, json=invalid_payload, headers=headers, timeout=TIMEOUT)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        # Optionally verify no token is issued
        try:
            data = response.json()
            assert "token" not in data, "Token should not be present for invalid credentials"
        except ValueError:
            # Response has no JSON body, acceptable for 401
            pass
    except requests.RequestException as e:
        assert False, f"Request failed for invalid credentials: {e}"

test_admin_authentication_with_valid_and_invalid_credentials()