# Requirements Document — Diesel Pump Management System

## 1. Purpose

Define the functional and non-functional requirements for a desktop application that lets a diesel pump owner manage tank stock, customer credit, purchases, sales, daily cash reconciliation, and business reports from a single laptop at the pump.

---

## 2. Scope

In scope: unit/tank management, customer & supplier masters, purchase entry, sale entry, payments, expenses, customer ledger, daily cash closing, stock report, business reports, role-based access, local backup.

Out of scope (this phase): multi-location support, cloud sync, mobile app, GST e-invoicing, SMS/WhatsApp integration — listed as future extensions only.

---

## 3. User Roles

| Role | Description |
|---|---|
| **Owner** | Full access — all entries, edits, deletes, reports, day reopen, user management |
| **Operator** | Can create purchase/sale/payment/expense entries; cannot edit or delete past entries; limited report access |

---

## 4. Functional Requirements

### 4.1 Units Master (Tanks/Dispensers)
- FR-1.1: System shall allow the Owner to add/edit/deactivate a unit with name, capacity, and status.
- FR-1.2: System shall track current stock and weighted average cost per unit automatically.
- FR-1.3: System shall prevent stock from exceeding a unit's defined capacity during a purchase entry.
- FR-1.4: System shall prevent a unit from being deleted if it has transaction history (deactivate instead).

### 4.2 Customer Master
- FR-2.1: System shall allow adding customers as Retail or Credit type.
- FR-2.2: Credit customers shall have a credit limit and an opening balance field, editable only during setup or by Owner.
- FR-2.3: System shall maintain a running current balance per credit customer, updated automatically by sales and payments.
- FR-2.4: System shall support a generic "Walk-in" customer for quick retail sales without individual registration.

### 4.3 Supplier Master
- FR-3.1: System shall allow adding/editing suppliers with name, phone, and optional GST number.
- FR-3.2: System shall track outstanding payable amount per supplier.

### 4.4 Purchase Entry
- FR-4.1: System shall record date, supplier, receiving unit, quantity, rate, amount, and invoice number for each purchase.
- FR-4.2: System shall increase the selected unit's stock and recalculate its weighted average cost on save.
- FR-4.3: System shall allow marking a purchase as paid, partially paid, or pending against the supplier.
- FR-4.4: System shall reject a purchase entry that would exceed the unit's capacity, unless overridden by Owner.

### 4.5 Sale Entry
- FR-5.1: System shall record date, customer, unit, quantity, rate, amount, and payment type (cash/credit/partial).
- FR-5.2: System shall decrease the selected unit's stock on save and record the unit's average cost at time of sale.
- FR-5.3: For retail sales, system shall require full payment before the entry can be saved.
- FR-5.4: For credit sales, system shall display the customer's current due and credit limit before confirming.
- FR-5.5: System shall warn — but not block — a sale that would breach the customer's credit limit.
- FR-5.6: System shall block a sale if the unit's available stock is insufficient, with an Owner-only override.
- FR-5.7: System shall support partial payment on a single sale (part cash, part credit).
- FR-5.8: System shall allow voiding a sale (Owner only), which reverses stock and ledger impact and retains the record with a "voided" status for audit — never a hard delete.

### 4.6 Payment / Receipt Entry
- FR-6.1: System shall allow recording a payment against a credit customer's due, with date, amount, and mode (cash/UPI/bank).
- FR-6.2: System shall reduce the customer's current balance immediately on save.
- FR-6.3: System shall prevent a payment amount that would make the customer's balance negative beyond a configurable tolerance, with Owner override.

### 4.7 Expense Entry
- FR-7.1: System shall allow recording an expense with date, category, amount, mode (cash/bank), and notes.
- FR-7.2: Cash-mode expenses shall automatically feed into that day's Cash Register calculation.

### 4.8 Customer Ledger
- FR-8.1: System shall display, per credit customer, a chronological statement of all sales (debit) and payments (credit) with a running balance.
- FR-8.2: System shall support filtering the ledger by date range.
- FR-8.3: System shall support exporting/printing a customer's ledger statement.

