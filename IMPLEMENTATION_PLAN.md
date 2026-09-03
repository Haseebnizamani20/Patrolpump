# Implementation Plan — Diesel Pump Management System

## 1. Approach

Build bottom-up: database schema → API layer → core entry screens → derived features (ledger, cash register, reports) → packaging. Each phase should be independently testable before moving to the next, since correctness of stock/cash numbers depends entirely on earlier phases being right.

---

## 2. Project Structure

```
diesel-pump-app/
├── electron/
│   ├── main.js                 # Electron entry point, spawns Express + opens window
│   └── preload.js
├── server/
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── models/
│   │   ├── Unit.js
│   │   ├── Customer.js
│   │   ├── Supplier.js
│   │   ├── PurchaseEntry.js
│   │   ├── SaleEntry.js
│   │   ├── Payment.js
│   │   ├── Expense.js
│   │   ├── CashSession.js
│   │   ├── StockAdjustment.js
│   │   ├── AuditLog.js
│   │   └── User.js
│   ├── routes/
│   │   ├── units.routes.js
│   │   ├── customers.routes.js
│   │   ├── suppliers.routes.js
│   │   ├── purchases.routes.js
│   │   ├── sales.routes.js
│   │   ├── payments.routes.js
│   │   ├── expenses.routes.js
│   │   ├── cashSessions.routes.js
│   │   ├── stock.routes.js
│   │   ├── reports.routes.js
│   │   └── auth.routes.js
│   ├── controllers/             # one per route file above
│   ├── middleware/
│   │   ├── auth.js               # login check
│   │   ├── role.js               # owner/operator permission check
│   │   └── auditLogger.js
│   ├── services/
│   │   ├── stockService.js       # avg cost calc, stock in/out
│   │   ├── ledgerService.js      # customer balance updates
│   │   └── cashService.js        # daily cash calc
│   └── app.js                    # Express app setup
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Units/
│   │   │   ├── Customers/
│   │   │   ├── Suppliers/
│   │   │   ├── Purchase/
│   │   │   ├── Sale/
│   │   │   ├── Payments/
│   │   │   ├── Expenses/
│   │   │   ├── Ledger/
│   │   │   ├── CashRegister/
│   │   │   ├── StockReport/
│   │   │   ├── Reports/
│   │   │   └── Setup/            # onboarding: opening balances/stock
│   │   ├── components/
│   │   ├── api/                  # axios calls to Express
│   │   ├── context/               # auth/role context
│   │   └── App.jsx
├── backup/
│   └── backup-script.js          # scheduled mongodump job
├── package.json
└── README.md / REQUIREMENTS.md / IMPLEMENTATION_PLAN.md
```

---

## 3. Phased Build Plan

### Phase 0 — Project Setup
- Initialize Express server, connect local MongoDB, initialize React app (Vite), initialize Electron shell that launches both.
- Set up `.env` for DB name/port (no secrets needed since fully local).
- Confirm Electron window opens with React app loading via local Express API successfully.

**Exit criteria:** Empty app opens as a desktop window, hits a test API route, shows a response.

---

### Phase 1 — Auth & Roles
- User model, login screen, session/token handling (local, simple — JWT stored in memory or local file).
- Middleware for Owner-only vs Operator-allowed routes.
- Seed one default Owner account on first run.

**Exit criteria:** Login works, Operator is blocked from Owner-only routes (tested directly via API).

---

### Phase 2 — Master Data
- Units CRUD (with capacity, status).
- Customers CRUD (retail/credit type, credit limit, opening balance field disabled after Setup phase is done).
- Suppliers CRUD.
- Setup screen: one-time entry of opening stock per unit and opening balance per customer, locks after confirmation.

**Exit criteria:** Owner can add tanks, customers, suppliers; opening balances save correctly and are visible on customer/unit records.

---

### Phase 3 — Purchase & Sale Entry
- Purchase entry form + API: updates unit stock and weighted average cost (`stockService`).
- Sale entry form + API: validates stock availability, customer credit limit warning, updates unit stock, updates customer balance (`ledgerService`), records cost-at-sale.
- Void sale flow (Owner only) — reverses stock/ledger, marks record voided.
- Stock adjustment entry.

**Exit criteria:** A purchase increases stock and recalculates avg cost correctly; a sale decreases stock, respects credit limit warning, and correctly updates customer balance; a void correctly reverses both.

---

### Phase 4 — Payments & Expenses
- Payment entry against customer due, reduces balance.
- Expense entry, tagged cash/bank.

**Exit criteria:** Payment reduces customer balance correctly; expense saves and is retrievable by category/date.

---

### Phase 5 — Customer Ledger
- Ledger view: chronological sales (debit) + payments (credit) with running balance, filterable by date, printable/exportable.

