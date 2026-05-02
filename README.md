# Mercury → Google Sheets Finance Tracker

Syncs transactions from a [Mercury](https://mercury.com) bank account into Google Sheets automatically, with flexible expense distribution across partners.

Built for a multi-partner LLC to track income, expenses, and each partner's share without any external services or paid tools.

## How it works

Two Google Apps Script files handle everything:

- **MercurySync.gs** — polls the Mercury API every 10 minutes and appends new transactions to the sheet. Also includes a full historical sync function.
- **Triggers.gs** — listens for changes to the Distribution dropdown and auto-fills each partner's share based on a lookup table.

Transactions are only imported when their status is `sent` — pending and failed transactions are ignored, so the sheet always matches the real Mercury balance.

## Sheet structure

### Transactions
Main table. One row per transaction.

| Column | Description |
|---|---|
| ID | Mercury transaction UUID (used to prevent duplicates) |
| Fecha | Posted date |
| Comercio | Counterparty name |
| Descripción banco | Raw bank description |
| Monto (USD) | Amount (positive = income, negative = expense) |
| Categoría | Mercury category |
| Estado | Transaction status |
| Distribución | Dropdown — selects how this transaction is split |
| Fran / Facu / Agus | Each partner's proportion (0–1) |
| Tipo | Transaction kind (debitCardTransaction, ach, etc.) |

### Distribuciones
Lookup table for distribution presets.

| Distribución | Fran | Facu | Agus |
|---|---|---|---|
| Equitativa | 0.33 | 0.34 | 0.33 |
| Fran | 1 | 0 | 0 |
| Facu | 0 | 1 | 0 |
| Agus | 0 | 0 | 1 |
| FF | 0.5 | 0.5 | 0 |

Add any preset here and it becomes available in the dropdown instantly. The reserved name `Custom` skips the auto-fill — selecting it leaves the partner columns free for manual entry.

## Setup

### 1. Create the Google Sheet
Create a new Google Sheet with two tabs: `Transactions` and `Distribuciones`. Set up the column headers and populate the Distribuciones table with your partners and presets.

Set the Distribución column in Transactions to use a Data Validation dropdown pointing to `Distribuciones!A2:A`.

### 2. Add the scripts
In the sheet go to **Extensions > Apps Script**. Create two files and paste the contents of `MercurySync.gs` and `Triggers.gs`.

### 3. Configure Script Properties
Go to **Project Settings > Script Properties** and add:

| Property | Value |
|---|---|
| `MERCURY_API_KEY` | Your Mercury API token — include the `secret-token:` prefix |
| `MERCURY_ACCOUNT_ID` | Your Mercury account ID (found in the Mercury dashboard URL) |
| `ACCOUNT_START_DATE` | Date to sync from, in `YYYY-MM-DD` format |

Generate your Mercury API key at [app.mercury.com/settings](https://app.mercury.com/settings). A read-only token is sufficient.

### 4. Run initial setup
In the Apps Script editor, run these two functions once:

1. `syncAllTransactions()` — imports full transaction history
2. `setupPollingTrigger()` — installs the automatic 10-minute polling

The `onEdit` trigger for the distribution dropdown requires no installation — it works automatically.

## Notes

- Google Workspace accounts cannot expose Apps Script Web Apps to anonymous external traffic, so webhooks are not used. Polling every 10 minutes is reliable enough for financial tracking.
- The 2-day lookback window in the polling function handles transactions that Mercury takes time to post.
- Partner proportions are stored as decimals (0–1). Multiply by the transaction amount to get each partner's dollar share.
