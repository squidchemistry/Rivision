# Rivision

AI-powered spaced repetition for coding interviews and theory subjects. Learners add study material (notes, PDFs, DOCX, links), the AI turns it into practice questions, and a daily session mixes questions that are due for review with fresh ones on the learner's weakest topics. Answers are graded by AI, and each question is rescheduled based on the score.

Built with **Next.js 16** (App Router), **React 19**, **PostgreSQL + Prisma 6**, **NextAuth 4** and **Groq**.

---

## How the product works

| | |
|---|---|
| **Topics** | A topic holds study material. Material comes from pasted text, files (PDF, DOCX, TXT, MD, CSV, JSON, ZIP) or public web links. |
| **Generate** (`/generate`) | Creates a topic and N AI coding problems from its material. |
| **Daily session** (`/daily`) | 5 questions. Saved questions that are **due** come first; AI fills the rest, favouring weak and high-priority topics. Coding and theory modes are kept separate. |
| **Grading & scheduling** | The AI scores each answer 0–100 (blank answers score 0 without an AI call). A pass (≥ 60) doubles the review interval (×2.5 at ≥ 85, capped at 180 days); a fail brings the question back tomorrow. |
| **Streaks** | One or more sessions per calendar day keeps the streak going. Days roll over at midnight in `APP_TIMEZONE`. |
| **Question library** (`/questions`) | Add theory questions by hand; they join the review schedule. |

### Plans and billing

Plans, prices and limits live in one place: [`src/lib/plans.ts`](src/lib/plans.ts).

| Plan | Price | AI questions / month |
|---|---|---|
| Free | ₹0 | 20 |
| Pro | ₹999 / month | 200 |
| Premium | ₹1,999 / month | Unlimited |

- **Annual billing** is 20% off, paid up front for 12 months.
- **What counts:** every AI-generated question (from Generate and from new questions in a daily session). Due reviews and grading are free.
- **Enforcement:** the limit is reserved in the database before the AI is called (one conditional `UPDATE`), so parallel requests can't exceed it, and unused reservations are returned on failure.
- **Payments are manual:** the learner pays by UPI or bank transfer to the details in `NEXT_PUBLIC_PAYMENT_*`, then submits the transaction reference (UTR). The server sets the amount from the plan catalog. An admin approves it at `/admin`, which sets the plan and an expiry 30 or 365 days out (extending any active period of the same plan). One pending request per user; a reference can't be reused.
- **Expiry:** when a paid period ends, the user is treated as Free automatically. Plans never renew without a new payment.

---

## Local development

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env
```

### 1. Database

The quickest local Postgres is Prisma's built-in dev server (no Docker needed):

```bash
npm run db:dev
```

It prints a TCP URL like `postgres://postgres:postgres@localhost:51218/template1?sslmode=disable`. Put it in `.env` as both `DATABASE_URL` and `DIRECT_URL`, and add these to `DATABASE_URL` only:

```
&pgbouncer=true&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0
```

The local server shares one database session across connections, so prepared statements must be off (`pgbouncer=true`). Any regular Postgres (Docker, Neon, Supabase) works too, without those extras.

Then create the tables:

```bash
npm run db:migrate
```

### 2. Environment

See [`.env.example`](.env.example) for every variable. The essentials:

| Variable | |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL. In production, `DATABASE_URL` is the pooled URL and `DIRECT_URL` the direct one (used by migrations). |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Site URL and session secret (`openssl rand -base64 32`). The server refuses to start in production without the secret. |
| `GROQ_API_KEY` | From [console.groq.com/keys](https://console.groq.com/keys). |
| `GROQ_MODEL` | Optional. Defaults to `openai/gpt-oss-120b`, falling back to `qwen/qwen3.8-27b` if a model is retired. |
| `APP_TIMEZONE` | Day and month boundaries for streaks and limits. Default `Asia/Kolkata`. |
| `NEXT_PUBLIC_PAYMENT_*` | UPI ID and bank details shown at checkout. Checkout is disabled until set. |

### 3. Run

```bash
npm run dev            # http://localhost:3000
npm run admin:create   # create/reset the admin from ADMIN_EMAIL + ADMIN_PASSWORD (12+ chars)
```

Optional sample content: sign up, set `SEED_USER_EMAIL` to that account's email, then `npm run db:seed` to add 14 DSA topics.

### Scripts

| Script | |
|---|---|
| `dev` / `build` / `start` | Next.js (build also runs `prisma generate`) |
| `lint` / `typecheck` | ESLint and `tsc --noEmit` |
| `db:dev` | Start the local Prisma Postgres server |
| `db:migrate` | Create/apply migrations in development |
| `db:deploy` | Apply migrations in production |
| `db:seed` | Seed DSA topics for `SEED_USER_EMAIL` |
| `admin:create` | Create or reset the admin account |

---

## Deploying

Works on any Node host; on Vercel:

1. Create a Postgres database (Prisma Postgres, Neon or Supabase). Use the **pooled** URL for `DATABASE_URL` and the **direct** URL for `DIRECT_URL`.
2. Set all variables from `.env.example` in the host. `NEXTAUTH_URL` must be the public URL.
3. Run `npm run db:deploy` against the production database (once per release with new migrations, e.g. as a release step).
4. Build with `npm run build` and start with `npm start`.
5. Run `npm run admin:create` once with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set, then remove `ADMIN_PASSWORD`.

### Scaling notes

- The app is stateless; run as many instances as needed. Sessions are JWTs.
- **Plan limits** are enforced in Postgres, so they hold across instances.
- **Rate limits** (sign-in 10/15 min per email, sign-up 5/hour per IP, AI 30/hour per user) are kept in memory per instance. With several instances, move the store in [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts) to Redis (e.g. Upstash) for shared limits.
- AI calls are the slow, costly part (10–60 s). Long requests need a host timeout of at least 60 s.

---

## Security

- Every API route resolves the user through `requireUser()` / `requireAdmin()` ([`src/lib/auth.ts`](src/lib/auth.ts)); data is always filtered by the signed-in user. Admin checks read the role from the database.
- Accounts are created only through sign-up (`/api/auth/register`); passwords are bcrypt-hashed (cost 12), emails are case-insensitive, and sign-in gives the same error for unknown emails and wrong passwords.
- Errors return generic messages; details are logged server-side only ([`src/lib/http.ts`](src/lib/http.ts)).
- Link import only fetches public `http(s)` addresses (private, loopback and cloud-metadata ranges are refused, also after redirects), with a 10 s timeout and 3 MB cap. Uploads are capped at 5 files × 10 MB; ZIPs at 50 entries / 20 MB unpacked.
- Security headers (frame denial, `nosniff`, referrer policy, HSTS in production) are set in [`next.config.ts`](next.config.ts).

---

## Project layout

```
prisma/schema.prisma        Data model (PostgreSQL)
src/lib/plans.ts            Plans, prices, limits, expiry rules
src/lib/usage.ts            Monthly AI question quota (reserve/release)
src/lib/db.ts               Topics, scheduling, streaks, profile stats
src/lib/ai.ts               Groq prompts: generation and grading
src/lib/extract.ts          Text from files and links (safe fetch)
src/lib/auth.ts             NextAuth config, requireUser/requireAdmin
src/app/api/*               Route handlers
src/app/*/page.tsx          Pages
scripts/                    Admin and seed scripts
```
