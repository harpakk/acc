# Security Specification for Shadi Avaran (Pastry, Event Packages & Joyful goods Accounting)

## 1. Data Invariants
*   **Authentication**: All reads and writes must be initiated by authenticated users.
*   **Id Validation**: Any ID path variables must conform to `isValidId()` regex check and must not exceed length limits to prevent resource exhaustion.
*   **Immutable Timestamps**: `createdAt` can only be set on creation and must match `request.time`. `updatedAt` on update must match `request.time`.
*   **Immutable Fields**: Critical field identifiers (e.g. `id`, `code`, `personId`) should check `incoming().id == existing().id` on updates.
*   **Balance Integrity**: Financial assets, balances, and entries must validate numeric attributes (e.g., `amount >= 0`, `balance is number`).
*   **Strict Property Check**: Operations on entities (e.g., `Person`, `Item`, `Invoice`, etc.) must strictly conform to allowed keys on creation and update to prevent shadow fields insertion.

## 2. The "Dirty Dozen" Malicious Payloads (Integrity Breaking Attempts)
Below are 12 specific payloads representing standard attacks of Identity, Integrity, and State that must be denied.

1.  **Identity Spoofing - External ID Injection**: Trying to create a Person document where the ID field does not match the authenticated user, or inserting malicious characters into the ID.
2.  **Shadow Fields - Ghost Field Insertion**: Creating/Updating a Person document with a hidden verification or role flag, e.g. `isAdmin: true` or `isPremium: true`.
3.  **State Shortcutting - Completed Status Skip**: Updating a Production order's status to 'completed' directly without performing necessary raw materials deduction, or updating a completed order.
4.  **Resource Poisoning - Outrageous Key Names**: Writing a Map with keys containing malicious payload strings or very long strings to cause memory exhaustion.
5.  **PII Direct Leak - Unrestricted PII Read**: Attempting to read Person records containing phone and address fields by unauthenticated users or users who aren't authorized members.
6.  **Immutable Creation Injection**: Modifying the `createdAt` to a historical date (e.g., 2000-01-01) to bypass analytical reports or auditing.
7.  **Null-Pointer Operation Type**: Trying to read resources relying on `request.resource.data` inside read rules.
8.  **Empty Array Size Guard bypass**: Adding massive item arrays to an invoice or production order to cause Denial of Wallet (unbounded lists).
9.  **Numeric Overflow / Underflow**: Setting negative values for invoice totals, item prices, or transaction quantities.
10. **Spoofed Claims Admin Attempt**: Triggering custom rules using `request.auth.token.role` directly.
11. **Orphaned Relation Insert**: Creating an invoice referring to a non-existent `personId`.
12. **Malicious ID poison**: Injecting a 2KB string as `personId` path variable to exploit Firestore path resolution limits.

## 3. Test Runner Specification
The rules will be evaluated using `DRAFT_firestore.rules` and compiled with ESLint against security rules violations. All malicious operations must return first-hand `PERMISSION_DENIED` errors which our code handles globally.
