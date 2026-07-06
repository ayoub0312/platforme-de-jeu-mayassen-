import requests

BASE_URL = "http://localhost:3001"
TIMEOUT = 30

def test_get_campaign_details_for_existing_and_missing_campaigns():
    existing_campaign_id = "campaign_123"
    missing_campaign_id = "missing_campaign"

    # Test existing active campaign returns 200 with details
    try:
        response_existing = requests.get(
            f"{BASE_URL}/api/trpc/getCampaignDetails",
            params={"id": existing_campaign_id},
            timeout=TIMEOUT
        )
        assert response_existing.status_code == 200, f"Expected 200 for existing campaign, got {response_existing.status_code}"
        json_data = response_existing.json()
        # Validate at least some expected keys in the response (campaign details)
        assert isinstance(json_data, dict), "Response JSON should be an object"
        assert "prizes" in json_data or "prizeSegments" in json_data or "remainingInventory" in json_data, \
            "Response JSON should include campaign prize or inventory details"
    except requests.RequestException as e:
        assert False, f"HTTP request failed for existing campaign: {e}"

    # Test missing or expired campaign returns 404 with message "Campaign not found"
    try:
        response_missing = requests.get(
            f"{BASE_URL}/api/trpc/getCampaignDetails",
            params={"id": missing_campaign_id},
            timeout=TIMEOUT
        )
        assert response_missing.status_code == 404, f"Expected 404 for missing campaign, got {response_missing.status_code}"
        try:
            json_missing = response_missing.json()
            # Accept either JSON error message or plain text error
            msg = ""
            if isinstance(json_missing, dict):
                msg = json_missing.get("message", "") or json_missing.get("error", "")
            else:
                msg = str(json_missing)
            assert "Campaign not found" in msg or response_missing.text == "Campaign not found", \
                "404 response should indicate 'Campaign not found'"
        except ValueError:
            # Not JSON, check plain text response
            assert "Campaign not found" in response_missing.text, \
                "404 response should indicate 'Campaign not found'"
    except requests.RequestException as e:
        assert False, f"HTTP request failed for missing campaign: {e}"

test_get_campaign_details_for_existing_and_missing_campaigns()