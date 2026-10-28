# Get-ID — Admin Panel

Employee / agent back-office for a white-label betting & exchange platform, built to
match the reference panel (branded "Get-ID", served at `emp.adminpay1.net`).

Hierarchy modelled throughout: **Super Admin → White Label → Master → Employee → Client**.
Almost every operational page is scoped to whichever client the employee has selected,
which is why they show *"Please Select Client To Continue"* until one is picked.

## What's in it

| Page | Route | Contents |
| --- | --- | --- |
| Dashboard | `/dashboard` | Date-range picker, KPI cards (User Pending Request, Total Deposit, Total Withdrawals, Profit/Loss), inprocess + suspicious cards, Users breakdown |
| Request | `/request` | Tabs: Wallet Requests / Statement Import / Checker Panel. Filters (master, type, status, suspicious, date, UTR, user), Go/XLS/PDF, "Data refetch in every 17 Sec", approve/hold/reject, bulk approve, raise a request |
| Reports | `/reports` | Tabs: Monitoring Report / Agents D/W / Bank Account Total Amount |
| Suspicious | `/suspicious` | Tabs: Suspicious Users / User Accounts / Account Requests, permission-gated |
| Clients | `/clients` | Search + sort by balance, client table (Credit Reference, Balance, Player Balance, Exposure, P&L), Add Client, per-client detail page with ledger |
| Broadcast | `/broadcast` | Per-client broadcast compose + history |
| Videos | `/videos` | Per-client deposit/withdrawal walkthrough videos |
| Bank Account | `/bank-account` | Tabs: Bank Accounts / Agent Bank Accounts / Global Account / Bank Activity Log, add + enable/disable |
| Settings | `/settings` | Tabs: Payment Limit / Stakes / Wallet Multiplier / Rules |
| Configurations | `/configurations` | Remarks CRUD |
| Profile | `/profile` | Password change with show/hide |
| MFA | `/mfa` | Tabs: 2FA Method Disable / Trusted Devices / 2FA Authentication (TOTP enrolment) / Add Email ID (OTP) / Email Configured |
| Permissions | `/permissions` | White Label + Master pickers, per-employee Read/Write permission matrix |

Plus the shared shell from the reference screenshots: collapsible sidebar, top bar with
global client search, notification bell, avatar, floating quick-actions gear and
scroll-to-top button.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS v4**
- **PostgreSQL** via **Prisma 6** using the **node-postgres driver adapter**
- Auth: signed JWT session cookie (`jose`) + `bcryptjs`, TOTP 2FA (`otplib`)
- Route guard via Next 16 `proxy.ts`; full verification in the panel layout

## Getting started

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL + SESSION_SECRET

# pick one database:
npx prisma dev                # local throwaway Postgres, prints a DATABASE_URL
docker compose up -d          # or a containerised Postgres on :5432

npx prisma generate
npx prisma db push
npm run db:seed
npm run dev                   # http://localhost:3000
```

### Seeded logins

| Role | Username | Password |
| --- | --- | --- |
| Employee | `Ash01` | `Password@123` |
| Master | `reddytech247` | `Password@123` |
| Super admin | `superadmin` | `Password@123` |

`Ash01` is deliberately seeded **without** the `SUSPICIOUS_USERS` permission and with
withdrawal access read-only, so the *"You Are Not Authorized. Please Contact Your
Upline"* state and the blocked-approval path are visible out of the box.

## Money handling

All amounts are stored as `BigInt` **paise**. `src/lib/money.ts` is the only place that
converts to rupees. Approving a request flips its status, moves the client balance and
appends a ledger row inside a single transaction, guarded by a conditional update so a
double click can never pay twice.

## Notes and known gaps

- **XLS export** streams CSV with an `.xls` filename so Excel opens it directly; swap in
  `exceljs` if you need real workbooks. **PDF** opens a print-ready statement view.
- **Email OTP** has no mailer wired up — in dev the code is returned in the response.
  Plug in your SMTP/API provider in `src/app/actions/account.ts`.
- The reference panel's *Bet Slip Status* and *Category* filters belong to a betting-slip
  module that this schema doesn't model yet; the other request filters are live.
- `scripts/dbtest.ts` is a quick connectivity check: `npx tsx scripts/dbtest.ts`.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run db:push    # sync schema
npm run db:seed    # reseed demo data
npm run db:studio  # Prisma Studio
```
