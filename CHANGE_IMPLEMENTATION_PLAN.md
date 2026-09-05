# Change Implementation Plan

## Purpose

Upgrade the existing pump system in three related areas without changing historical records or interrupting offline operation.

## 1. Fuel classification

- Add a required `fuelType` field to each unit with the supported values `diesel` and `petrol`.
- Default existing and newly created units to `diesel` so legacy data remains valid.
- Expose the field in the Units/Tanks master and include it in unit labels used while entering purchases and sales.

## 2. Cash paid to suppliers

- Add `totalCashPaidToSuppliers` to a cash session.
- Aggregate cash-mode supplier payments alongside sales, customer receipts, and expenses.
- Calculate expected drawer cash as:

  `opening cash + cash sales + cash customer receipts - cash expenses - cash paid to suppliers`

- Show the new outflow in the live cash summary, closed-session view, session history, daily report, and dashboard net-cash calculation.

## 3. Atomic transaction handling

- Add a shared Mongoose transaction helper.
- Execute the multi-document purchase, sale, void, customer-payment, supplier-payment, and stock-adjustment flows within a database transaction.
- Make the stock, ledger, and audit helpers session-aware.
- Preserve the current single-machine setup: if MongoDB is running standalone and cannot support transactions, retry the operation without a session and emit a clear server warning. A replica set is recommended for full atomic guarantees.

## Verification

- Build and lint the React application.
- Perform static backend syntax checks.
- Confirm all legacy default paths remain compatible with existing unit and cash-session documents.
