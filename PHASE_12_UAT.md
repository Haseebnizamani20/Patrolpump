# Phase 12 — Owner UAT Checklist and Test Scenarios

## Purpose and rules

Use this pack to confirm that the pump owner trusts the system for a realistic
business day. Run it in a separate UAT database or with clearly labelled test
records (`UAT-...`); do not enter these transactions into live records.

- **Pass:** observed result matches expected result.
- **Fail:** an invalid action is accepted, valid action is blocked, or a
  number/status/audit record differs.
- **Blocked:** environment, account, or prerequisite is unavailable.
- Record every concern in the feedback log. Do not modify the application during
  UAT; changes are considered only after owner feedback.

**UAT owner:** ____________________  
**Facilitator:** ____________________  
**Build/version:** ____________________  
**Test date:** ____________________  
**UAT environment/database:** ____________________

## Preparation

Prepare two accounts: **Owner** and **Operator**. Use a test day with no existing
cash session. Create the following records in the isolated UAT environment.

| Type | UAT record | Values |
|---|---|---|
| Unit | UAT Tank A | Diesel; capacity **1,000 L**; opening stock **500 L**; average cost **Rs 100/L**; active |
| Unit | UAT Tank B | Petrol; capacity **500 L**; opening stock **100 L**; average cost **Rs 120/L**; active |
| Customer | UAT Walk-in | Retail |
| Customer | UAT Credit Customer | Credit limit **Rs 10,000**; opening balance **Rs 1,000** |
| Supplier | UAT Supplier | Phone/GST as desired |
| Users | UAT Owner / UAT Operator | Owner and Operator roles |

Before the test day, confirm the business profile, units, customers, and supplier
are visible. Capture the opening stock and customer balance as baseline evidence.

## Controlled full-day scenario

Run these transactions as **Operator** on UAT Day, using the exact figures below.

| Step | Transaction | Entry values | Expected immediate result |
|---:|---|---|---|
| 1 | Open cash day | Opening cash **Rs 5,000** | Session opens with Rs 5,000. |
| 2 | Purchase | UAT Supplier → Tank A; **200 L @ Rs 110**; invoice `UAT-P-001`; **pending** | Purchase **Rs 22,000**; Tank A **700 L**; average cost **Rs 102.86/L**; supplier payable **Rs 22,000**. |
| 3 | Retail sale | Walk-in; Tank A; **50 L @ Rs 130**; cash | Sale **Rs 6,500**; Tank A **650 L**; cash sales +Rs 6,500. |
| 4 | Credit sale | UAT Credit Customer; Tank A; **40 L @ Rs 130**; credit | Sale/due **Rs 5,200**; Tank A **610 L**; customer balance **Rs 6,200**. |
| 5 | Partial sale | UAT Credit Customer; Tank A; **20 L @ Rs 130**; partial; cash paid **Rs 1,000** | Sale Rs 2,600; due **Rs 1,600**; Tank A **590 L**; customer balance **Rs 7,800**. |
| 6 | Customer receipt | UAT Credit Customer; cash **Rs 2,000** | Customer balance **Rs 5,800**; cash receipts +Rs 2,000. |
| 7 | Expense | Electricity; cash **Rs 500** | Cash expenses +Rs 500. |
| 8 | Supplier payment | UAT Supplier; cash **Rs 3,000** | Supplier payable **Rs 19,000**; cash paid to suppliers +Rs 3,000. |
| 9 | Close cash day | Physical cash **Rs 11,000** | Expected cash **Rs 11,000**; variance **Rs 0**; day closes. |

### Hand-calculated acceptance baseline

| Measure | Calculation | Expected |
|---|---|---:|
| Tank A average cost after purchase | `(500 × 100 + 200 × 110) / 700` | **Rs 102.86/L** |
| Tank A closing stock | `500 + 200 − 50 − 40 − 20` | **590 L** |
| Credit customer closing due | `1,000 + 5,200 + 1,600 − 2,000` | **Rs 5,800** |
| Supplier closing payable | `22,000 − 3,000` | **Rs 19,000** |
| Cash sales | `6,500 + 1,000` | **Rs 7,500** |
| Expected closing cash | `5,000 + 7,500 + 2,000 − 500 − 3,000` | **Rs 11,000** |
| Gross margin on three Tank A sales | `(130 − 102.857142...) × 110` | **Rs 2,985.71** |

## UAT scenario checklist

Mark each row Pass, Fail, Blocked, or Not Run. Add a screen, report, audit entry,
or feedback reference in the final column.

