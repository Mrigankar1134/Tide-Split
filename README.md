# Tide Split

Mobile-first expense splitting for the nine of us. Next.js 14 · Neon Postgres · S3 receipts · Framer Motion glass UI.

## 1. Install & run locally

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run db:init              # creates tables in Neon
npm run dev                  # http://localhost:3000
```

## 2. Neon

1. Create a project at neon.tech (region: Asia Pacific / Singapore is closest to Pune).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Run `npm run db:init` once (or paste `db/schema.sql` into the Neon SQL editor).

## 3. S3 bucket for bills

1. Create a bucket, e.g. `tide-split-receipts` in `ap-south-1` (Mumbai). Keep "Block all public access" ON — the app uses presigned URLs.
2. Bucket → Permissions → CORS, paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-APP.vercel.app"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Create an IAM user with only this policy, then create an access key for it:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::tide-split-receipts/*"
  }]
}
```

4. Put `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` in `.env.local`.

Receipts work without S3 too — the attach button simply reports that storage isn't set up yet.

## 4. GitHub + Vercel

```bash
git init && git add . && git commit -m "Tide Split"
git remote add origin https://github.com/Mrigankar1134/Tide-Split.git
git branch -M main && git push -u origin main
```

Import the repo at vercel.com → add the six env vars from `.env.example` → Deploy. Add the Vercel URL to the S3 CORS list. Open it on your phone and "Add to Home Screen" for an app-like feel.

## Login PINs

Each of the nine people has a 4-digit PIN (seeded as SHA-256 hashes in `db/schema.sql`; the plaintext list was shared privately — never commit it). Sessions are signed cookies that last 180 days, so people log in once per phone. Anyone can change their own PIN from the account sheet (tap your avatar). To reset someone's PIN, run in Neon:

```sql
update pins set pin_hash = encode(sha256('rahul:1234'::bytea), 'hex') where person_id = 'rahul';
```

Set `SESSION_SECRET` in Vercel to any long random string (it falls back to the DB URL, but set it anyway).

## How it works

- Every expense and payment records where it was entered (device GPS + a short place name from OpenStreetMap). Location is optional — deny the prompt or tap ✕ on the chip and it saves without it.
- Expenses support one or several payers, and equal / custom-amount / percentage splits. Paise are distributed so totals always match exactly.
- Balances tab shows exact pairwise positions with you, plus the fewest transfers that would clear the whole group.
- Deleting an expense removes its receipt from S3 as well.

## Project layout

```
app/page.tsx            device onboarding → dashboard
app/api/ledger          GET everything (with presigned receipt links)
app/api/expenses        POST create · DELETE /[id]
app/api/settlements     POST record payment · DELETE
app/api/upload          presigned S3 PUT
components/             UI (Dashboard, AddExpense, Balances, Activity, Settle, Sheet…)
lib/split.ts            split math, balances, debt simplification
lib/people.ts           the nine people & categories
db/schema.sql           Postgres schema
```
