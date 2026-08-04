# ZiniKart API Integration Test Report

**Execution Time:** 4/8/2026, 3:04:21 pm
**Total Assertions:** 11 | **Passed:** 11 | **Failed:** 0

### Pass Rate: 100%
`[██████████]`

## Summary Table

| Suite | Scenario | Test Case / Assertion | Status | Error Details |
| --- | --- | --- | --- | --- |
| Payouts Module | Best Case | Retailer can fetch their payout ledger | ✅ PASS | - |
| Payouts Module | Security | Unauthenticated user cannot fetch ledger | ✅ PASS | - |
| Payouts Module | Best Case | Retailer can fetch their invoices | ✅ PASS | - |
| Payouts Module | Security | Retailer cannot mark invoice as disbursed | ✅ PASS | - |
| Payouts Module | Best Case | Admin can mark invoice as disbursed | ✅ PASS | - |
| Payouts Module | Best Case | Related ledgers are marked as paid upon invoice disbursal | ✅ PASS | - |
| Payouts Module | Best Case | Ledger with past eligibleAt is advanced and processed (Auto Stub) | ✅ PASS | - |
| Payouts Module | Edge Case | Ledger with future eligibleAt is NOT advanced | ✅ PASS | - |
| Payouts Module | Edge Case | Ledger linked to cancelled order is put on_hold | ✅ PASS | - |
| Payouts Module | Best Case | Invoice is created with correct lineItems and period from/to | ✅ PASS | - |
| Payouts Module | Best Case | Auto mode stub fails invoice gracefully | ✅ PASS | - |
