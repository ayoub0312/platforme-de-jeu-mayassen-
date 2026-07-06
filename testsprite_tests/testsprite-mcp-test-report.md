# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** obooking-game
- **Date:** 2026-06-12
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

### Requirement: Admin Authentication
- **Description:** Verification of administrative access credentials for superadmins and partners.

#### Test TC001 Admin authentication with valid and invalid credentials
- **Test Code:** [TC001_test_admin_authentication_with_valid_and_invalid_credentials.py](./TC001_test_admin_authentication_with_valid_and_invalid_credentials.py)
- **Test Error:** `AssertionError: Expected 200, got 401`
- **Test Visualization and Result:** [View Result](https://www.testsprite.com/dashboard/mcp/tests/475ae6a7-f578-4c09-b180-44da80309b50/701ba0aa-80d9-49ef-9f46-1796967a9568)
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The login credentials passed in the test (e.g., `admin@agency.com`) are not seeded or verified in the SQLite database, returning an unauthorized (401) response instead of a successful login token session.

---

### Requirement: Campaigns Management
- **Description:** Accessing configurations, active prizes, and real-time stocks of campaigns.

#### Test TC002 Get campaign details for existing and missing campaigns
- **Test Code:** [TC002_test_get_campaign_details_for_existing_and_missing_campaigns.py](./TC002_test_get_campaign_details_for_existing_and_missing_campaigns.py)
- **Test Error:** `AssertionError: Expected 200 for existing campaign, got 400`
- **Test Visualization and Result:** [View Result](https://www.testsprite.com/dashboard/mcp/tests/475ae6a7-f578-4c09-b180-44da80309b50/44d266d7-3bc3-44d3-ba60-8ab04bb5dc5c)
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The query request failed with a 400 Bad Request because the campaign ID specified in the test payload does not exist in the empty SQLite database.

---

### Requirement: Lead Capture
- **Description:** Capturing customer details (name, email, phone) and issuing starting spin tokens.

#### Test TC003 Capture lead with valid and duplicate data
- **Test Code:** [TC003_test_capture_lead_with_valid_and_duplicate_data.py](./TC003_test_capture_lead_with_valid_and_duplicate_data.py)
- **Test Error:** `AssertionError: Failed on valid lead creation: Expected 200 OK but got 400`
- **Test Visualization and Result:** [View Result](https://www.testsprite.com/dashboard/mcp/tests/475ae6a7-f578-4c09-b180-44da80309b50/4cf9b714-97e0-4a77-9167-b26680c364ee)
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** The request failed input validation or parent entity checking because the campaignId and partnerId passed by the test could not be found.

---

### Requirement: Draw Execution (Roulette Spin)
- **Description:** Concurrency-safe play token consumption, random prize drawing, and inventory deduction.

#### Test TC004 Spin roulette with rate limiting and stock control
- **Test Code:** [TC004_test_spin_roulette_with_rate_limiting_and_stock_control.py](./TC004_test_spin_roulette_with_rate_limiting_and_stock_control.py)
- **Test Error:** `SQLITE_CONSTRAINT: SQLite error: FOREIGN KEY constraint failed` (tRPC 500 error)
- **Test Visualization and Result:** [View Result](https://www.testsprite.com/dashboard/mcp/tests/475ae6a7-f578-4c09-b180-44da80309b50/e86970a7-e8ab-4c67-a886-767d87586363)
- **Status:** ❌ Failed
- **Severity:** CRITICAL
- **Analysis / Findings:** A database foreign key constraint failed on the lead capture insert preceding the spin. The test passes unseeded campaign and partner IDs that do not reference any existing rows in the SQLite tables.

---

### Requirement: Secure Prize Validation
- **Description:** Secure fetching of won prizes using HMAC SHA256 signature verification.

#### Test TC005 Get user prizes by email with valid and invalid signature
- **Test Code:** [TC005_test_get_user_prizes_by_email_with_valid_and_invalid_signature.py](./TC005_test_get_user_prizes_by_email_with_valid_and_invalid_signature.py)
- **Test Error:** `AssertionError: Expected 200 OK, got 400`
- **Test Visualization and Result:** [View Result](https://www.testsprite.com/dashboard/mcp/tests/475ae6a7-f578-4c09-b180-44da80309b50/68e98d7e-3354-4327-847b-286ce7980a2d)
- **Status:** ❌ Failed
- **Severity:** HIGH
- **Analysis / Findings:** Request returned a 400 error due to input format mismatch or validation failure in the tRPC procedure.

---

## 3️⃣ Coverage & Matching Metrics

- **0.00%** of tests passed (0 out of 5 cases)

| Requirement | Total Tests | ✅ Passed | ❌ Failed | ⚠️ Blocked |
| :--- | :---: | :---: | :---: | :---: |
| Admin Authentication | 1 | 0 | 1 | 0 |
| Campaigns Management | 1 | 0 | 1 | 0 |
| Lead Capture | 1 | 0 | 1 | 0 |
| Draw Execution (Roulette Spin) | 1 | 0 | 1 | 0 |
| Secure Prize Validation | 1 | 0 | 1 | 0 |
| **Total** | **5** | **0** | **5** | **0** |

---

## 4️⃣ Key Gaps / Risks

> ❌ **Critical Gap: Unseeded SQLite Test Environment**
> Every backend API endpoint makes database checks and writes to the SQLite database. Since the tests execute in an unseeded database environment, they fail on foreign key validation check triggers and missing IDs.
> 
> **Recommendation:**
> 1. Create a seed script that populates the SQLite tables with test values (specifically campaign ID, partner ID, and default admin user credentials).
> 2. Run the seeding process prior to execution: `npx prisma db seed` or a direct node script to seed mock data.
*