**Exit criteria:** Ledger balance matches customer's `currentBalance` field exactly for a test customer with mixed sales/payments.

---

### Phase 6 — Cash Register / Daily Closing
- `cashService`: aggregates cash sales, cash receipts, cash expenses, cash paid to supplier for the day.
- Day open/close flow: opening cash carry-forward, physical count entry, variance calculation, mandatory note on mismatch.
- Day lock: block new/backdated entries into a closed day; Owner-only reopen with audit log entry.

**Exit criteria:** A simulated day with mixed cash/credit sales, one expense, and one payment produces a correct expected closing figure; entering a physical count shows correct variance; closed day blocks new entries.

---

### Phase 7 — Stock Report
- Per-unit and combined report: opening + purchases − sales ± adjustments = closing.
- Daily/weekly/monthly views.

**Exit criteria:** Report figures reconcile exactly against the sum of individual purchase/sale/adjustment entries for a test date range.

---

### Phase 8 — Reports Suite
- Sales, Purchase, Profit/Margin, Customer Dues (with ageing), Supplier Dues, Expense, Cash reports.
- Export/print (PDF) for each.

**Exit criteria:** Each report's totals independently reconcile against raw entry data; PDF export renders correctly.

---

### Phase 9 — Dashboard
- Today's sales, today's stock levels, top customer dues, low-stock alert, yesterday's cash variance flag,Total Customer Dues .

**Exit criteria:** Dashboard numbers match their respective detailed reports for the same day.

---

### Phase 10 — Audit Log & Polish
- Full audit log view (Owner only): edits, voids, deletes, day reopens — who/when/what.
- UI polish: confirmation dialogs for destructive/override actions, large buttons for operator ease of use, error states.

**Exit criteria:** Every void/edit/reopen action produces a corresponding audit log entry.

---

### Phase 11 — Backup & Packaging
- Scheduled daily `mongodump` script, configurable backup folder path, optional sync to external drive.
- Electron build/package for Windows (assuming the pump laptop runs Windows) into a single installer.
- Manual restore test: wipe local DB, restore from backup dump, verify data integrity.

**Exit criteria:** Installer runs on a clean machine; backup/restore cycle verified with no data loss.

---

### Phase 12 — User Acceptance Testing (with the owner)
- Walk the owner through a real day: opening setup, a few purchases, mixed sales, a payment, an expense, day closing.
- Confirm the numbers match what he'd expect from his manual records.
- Collect feedback on UI friction points (operator-facing screens especially).

**Exit criteria:** Owner signs off that a full day's cycle produces numbers he trusts.

---

## 4. API Route List (summary)

```
POST   /api/auth/login
GET    /api/units            POST /api/units            PUT /api/units/:id
GET    /api/customers        POST /api/customers         PUT /api/customers/:id
GET    /api/suppliers        POST /api/suppliers         PUT /api/suppliers/:id
GET    /api/purchases        POST /api/purchases
GET    /api/sales            POST /api/sales             POST /api/sales/:id/void
GET    /api/payments         POST /api/payments
GET    /api/expenses         POST /api/expenses
GET    /api/cash-sessions/today   POST /api/cash-sessions/close
POST   /api/cash-sessions/reopen  (Owner only)
GET    /api/stock/report
POST   /api/stock/adjustment
GET    /api/reports/sales | /purchases | /profit | /customer-dues | /supplier-dues | /expenses | /cash
GET    /api/ledger/:customerId
GET    /api/audit-log         (Owner only)
POST   /api/setup/opening-balances   (one-time)
```

---

## 5. Order of Dependency (why phases are sequenced this way)

- Auth/roles must exist before any data entry, since permission checks are baked into every later route.
- Master data (units, customers, suppliers) must exist before purchase/sale entry, since those entries reference them.
- Purchase/sale must be correct before cash register or reports, since both derive numbers from those entries.
- Ledger and stock report can be built in parallel once purchase/sale is stable.
- Reports suite comes last since it aggregates everything above.
- Packaging/backup is last since it wraps a functionally complete app.

---

## 6. Testing Notes

- Each phase's "Exit criteria" above should be manually verified (or scripted with a basic test) before starting the next phase — stock/cash bugs compound quickly if not caught early.
- Recommend keeping a fixed "test day" scenario (known purchases/sales/payments/expenses with a hand-calculated expected result) to re-run after every phase as a regression check.

---

## 7. Estimated Sequencing (not fixed dates — for planning order only)

1. Phase 0–1: Setup & Auth
2. Phase 2: Master Data
3. Phase 3: Purchase & Sale (core, most critical, most testing time)
4. Phase 4–5: Payments, Expenses, Ledger
5. Phase 6–7: Cash Register, Stock Report
6. Phase 8–9: Reports, Dashboard
7. Phase 10–11: Audit, Backup, Packaging
8. Phase 12: UAT with owner, fixes, handover