| ID | Action | Expected result | Result | Evidence / notes |
|---|---|---|---|---|
| UAT-01 | Owner logs in. | Dashboard and owner functions are available. |  |  |
| UAT-02 | Operator logs in. | Entry screens work; owner-only functions are denied or unavailable. |  |  |
| UAT-03 | Owner adds/edits a unit and deactivates a unit with history. | Valid values save; historical unit is deactivated, not hard-deleted. |  |  |
| UAT-04 | Create retail and credit customers; create a supplier. | Required fields and types save correctly. |  |  |
| UAT-05 | Try invalid master values: blank name, negative capacity/limit where applicable. | Clear validation; invalid record is not saved. |  |  |
| UAT-06 | Complete/inspect opening setup. | Opening stock and balances are visible; setup is protected after confirmation. |  |  |
| UAT-07 | Perform steps 1–2 above. | Session, stock, weighted cost, purchase value, and supplier due match baseline. |  |  |
| UAT-08 | As Operator, enter a purchase that exceeds Tank A's 1,000 L capacity. | Blocked with a clear capacity message. |  |  |
| UAT-09 | As Owner, test capacity override: first decline, then confirm if acceptable. | Only Owner can authorize it; accepted override is confirmed and audited. |  |  |
| UAT-10 | Perform steps 3–5 above. | Stock, sale totals, paid/due amounts, and cost-at-sale are exact. |  |  |
| UAT-11 | Attempt retail sale with credit or partial payment. | Refused; retail requires full cash payment. |  |  |
| UAT-12 | As Operator, attempt sale above available stock. | Blocked; stock and customer due remain unchanged. |  |  |
| UAT-13 | As Owner, test insufficient-stock override. | Explicit Owner action is required; accepted exception is auditable. |  |  |
| UAT-14 | Make a credit sale that takes customer balance above Rs 10,000. | Credit-limit warning appears; owner confirms expected business treatment. |  |  |
| UAT-15 | Perform steps 6–8 above. | Customer due, supplier payable, and cash categories match baseline. |  |  |
| UAT-16 | As Operator, try customer/supplier overpayment. | Blocked; only Owner override may permit the accepted exception. |  |  |
| UAT-17 | Add bank-mode expense and bank/UPI customer receipt. | They affect records/reports but not cash drawer totals. |  |  |
| UAT-18 | Open the credit customer ledger for UAT Day. | Sales are debits, payment is credit, running balance ends at Rs 5,800. |  |  |
| UAT-19 | Filter the ledger by date; print/export if offered. | Filter is respected; output is readable and reconciles. |  |  |
| UAT-20 | Perform step 9 above. | Cash session totals and zero variance equal hand calculation. |  |  |
| UAT-21 | Close another test day with physical cash Rs 100 short, without a note. | Non-zero variance requires a note before close. |  |  |
| UAT-22 | Close that day with a note. | Variance **−Rs 100** and note persist in history/report. |  |  |
| UAT-23 | After close, Operator tries new/backdated sale, purchase, payment, and expense. | Every entry is blocked; no partial record is created. |  |  |
| UAT-24 | Owner reopens a closed day, corrects it, then recloses. | Owner-only reopen is audited; totals recalculate. |  |  |
| UAT-25 | Owner voids a credit sale with a reason. | Sale remains **voided**; stock/due reverse exactly once; active reports exclude it. |  |  |
| UAT-26 | Attempt to void the same sale a second time. | Refused; no second stock/ledger change. |  |  |
| UAT-27 | Owner records shortage/excess stock adjustment with reason. | Stock changes correctly; adjustment is recorded and audited. |  |  |
| UAT-28 | Review stock report by Tank A, Tank B, and combined. | Quantity, capacity, cost, value, and totals reconcile to entries. |  |  |
| UAT-29 | Review Sales, Purchases, Profit, Customer Dues, Supplier Dues, Expenses, Cash, and Daily reports. | UAT Day filters/totals reconcile; voids are identifiable where shown. |  |  |
| UAT-30 | Export/print required reports. | Output is readable, has intended filters/date, and matches screen totals. |  |  |
| UAT-31 | Compare dashboard cards with detailed reports. | Sales, stock, dues, cash, and variance match their sources. |  |  |
| UAT-32 | Review audit log after creates, void, adjustment, and reopen. | User, time, action, record/reference, and useful detail are retained. |  |  |
| UAT-33 | As Operator, try users, audit log, adjustment, void, and day reopen. | Each is unavailable/rejected; data does not change. |  |  |
| UAT-34 | Relaunch app without network connectivity. | Core application starts and local data remains usable offline. |  |  |
| UAT-35 | Run/inspect local backup and restore into a non-production environment. | Backup completes; restored UAT data is present and opens correctly. |  |  |
| UAT-36 | Enter 5–10 normal transactions; navigate, cancel, and correct input. | UI is understandable, saves promptly, errors are clear, and cancel creates nothing. |  |  |

## Owner feedback log

| Ref | Screen / workflow | Owner feedback or issue | Severity (Critical/High/Medium/Low) | Desired outcome | Evidence | Decision |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

## Sign-off

The owner confirms that the full-day cycle was demonstrated and the critical stock,
customer due, supplier payable, expected cash, and variance figures were compared
against the hand-calculated baseline.

- Critical scenarios passed: ☐ Yes ☐ No
- Open critical/high issues are recorded above: ☐ Yes ☐ No
- Owner approves the next agreed step: ☐ Yes ☐ No
- Application changes will be considered only from recorded owner feedback: ☐ Confirmed

**Owner name/signature:** ____________________  
**Date:** ____________________  
**Facilitator signature:** ____________________

