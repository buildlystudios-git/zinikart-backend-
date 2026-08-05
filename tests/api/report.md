# ZiniKart API Integration Test Report

**Execution Time:** 5/8/2026, 8:58:20 pm
**Total Assertions:** 109 | **Passed:** 97 | **Failed:** 12

### Pass Rate: 89%
`[█████████.]`

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
| Retailer Profile Lifecycle | Best Case | Verify OTP for retailer with pending profile returns status pending_approval and null token | ❌ FAIL | `Expected status pending_approval and token null, got status pending_approval and token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uIjoidXNlcnMiLCJlbWFpbCI6IjkxOTk5OTk5OTk5OUBvdHAuemluaWthcnQubG9jYWwiLCJpZCI6IjZlOGUxMmUwLWY4M2EtNGQ4ZC04M2Y4LTdlNGVlMjA5ZjBhOCIsInNpZCI6IjNkMDI1NzkxLTk3NzYtNDRmYy1iZjZhLTFkYjFhNjYyMzA3MCIsImlhdCI6MTc4NTk0MzY4NSwiZXhwIjoxNzg3MTUzMjg1fQ.HdUUM6pHc31X9SQ36ZaqBVgYgWvB9V3BA1Lpt5FaHxo` |
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
| Catalog Foundation | Best Case | GET /api/mobile/product/:id for cloned product returns 200, product details with ratings, active retailer profile with ratings, and competitor otherOffers with ratings | ❌ FAIL | `Expected status 200, correct product ID, ratings, and competitor offer. Got status: 200, Body: {"product":{"id":"8422f80e-230a-407e-a478-29f8f200eed4","title":"Cloned ZiniPhone 14 Max","description":null,"gallery":[],"inventory":100,"enableVariants":null,"variantTypes":[],"variants":{"docs":[],"hasNextPage":false},"priceInINREnabled":null,"priceInINR":89900,"discountPercent":null,"discountedPrice":89900,"brand":{"id":"082f9dff-45ef-4838-981d-b698f1c3efa9","name":"ZiniTech","logo":null,"description":"ZiniKart Official Electronics Brand","featured":true,"categories":[],"generateSlug":false,"slug":"zinitech","updatedAt":"2026-08-05T15:28:07.682Z","createdAt":"2026-08-05T15:28:07.682Z"},"warranty":"2 Year Manufacturer Warranty","specifications":[{"id":"6a735688197107395cdee1fc","key":"RAM","value":"12","type":"number"},{"id":"6a735688197107395cdee1fd","key":"Color","value":"Black","type":"select"},{"id":"6a735688197107395cdee1fe","key":"Release Date","value":"2026-05-30","type":"date"}],"relatedProducts":[],"averageRating":0,"ratingCount":0,"meta":{"title":null,"image":null,"description":null},"categories":[{"id":"e4b8b5c1-a72f-4b03-90f3-ebc075bd3744","title":"Smartphones","media":null,"parentCategory":{"id":"909539aa-bb49-44a7-8716-376291b807b1","title":"Mobiles","media":null,"parentCategory":null,"specificationTemplates":[],"brands":{"docs":[],"hasNextPage":false},"generateSlug":false,"slug":"mobiles","updatedAt":"2026-08-05T15:28:07.755Z","createdAt":"2026-08-05T15:28:07.755Z"},"specificationTemplates":[{"id":"6a735687197107395cdee1f3","name":"RAM","type":"number","required":true,"options":[]},{"id":"6a735687197107395cdee1f6","name":"Color","type":"select","required":false,"options":[{"id":"6a735687197107395cdee1f4","option":"Black"},{"id":"6a735687197107395cdee1f5","option":"White"}]},{"id":"6a735687197107395cdee1f7","name":"Release Date","type":"date","required":false,"options":[]}],"brands":{"docs":[],"hasNextPage":false},"generateSlug":false,"slug":"smartphones","updatedAt":"2026-08-05T15:28:07.832Z","createdAt":"2026-08-05T15:28:07.832Z"}],"retailer":{"id":"0de9619b-55d5-4d9a-bd6a-9e8efa6cec8d","name":"Retailer Tester","roles":["retailer"],"orders":{"docs":[],"hasNextPage":false},"cart":{"docs":[],"hasNextPage":false},"addresses":{"docs":[],"hasNextPage":false},"mobileNumber":"+916666666666","mobileVerified":true,"lastOtpLoginAt":null,"updatedAt":"2026-08-05T15:28:00.383Z","createdAt":"2026-08-05T15:28:00.039Z","email":"retailer.user@testing.zinikart.local","sessions":[{"id":"0cfc25c4-2413-4d8d-83da-4e613ebaf576","createdAt":"2026-08-05T15:28:00.203Z","expiresAt":"2026-08-19T15:28:00.203Z"}],"collection":"users"},"isMasterTemplate":false,"parentTemplate":{"id":"cdc32824-9de3-4ced-938e-3ce369f5acc5","title":"ZiniPhone 14 Max","gallery":[],"inventory":100,"enableVariants":null,"variants":{"docs":[],"hasNextPage":false},"priceInINR":99900,"meta":{"title":null,"image":null,"description":null},"slug":"ziniphone-14-max","deletedAt":null},"generateSlug":false,"slug":"cloned-ziniphone-14-max","updatedAt":"2026-08-05T15:28:08.530Z","createdAt":"2026-08-05T15:28:08.529Z","deletedAt":null,"_status":"published","layout":[]},"retailer":{"shopName":"ZiniTech Store","city":"Delhi","landmark":null,"businessHours":{"startTime":"09:00","endTime":"21:00","weekOff":[],"openEveryday":false},"averageRating":0,"ratingCount":0},"otherOffers":[{"productId":"671e1798-3eea-4be8-af83-e3cc254ba390","price":75000,"discountedPrice":75000,"shopName":"Competitor Gadgets","city":"Mumbai","averageRating":0,"ratingCount":0}]}` |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=Cloned returns 200 and matches the cloned product listing | ✅ PASS | - |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=ZiniTech (brand search) returns 200 and matches products of that brand | ✅ PASS | - |
| Catalog Foundation | Best Case | GET /api/mobile/search?q=Smartphones (category search) returns 200 and matches products in that category | ✅ PASS | - |
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
| Custom Create Endpoint Tests | Best Case | Case 6: Update product and upsert variants (mixed) | ✅ PASS | - |