### 4.9 Cash Register / Daily Cash Closing
- FR-9.1: System shall auto-carry the previous day's physical closing cash as the next day's opening cash (editable).
- FR-9.2: System shall automatically total the day's cash sales, cash receipts, cash expenses, and cash paid to suppliers.
- FR-9.3: System shall calculate expected closing cash as: Opening + Cash Sales + Cash Receipts − Cash Expenses − Cash Paid to Suppliers.
- FR-9.4: System shall allow the operator to enter the physically counted cash amount at day end.
- FR-9.5: System shall calculate and display variance (shortage/excess) between expected and physical cash.
- FR-9.6: System shall require a note whenever variance is non-zero.
- FR-9.7: Once a day is closed, system shall prevent new or backdated entries into that day unless the Owner explicitly reopens it, and shall log the reopen action.

### 4.10 Stock Report
- FR-10.1: System shall calculate closing stock per unit as: Opening + Purchases − Sales ± Adjustments.
- FR-10.2: System shall support daily, weekly, and monthly stock views, per unit and combined.
- FR-10.3: System shall allow a Stock Adjustment entry (shortage/excess with reason) to reconcile physical vs. system stock, restricted to Owner.

### 4.11 Reports
- FR-11.1: Sales Report — filterable by date range, customer, and unit.
- FR-11.2: Purchase Report — filterable by date range and supplier.
- FR-11.3: Profit/Margin Report — computed as (sale rate − average cost at sale) × quantity, aggregable by date range.
- FR-11.4: Customer Dues Report — outstanding balances with ageing buckets (0–7 / 8–30 / 30+ days).
- FR-11.5: Supplier Dues Report — outstanding payables by invoice.
- FR-11.6: Expense Report — filterable by category and date range.
- FR-11.7: Cash Report — historical daily closings showing opening, expected, physical, and variance, with trend view.
- FR-11.8: All reports shall be exportable to PDF or printable.

### 4.12 Users & Roles
- FR-12.1: System shall require login before any data entry or report access.
- FR-12.2: System shall enforce role-based permissions per section 3.
- FR-12.3: System shall maintain an audit log of edits, voids, deletes, and day reopens, recording user, timestamp, and change.

### 4.13 Setup / Onboarding
- FR-13.1: System shall provide a one-time setup screen to enter opening stock per unit and opening balances per customer before go-live.

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | System shall run fully offline on a single laptop; no internet dependency for core operations. |
| NFR-2 | System shall be packaged as a desktop application (Electron) requiring no manual server/browser steps to launch. |
| NFR-3 | Database (MongoDB) shall run locally on the same machine. |
| NFR-4 | System shall perform a scheduled automatic local backup (daily `mongodump`) with support for syncing the backup folder to external storage (USB/cloud). |
| NFR-5 | All monetary and stock calculations shall use consistent rounding (2 decimal places) to avoid ledger mismatches. |
| NFR-6 | Critical actions (void sale, day reopen, stock adjustment, opening balance edit) shall require Owner-level confirmation. |
| NFR-7 | UI shall be usable by a non-technical operator with minimal training — simple forms, large touch-friendly buttons where feasible. |
| NFR-8 | System shall respond to standard entry operations (save sale/purchase/payment) within 1 second on typical hardware. |
| NFR-9 | Application shall handle unexpected shutdown (power cut) gracefully — no partial/corrupt transaction should be saved. |
| NFR-10 | Audit logs and voided records shall be retained indefinitely (not purged automatically). |

---

## 6. Business Rules Summary

- BR-1: A sale cannot save unless a payment type is selected and, for retail, is fully paid.
- BR-2: Stock, once sold, must reduce from the exact unit selected — no shared/global stock pool.
- BR-3: Weighted average cost recalculates only on purchase, not on sale.
- BR-4: A closed day is immutable except via an explicit, logged Owner reopen.
- BR-5: No transaction is ever hard-deleted; corrections happen via void/adjustment entries that preserve history.

---

## 7. Assumptions

- Single pump, single location, single laptop (per current scope).
- Diesel is the only product tracked (extendable later to petrol/other products if needed).
- Currency and calculations assume INR; no multi-currency requirement.
- Owner is available to resolve exceptions (credit breach, stock override, day reopen) — Operator cannot self-authorize these.

---

## 8. Open Questions (to confirm before build)

- Should retail (walk-in) sales be logged individually or can they be aggregated as a single "cash sale" total for the day if the owner doesn't want per-customer detail?
- Is there a fixed set of expense categories (fuel for staff vehicle, electricity, maintenance, salaries, etc.), or should categories be freely added?
- Does the owner need multi-user simultaneous access (e.g., two operators on separate logins at the same time), or is the laptop used by one person at a time?
