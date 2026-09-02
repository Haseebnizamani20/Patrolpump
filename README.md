# Diesel Pump Management System

A desktop application for a diesel pump owner to manage tank/unit stock, customer credit ledgers, purchases, sales, daily cash reconciliation, and business reports — running entirely on a single laptop at the pump, with no internet dependency.

---

## 1. Overview

The owner buys diesel from a supplier into storage tanks/dispensing units, sells it to walk-in (retail) and credit (ledger) customers, and needs to know at any moment:

- How much stock is in each tank
- How much each credit customer owes him
- How much cash should physically be in the drawer
- Whether he's making a profit, and how much

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React | Runs inside Electron shell |
| Backend | Express (Node.js) | Runs locally in background |
| Database | MongoDB (local install) | No cloud dependency; works offline |
| Packaging | Electron | Single desktop app, no browser/URL needed |
| Backup | `mongodump` scheduled job | Daily dump to local folder + optional cloud/USB sync |

Runs fully offline on one laptop at the pump. No internet required for daily operation.

---

## 3. Core Modules

1. **Units Master** — tanks/dispensers: capacity, current stock, weighted avg. cost, status
2. **Customer Master** — retail & credit customers, credit limits, opening balances
3. **Supplier Master** — diesel suppliers/depots
4. **Purchase Entry** — stock in, per supplier, per tank
5. **Sale Entry** — stock out, per customer, per dispenser, cash/credit/partial
6. **Payment/Receipt Entry** — collections against customer dues
7. **Expense Entry** — daily operating expenses (cash or bank)
8. **Customer Ledger** — running khata-style statement per credit customer
9. **Cash Register / Daily Closing** — expected vs. physical cash, variance tracking
10. **Stock Report** — opening + purchase − sale = closing, per tank & combined
11. **Reports** — sales, purchases, profit/margin, customer dues, supplier dues, expenses, cash
12. **Users/Roles** — Owner (full access) vs. Operator (entry-only, no edit/delete)

---

## 4. Data Model

### Unit (tank/dispenser)
```
unitId, name, capacity, currentStock, avgCost, status(active/maintenance)
```

### Customer
```
customerId, name, phone, type(retail/credit), creditLimit,
openingBalance, currentBalance
```

### Supplier
```
supplierId, name, phone, gstNo
```

### PurchaseEntry
```
date, supplierId, unitId, quantity, rate, amount,
invoiceNo, paymentStatus, notes
```

### SaleEntry
```
date, customerId, unitId, quantity, rate, amount,
paymentType(cash/credit), amountPaid, dueAmount, costAtSale
```

### Payment
```
date, customerId, amount, mode(cash/UPI/bank), notes
```

### Expense
```
date, category, amount, mode(cash/bank), notes
```

### CashSession
```
date, openingCash, cashSales, cashReceipts, cashExpenses,
cashPaidToSupplier, expectedClosing, physicalCount, variance,
closedBy, status(open/closed)
```

### StockAdjustment
```
date, unitId, type(shortage/excess), quantity, reason
```

---

## 5. Key Flows

### Purchase Flow
Select supplier → select receiving tank → enter quantity, rate, invoice no. →
system checks tank capacity → stock & weighted avg. cost updated →
mark supplier payment status (paid/pending).

### Sale Flow
Select customer type:
- **Retail** → quick entry, must be paid in full immediately
- **Credit** → select customer → system shows current due & credit limit
  → warns (does not block) if limit exceeded → payment can be full, partial, or fully on credit
  → due amount posts to customer ledger

Stock deducts from the selected tank. Sale is blocked if tank stock is insufficient,
with an owner-only override for physical/system discrepancies.

### Ledger Flow
Every credit customer has a running statement: each sale (debit) and payment (credit)
in date order with a running balance — printable/exportable, same as a manual khata book.

### Daily Cash Closing Flow
1. Day opens with opening cash (auto-carried from previous day, editable)
2. Cash sales, cash receipts, and cash expenses feed the session automatically
3. System calculates:
   `Expected cash = Opening + Cash Sales + Cash Receipts − Cash Expenses − Cash Paid to Supplier`
4. Operator counts drawer physically, enters actual amount
5. System shows variance (short/excess); note required if mismatched
6. Day is closed — no backdated entries without owner reopening (audit-logged)

### Stock Report Flow
`Opening stock + Today's purchases − Today's sales ± Adjustments = Closing stock`
Available per tank and combined, daily/weekly/monthly.

### Profit/Margin Calculation
Diesel from different purchase batches mixes in the same tank, so cost is tracked
as a **weighted average**:
```
newAvgCost = (oldStock × oldAvgCost + newQty × newRate) / (oldStock + newQty)
```
Each sale records `costAtSale` using the tank's average cost at that moment,
so margin = `(rate − costAtSale) × quantity`.

---

## 6. Reports

| Report | Contents |
|---|---|
| Sales | By date / customer / unit, totals + line items |
| Purchases | By date / supplier, totals + line items |
| Profit/Margin | Revenue − cost of diesel sold (weighted avg. cost basis) |
| Customer Dues | Outstanding balances with ageing (0–7 / 8–30 / 30+ days) |
| Supplier Dues | Amounts owed per supplier, by invoice |
| Expenses | By category and date range |
| Cash | Daily closing history — opening, expected, physical, variance trend |

---

## 7. Important Edge Cases Handled

- **Daily rate changes** — rate stored per entry, never referenced globally
- **Physical vs. system stock mismatch** — corrected via Stock Adjustment, not fake purchase/sale entries
- **Partial payments** — a single sale can split cash + credit
- **Backdated/edited entries** — allowed with full audit trail (who, when, what changed)
- **Opening balances** — one-time setup screen for existing customer dues and tank stock before go-live
- **Credit limit breach** — warns, does not hard-block
- **Cancel/void a sale** — reverses stock & ledger impact; row is kept (voided), never deleted, for audit purposes
- **Day closing lock** — prevents silent backdated tampering with cash reports

---

## 8. Roles

| Role | Permissions |
|---|---|
| Owner | Full access: create/edit/delete, reports, day reopen, user management |
| Operator | Create purchase/sale/payment/expense entries only; no edit/delete; no reports beyond daily summary |

---

## 9. Backup Strategy

Since this runs on a single laptop, backup is critical:

- Scheduled daily `mongodump` to a local backup folder
- Auto-sync that folder to Google Drive or a USB drive
- Recommend weekly manual verification that backups are restorable

---

## 10. Future Extensions (not in initial scope)

- LAN access so the owner can check reports from his phone
- Cloud sync / multi-location support
- SMS/WhatsApp reminders to customers with high dues
- GST-compliant invoicing
