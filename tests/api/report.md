# ZiniKart API Integration Test Report

**Execution Time:** 31/5/2026, 7:55:45 pm
**Total Assertions:** 28 | **Passed:** 28 | **Failed:** 0

### Pass Rate: 100%
`[██████████]`

## Summary Table

| Suite | Scenario | Test Case / Assertion | Status | Error Details |
| --- | --- | --- | --- | --- |
| Authentication Endpoints | Best Case | Request OTP with a valid mobile number returns 200 and success: true | ✅ PASS | - |
| Authentication Endpoints | Best Case | Verify OTP with correct code and retailer role context returns 200, status registration_required, and JWT token | ✅ PASS | - |
| Authentication Endpoints | Possible Scenario | Verify OTP saves the optional name parameter on user creation | ✅ PASS | - |
| Authentication Endpoints | Possible Scenario | Verify OTP for an existing user requesting a new role updates the user roles list | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Request OTP with missing phone number returns 400 error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Request OTP with malformed phone number returns 400 error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Verify OTP with incorrect code returns 401 unauthorized error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Verify OTP with invalid role parameter returns 400 error | ✅ PASS | - |
| Retailer Profile Lifecycle | Impossible Scenario | Attempt to create profile without auth token returns 401 or 403 error | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Create retailer profile with valid data returns 201 and profile document ID | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending) | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Verify OTP for retailer with pending profile returns status pending_approval and null token | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from reading another user's profile (returns 403 or 404) | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from updating another user's profile (returns 403 or 404) | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Field Access Security: Owner is blocked from changing their own approvalStatus (value remains pending or is ignored) | ✅ PASS | - |
| Retailer Profile Lifecycle | Impossible Scenario | Attempt to create duplicate retailer profile for the same user is rejected (returns non-201 status) | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Verify OTP for approved retailer profile returns status approved and JWT token | ✅ PASS | - |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create profile without driving license document returns error (non-201 status) | ✅ PASS | - |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create profile without auth token returns 401 or 403 error | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Create delivery partner profile with valid data returns 201 and profile document ID | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending) | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Verify OTP for delivery partner with pending profile returns status pending_approval and null token | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from reading another user's profile (returns 403 or 404) | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from updating another user's profile (returns 403 or 404) | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Field Access Security: Owner is blocked from changing their own approvalStatus (value remains pending or is ignored) | ✅ PASS | - |
| Delivery Partner Lifecycle | Possible Scenario | Profile Owner is allowed to toggle their own onlineStatus | ✅ PASS | - |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create duplicate delivery partner profile for the same user is rejected (returns non-201 status) | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Verify OTP for approved delivery partner profile returns status approved and JWT token | ✅ PASS | - |
