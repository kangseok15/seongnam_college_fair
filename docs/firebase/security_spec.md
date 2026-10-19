# Firestore Security Specification & Verification

## 1. Data Invariants
1. **StudentApplicant**: Must have valid `id` matching `^[a-zA-Z0-9_\-]+$`, non-empty string `name`, `studentSchool`, `contact`, valid `preferredTimeId` (1~10), and recognized `status`. Status transitions must follow the designated lifecycle (`PENDING` -> `CHECKED_IN` -> `IN_CONSULTATION` -> `COMPLETED`, or `NO_SHOW`).
2. **Consultant**: 30 booths with valid `boothId` (1~30), `name`, `school`, and `specialty`.
3. **AllocationLog**: Append-only log with valid `timestamp`, `applicantName`, `assignedBoothId` (1~30), `assignedTimeId` (1~10), and audit `reason`.
4. **FairConfig**: Central event metadata with valid title and active time slot ID (1~10).
5. **Admin Access**: Authenticated administrative user (`sophia31511@gmail.com`) has verified master operational permissions. Event staff can view rosters and submit check-ins / registrations while preventing unauthenticated write poisoning or identity spoofing.

## 2. The Dirty Dozen Payloads (Security Attack Vectors)
1. **Unauthenticated Write**: An unauthenticated user attempts to delete an applicant record. -> Expected: PERMISSION_DENIED
2. **Junk ID Poisoning**: An attacker tries to write with a 2KB string ID containing malicious characters. -> Expected: PERMISSION_DENIED (`isValidId` check fails)
3. **Shadow Field Injection**: An attacker attempts to write an applicant with an undocumented field `__isAdmin: true`. -> Expected: PERMISSION_DENIED (`hasOnly` failure)
4. **Invalid Status Transition**: An attacker tries to set an invalid status `HACKED_STATUS`. -> Expected: PERMISSION_DENIED
5. **PII Blanket Extraction**: An unauthenticated query attempting full dump of applicant phone numbers. -> Expected: PERMISSION_DENIED
6. **Oversized String Attack (Denial of Wallet)**: An attacker injects a 500KB text payload into `consultationTopic`. -> Expected: PERMISSION_DENIED (`maxLength` / `.size() <= 500`)
7. **Negative or Out-of-Bounds Booth ID**: An attacker attempts to assign an applicant to booth -5 or booth 999. -> Expected: PERMISSION_DENIED (Must be 1~30)
8. **Negative Time Slot ID**: An attacker attempts to assign an applicant to timeId 99. -> Expected: PERMISSION_DENIED (Must be 1~10)
9. **Log Forgery / Deletion**: An attacker attempts to modify or delete historical allocation audit logs. -> Expected: PERMISSION_DENIED (Audit logs immutable / write-once)
10. **Consultant Booth ID Mismatch**: Document ID path variable does not match the consultant payload `boothId`. -> Expected: PERMISSION_DENIED
11. **Spoofed Email / Unverified Auth Write**: An unverified user attempting administrative write. -> Expected: PERMISSION_DENIED
12. **Catch-All Default Deny**: Accessing an undocumented collection `super_admin_passwords`. -> Expected: PERMISSION_DENIED (Default deny rule)
