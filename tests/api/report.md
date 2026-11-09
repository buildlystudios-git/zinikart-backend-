# ZiniKart API Integration Test Report

**Execution Time:** 9/11/2026, 10:38:25 pm
**Total Assertions:** 122 | **Passed:** 105 | **Failed:** 17

### Pass Rate: 86%
`[█████████.]`

## Summary Table

| Suite | Scenario | Test Case / Assertion | Status | Error Details |
| --- | --- | --- | --- | --- |
| Authentication Endpoints | Best Case | Request OTP with a valid mobile number returns 200 and success: true | ✅ PASS | - |
| Authentication Endpoints | Best Case | Verify OTP with correct code and retailer role context returns 200, status registration_required, and JWT token | ✅ PASS | - |
| Authentication Endpoints | Possible Scenario | Verify OTP saves the optional name parameter on user creation | ✅ PASS | - |
| Authentication Endpoints | Possible Scenario | Verify OTP for an existing user requesting a new role updates the user roles list | ❌ FAIL | `Expected roles to contain delivery_partner and retailer, got ["retailer"]` |
| Authentication Endpoints | Impossible Scenario | Request OTP with missing phone number returns 400 error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Request OTP with malformed phone number returns 400 error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Verify OTP with incorrect code returns 401 unauthorized error | ✅ PASS | - |
| Authentication Endpoints | Impossible Scenario | Verify OTP with invalid role parameter returns 400 error | ✅ PASS | - |
| Retailer Profile Lifecycle | Impossible Scenario | Attempt to create profile without auth token returns 401 or 403 error | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Create retailer profile with valid data returns 201 and profile document ID | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending) | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Verify OTP for retailer with pending profile returns status pending_approval and null token | ❌ FAIL | `Expected status pending_approval and token null, got status pending_approval and token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uIjoidXNlcnMiLCJlbWFpbCI6IjkxOTk5OTk5OTk5OUBvdHAuemluaWthcnQubG9jYWwiLCJpZCI6ImM4Nzk5NGE2LTRhZDQtNDExMS1iNzU3LWMwNGU0NjYzYzA0NSIsInNpZCI6ImM2Y2NiNmQ2LTljZWMtNGVmNC1hYjAyLTY2YmIyNmFkOTdhMCIsImlhdCI6MTc5NDI0NDA5NiwiZXhwIjoxNzk1NDUzNjk2fQ.7mI3s-9aNg0IGs7DzKxrqtma-jstQkG-Cs7graZ36lE` |
| Retailer Profile Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from reading another user's profile (returns 403 or 404) | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from updating another user's profile (returns 403 or 404) | ✅ PASS | - |
| Retailer Profile Lifecycle | Worst Case | Field Access Security: Owner is blocked from changing their own approvalStatus (value remains pending or is ignored) | ✅ PASS | - |
| Retailer Profile Lifecycle | Impossible Scenario | Attempt to create duplicate retailer profile for the same user is rejected (returns non-201 status) | ✅ PASS | - |
| Retailer Profile Lifecycle | Best Case | Verify OTP for approved retailer profile returns status approved and JWT token | ❌ FAIL | `Expected status approved and token, got status approved_no_products` |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create profile without driving license document returns error (non-201 status) | ✅ PASS | - |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create profile without auth token returns 401 or 403 error | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Create delivery partner profile with valid data returns 201 and profile document ID | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Field Access Security: Client cannot force approvalStatus to approved during creation (defaults to pending) | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Verify OTP for delivery partner with pending profile returns status pending_approval and null token | ❌ FAIL | `Expected status pending_approval and token null, got status pending_approval` |
| Delivery Partner Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from reading another user's profile (returns 403 or 404) | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Access Control: Unauthorized user is blocked from updating another user's profile (returns 403 or 404) | ✅ PASS | - |
| Delivery Partner Lifecycle | Worst Case | Field Access Security: Owner is blocked from changing their own approvalStatus (value remains pending or is ignored) | ✅ PASS | - |
| Delivery Partner Lifecycle | Possible Scenario | Profile Owner is allowed to toggle their own onlineStatus | ✅ PASS | - |
| Delivery Partner Lifecycle | Impossible Scenario | Attempt to create duplicate delivery partner profile for the same user is rejected (returns non-201 status) | ✅ PASS | - |
| Delivery Partner Lifecycle | Best Case | Verify OTP for approved delivery partner profile returns status approved and JWT token | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Brand without auth token returns 401 or 403 error | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Brand with customer role token returns 401 or 403 error | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Category without auth token returns 401 or 403 error | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Product without auth token returns 401 or 403 error | ✅ PASS | - |
| Catalog Foundation | Best Case | Create Brand with admin auth returns 201 and Brand ID | ✅ PASS | - |
| Catalog Foundation | Best Case | Create Parent Category with admin auth returns 201 and Category ID | ✅ PASS | - |
| Catalog Foundation | Best Case | Create Subcategory linked to Parent Category returns 201 and Category ID | ✅ PASS | - |
| Catalog Foundation | Best Case | Create Product with brand and specifications returns 201 and Product ID | ✅ PASS | - |
| Catalog Foundation | Best Case | Admin-created product defaults to isMasterTemplate: true and parentTemplate: null | ✅ PASS | - |
| Catalog Foundation | Best Case | Retailer creating product gets isMasterTemplate set to false (roles hook enforcement) | ✅ PASS | - |
| Catalog Foundation | Best Case | Retailer cloning product gets parentTemplate linked and isMasterTemplate set to false | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Product missing a required specification returns 400 bad request | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Product with non-numeric value for numeric specification returns 400 | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Product with invalid date format returns 400 | ✅ PASS | - |
| Catalog Foundation | Impossible Scenario | Attempt to create Product with invalid option for select specification returns 400 | ✅ PASS | - |
| Catalog Foundation | Best Case | Public query of Brands list returns 200 and matches created Brand data | ✅ PASS | - |
| Catalog Foundation | Best Case | Public query of Categories list returns 200 and subcategory correctly links to parent | ✅ PASS | - |
| Catalog Foundation | Worst Case | Public query of master template product returns 404 or 403 forbidden | ✅ PASS | - |
| Catalog Foundation | Best Case | Public query of Product returns 200, populated brand, warranty, and specifications | ✅ PASS | - |
| Catalog Foundation | Worst Case | GET /api/mobile/product/:id for master template returns 404 not found | ✅ PASS | - |
| Catalog Foundation | Best Case | GET /api/mobile/product/:id for cloned product returns 200, product details with ratings, active retailer profile with ratings, and competitor otherOffers with ratings | ❌ FAIL | `Expected status 200, correct product ID, ratings, and competitor offer. Got status: 404, Body: {"message":"Route not found \"/api/mobile/product/72695cb4-b2b9-471f-87b5-b502dac9ea19\""}` |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=Cloned returns 200 and matches the cloned product listing | ✅ PASS | - |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=ZiniTech (brand search) returns 200 and matches products of that brand | ❌ FAIL | `Expected status 200 and products belonging to brand. Got status: 500, Body: {"error":"Internal Server Error"}` |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=Smartphones (category search) returns 200 and matches products in that category | ❌ FAIL | `Expected status 200 and products belonging to category. Got status: 500, Body: {"error":"Internal Server Error"}` |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=Active Retailer (retailer search) returns 200, matching products, and matching retailer profiles | ❌ FAIL | `Expected status 200, products, and retailer profile. Got status: 200, Body: {"products":[],"retailers":[]}` |
| Catalog Foundation | Best Case | GET /api/mobile/search?q= (empty query) returns 200 and empty lists | ✅ PASS | - |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=NonExistentQueryXYZ (no matches) returns 200 and empty lists | ✅ PASS | - |
| Ratings & Reviews | Impossible Scenario | Attempt to create Rating without authentication returns 401 or 403 error | ✅ PASS | - |
| Ratings & Reviews | Best Case | Customer can successfully create a rating (returns 201 and ID) | ✅ PASS | - |
| Ratings & Reviews | Best Case | Product rating aggregates (averageRating and ratingCount) are updated automatically | ✅ PASS | - |
| Ratings & Reviews | Best Case | Retailer rating aggregates (averageRating and ratingCount) are updated automatically | ✅ PASS | - |
| Ratings & Reviews | Impossible Scenario | Uniqueness constraint: Customer is blocked from creating a duplicate rating for the same product and retailer (returns 400) | ✅ PASS | - |
| Ratings & Reviews | Best Case | A second authenticated user can rate the same product and retailer (returns 201) | ✅ PASS | - |
| Ratings & Reviews | Best Case | Aggregated average rating and count are updated correctly after a second rating | ✅ PASS | - |
| Ratings & Reviews | Best Case | Customer can delete their own rating record (returns 200 or 204) | ✅ PASS | - |
| Ratings & Reviews | Best Case | Rating aggregates reset to 0 after all ratings are deleted | ✅ PASS | - |
| Wishlist Collection | Impossible Scenario | Attempt to read Wishlist without authentication returns 401 or 403 error | ✅ PASS | - |
| Wishlist Collection | Impossible Scenario | Attempt to create Wishlist entry without authentication returns 401 or 403 error | ✅ PASS | - |
| Wishlist Collection | Impossible Scenario | Attempt to add a master catalog template to wishlist returns 400 validation error | ✅ PASS | - |
| Wishlist Collection | Best Case | Customer can successfully add a retail product listing to their wishlist (returns 201) | ✅ PASS | - |
| Wishlist Collection | Impossible Scenario | Attempt to add duplicate product entry to wishlist returns 400 validation error | ✅ PASS | - |
| Wishlist Collection | Best Case | Customer can retrieve their own wishlist entries successfully | ✅ PASS | - |
| Wishlist Collection | Worst Case | Unauthorized user is blocked from reading another customer's wishlist entry (returns 403 or 404) | ✅ PASS | - |
| Wishlist Collection | Worst Case | Unauthorized user is blocked from deleting another customer's wishlist entry (returns 403 or 404) | ✅ PASS | - |
| Wishlist Collection | Best Case | Customer can delete their own wishlist entry (returns 200 or 204) | ✅ PASS | - |
| Wishlist Collection | Best Case | Wishlist is empty after successful item deletion | ✅ PASS | - |
| Cart Operations | Best Case | Retrieve or create an active cart for the customer returns a valid cart ID | ✅ PASS | - |
| Cart Operations | Best Case | Successfully add a product to the cart (returns status 200 or 201) | ✅ PASS | - |
| Cart Operations | Best Case | Successfully update a cart item quantity (returns status 200 or 201 and checks updated quantity) | ✅ PASS | - |
| Cart Operations | Best Case | Successfully remove an item from the cart (returns status 200 or 201) | ✅ PASS | - |
| Cart Operations | Best Case | Successfully clear all items from the cart (returns status 200 or 201) | ✅ PASS | - |
| Cart Operations | Impossible Scenario | Querying carts without auth token is restricted or returns empty results | ✅ PASS | - |
| Cart Operations | Impossible Scenario | Attempt to add item to a cart without auth token is rejected (returns 401, 403, or 404) | ✅ PASS | - |
| Cart Operations | Impossible Scenario | Attempt to add a non-existent product to the cart is rejected (returns non-200/201 status) | ✅ PASS | - |
| Cart Operations | Worst Case | Access Control: Customer B is blocked from reading Customer A's cart (returns 403 or 404) | ✅ PASS | - |
| Cart Operations | Worst Case | Access Control: Customer B is blocked from adding items to Customer A's cart (returns 403 or 404) | ✅ PASS | - |
| Cart Operations | Worst Case | Access Control: Customer B is blocked from clearing Customer A's cart (returns 403 or 404) | ✅ PASS | - |
| Checkout & Payments | Best Case | Successfully initiate payment via Razorpay adapter (returns status 200 or 201 and a razorpayOrderID) | ✅ PASS | - |
| Checkout & Payments | Best Case | Successfully confirm order and generate Order ID (returns status 200 or 201) | ❌ FAIL | `Expected status 200/201 and orderID. Got status: 500, Body: {"message":"Error confirming order. DEBUG: Retailer profile not found for this product."}` |
| Checkout & Payments | Impossible Scenario | Attempt to initiate payment without auth token is rejected (returns 400, 401, or 403) | ✅ PASS | - |
| Checkout & Payments | Impossible Scenario | Attempt to initiate payment with non-existent cart ID is rejected (returns 400 or 404) | ✅ PASS | - |
| Checkout & Payments | Impossible Scenario | Attempt to initiate payment with an empty cart is rejected (returns 400 or 500 with proper error) | ✅ PASS | - |
| Checkout & Payments | Worst Case | Access Control: Customer B is blocked from initiating payment on Customer A's cart (returns 403 or 404) | ✅ PASS | - |
| Checkout & Payments | Worst Case | Access Control: Customer B is blocked from confirming order on Customer A's cart (returns 403 or 404) | ✅ PASS | - |
| Checkout & Payments | Best Case | COD setup: Item added to cart | ✅ PASS | - |
| Checkout & Payments | Best Case | Successfully initiate payment via COD adapter (returns transactionID) | ❌ FAIL | `Got status: 500, Body: {"message":"Error initiating payment."}` |
| Checkout & Payments | Best Case | Successfully confirm COD order (returns orderID) | ❌ FAIL | `Got status: 500, Body: {"message":"Error confirming order. DEBUG: transactionID is required to confirm order."}` |
| Checkout & Payments | Worst Case | Access Control: Unassigned delivery partner is blocked from updating the order (returns 403 or 404) | ✅ PASS | - |
| Checkout & Payments | Worst Case | Cross-User checkout checks setup error | ❌ FAIL | `Not Found` |
| Quick Commerce Backend | Impossible Scenario | Should fail when ordering from multiple retailers | ✅ PASS | - |
| Quick Commerce Backend | Best Case | Should succeed when ordering from a single retailer | ❌ FAIL | `Assertion failed` |
| Quick Commerce Backend | Impossible Scenario | Suite completed without unhandled exceptions: Not Found | ❌ FAIL | `Assertion failed` |
| Payouts Module | Best Case | Payouts setup failed: missing retailer user or profile | ❌ FAIL | `Assertion failed` |
| Custom Create Endpoint Tests | Impossible Scenario | Case 8: No auth token returns 401 | ✅ PASS | - |
| Custom Create Endpoint Tests | Impossible Scenario | Case 7: Missing title on create returns 400 | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 1: Create simple product | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 2: Create product with variants | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 3: Create product from template | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 4: Update top-level fields | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 5: Update product and upsert all new variants | ✅ PASS | - |
| Custom Create Endpoint Tests | Best Case | Case 6: Update product and upsert variants (mixed) | ❌ FAIL | `Skipped because previous variant update failed or no variants returned` |
| Order WebSocket Real-Time Events | Best Case | WebSocket health endpoint reports ok and includes orderRooms, retailerFeeds, and dpFeeds counters | ✅ PASS | - |
| Order WebSocket Real-Time Events | Impossible Scenario | Internal order broadcast endpoint rejects unauthorized requests with 403 Forbidden | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Internal order broadcast endpoint accepts authorized requests with 200 OK | ✅ PASS | - |
| Order WebSocket Real-Time Events | Worst Case | WebSocket connection without authentication token is rejected with 401 Unauthorized | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Customer connects to WebSocket server with valid token | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Retailer connects to WebSocket server with valid token | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Obtained valid delivery partner JWT token | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Delivery partner connects to WebSocket server with valid token | ✅ PASS | - |
| Order WebSocket Real-Time Events | Impossible Scenario | Customer is forbidden from subscribing to retailer live feed | ✅ PASS | - |
| Order WebSocket Real-Time Events | Impossible Scenario | Customer is forbidden from subscribing to delivery partner feed | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Retailer successfully subscribes to live retailer feed (joined_retailer_feed) | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Delivery partner successfully subscribes to live DP feed (joined_dp_feed) | ✅ PASS | - |
| Order WebSocket Real-Time Events | Best Case | Order WebSocket test suite executed without unhandled crashes | ❌ FAIL | `Cannot read properties of undefined (reading 'id')` |
