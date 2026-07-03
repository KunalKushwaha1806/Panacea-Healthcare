# System Design — Panacea Healthcare

## Overview

Panacea Healthcare is a multi-role appointment management platform with three principals: patients booking visits, doctors managing patient encounters, and admins controlling the scheduling infrastructure. This document covers four critical design decisions: double-booking prevention, slot hold mechanism, doctor leave conflict handling, and notification failure handling.

## Double-Booking Prevention

The booking engine uses a **defense-in-depth** strategy with two independent safeguards:

**Database-level unique constraint:** A `@@unique([doctorProfileId, slotStart])` constraint on the `Appointment` table guarantees at the storage layer that no two appointments can exist for the same doctor at the same time. This is the final safety net — even if application logic fails, PostgreSQL will reject duplicates with a `P2002` error.

**Serializable transactions:** All booking operations (`holdSlot`, `confirmBooking`, `rescheduleBooking`) run inside Prisma interactive transactions with `Serializable` isolation level. Within the transaction, we first `SELECT` to check for existing appointments at the target slot (covering both `BOOKED` and active `HELD` statuses), then `INSERT` only if clear. PostgreSQL's serializable snapshot isolation detects conflicting concurrent transactions and aborts one with a serialization failure, which we catch and convert to a `409 Conflict` response.

This two-layer approach ensures correctness under concurrent load: the transaction handles the common case cleanly, and the unique constraint catches any edge case the application logic might miss.

## Slot Hold Mechanism

To prevent the "last-second snipe" problem — where a patient fills out a symptom form only to find their slot was taken — we implement a **time-limited slot hold**:

1. When a patient clicks a slot, a `POST /bookings/hold` request creates an `Appointment` row with `status: HELD` and `holdExpiresAt: NOW() + 5 minutes`.
2. The slot immediately appears as unavailable to other patients (the availability query filters out both `BOOKED` and active `HELD` appointments).
3. The patient has 5 minutes to submit their symptom form and confirm. A frontend countdown timer shows the remaining time.
4. On confirmation (`POST /bookings/confirm/:id`), the status transitions from `HELD` to `BOOKED` and `holdExpiresAt` is cleared.
5. If the patient abandons the flow, a **node-cron job running every minute** deletes all appointments where `status = HELD AND holdExpiresAt < NOW()`, releasing the slot back to the pool.

The hold lives in the same `Appointment` table (not a separate cache) so that the unique constraint naturally prevents another patient from booking the same slot while it's held. This avoids cache-DB synchronization issues.

## Doctor Leave Conflict Handling

When an admin marks a doctor on leave for future dates, the system must handle existing appointments on those dates. The flow is:

1. Admin calls `POST /admin/doctors/:id/leave` with an array of dates.
2. The service merges new leave dates with existing ones (deduplicating).
3. Within a single transaction:
   - The `DoctorProfile.leaveDays` array is updated.
   - All `BOOKED` appointments for that doctor on the new leave dates are queried.
   - Matching appointments have their status updated to `CANCELLED` with `cancelReason: 'Doctor on leave'`.
   - A `NotificationLog` entry is created for each affected patient with `type: 'EMAIL'` and `status: 'PENDING'`.
4. The email background job picks up these pending notifications and sends leave-conflict emails that include a rebooking link.

The transaction ensures atomicity: if the cancellation step fails, the leave days aren't saved either, preventing a state where leave is recorded but patients aren't notified. The notification is decoupled via the `NotificationLog` queue to avoid blocking the admin's request on email delivery.

## Notification Failure Handling

Email delivery is inherently unreliable. The system uses an **async notification queue with exponential backoff retry**:

**Architecture:** All notifications flow through the `NotificationLog` table. Instead of sending emails synchronously during API requests, the application inserts a row with `status: 'PENDING'`. A node-cron job polls every 2 minutes for pending/retrying entries.

**Retry strategy:** On send failure, the notification's `retries` counter increments and `status` changes to `'RETRYING'`. The `nextRetryAt` timestamp is set to `NOW() + 2^retries minutes` (exponential backoff: 2min, 4min, 8min, 16min, 32min). After 5 failures, status becomes `'FAILED'` permanently, and the error is logged for admin review.

**LLM failure handling:** AI summary generation wraps the Gemini API call in a try-catch with a 15-second timeout. On failure, it retries once with a 1-second backoff. If both attempts fail, the summary's status is set to `'FAILED'` with a descriptive error message, and a `NotificationLog` entry of type `'LLM_FAILURE'` is created. The patient sees a "Summary pending — doctor will review manually" badge, and the booking proceeds unblocked. This ensures the AI feature is additive, never a single point of failure.

**Observability:** The admin portal includes a notification log viewer with status filters, giving administrators visibility into delivery failures and allowing them to trigger manual retries or investigate systemic issues.

*Word count: ~790*
