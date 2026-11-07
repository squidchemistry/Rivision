# Rivision demo

A five-minute walkthrough that needs **no API key**. In demo mode the AI is a deterministic offline stand-in: questions come from the study material's headings and answers are scored by how many of the material's key terms they use. The product flow is real; only the AI is simulated, and a banner on every page says so.

## Start it

**Docker (nothing else to install):**

```bash
docker compose up --build        # http://localhost:3000
```

This starts Postgres, applies migrations, loads the demo accounts and serves the app with `DEMO_MODE=true`. If port 3000 is taken: `APP_PORT=3200 docker compose up --build`. Stop with `docker compose down` (add `-v` to wipe the database).

**Without Docker** (Node 20+ and any Postgres):

```bash
npm install
cp .env.example .env     # set DATABASE_URL, DIRECT_URL and NEXTAUTH_SECRET
npm run db:migrate
npm run db:seed-demo
npm run demo             # DEMO_MODE=true, mock AI, http://localhost:3000
```

Re-running `npm run db:seed-demo` resets the demo accounts to the state below.

## Accounts

| | Email | Password | Notes |
|---|---|---|---|
| Learner | `demo@rivision.app` | `demo-learner-1` | Pro plan, 3 topics, 6 questions (2 due today), 4-day streak, score history |
| Admin | `admin@rivision.app` | `demo-admin-1234` | One pending payment (UTR `DEMO-UTR-000123`) to approve |

`DEMO_PASSWORD` overrides both passwords if set.

## Walkthrough

1. **Profile** (sign in as the learner). Streak, average score and the revision calendar are already populated.
2. **Revise** (`/daily`). Choose **Theory Q&A** and start. The first two questions are tagged *Due for review*: they are the saved questions whose review date has arrived. The other three are fresh questions for the weakest topics. Answer all five (a few sentences each; the answer needs 15+ words to score above 40) and submit. You get a score per question and feedback listing the key terms you covered or missed. Behind the scenes each question is rescheduled from its score (the date is stored, not shown).
3. **Generate** (`/generate`). Paste notes under a title with numbered capitals headings (for example `1. SLIDING WINDOW`) and generate. One coding problem per heading appears in the topic.
4. **Plans** (`/pricing`, `/payment`). Free is 20 AI questions a month, Pro 200, Premium unlimited. Generating past the limit returns a clear "upgrade" message. Payment is manual: the learner submits a UPI/bank reference and an admin approves it.
5. **Admin** (sign out, then sign in as the admin, `/admin`). Approve `DEMO-UTR-000123`. The paying user's plan and expiry update immediately. As the learner, `/admin` redirects to your profile, and the admin API returns 403.

## What to point out

- Spaced repetition: a pass doubles a question's interval (x2.5 at 85+), a fail brings it back tomorrow.
- Plan limits are reserved in the database before the AI is called, so parallel requests cannot exceed them (covered by a concurrency test).
- Admin access is checked against the database on every request, not the session token, so a demoted admin loses access at once.

## Switching to the real AI

Set `GROQ_API_KEY` and remove `DEMO_MODE` (or set `DEMO_MODE=false`). With Docker: `GROQ_API_KEY=... DEMO_MODE=false DEMO_SEED=false NEXTAUTH_SECRET=$(openssl rand -base64 32) docker compose up --build`.

## Do not expose a demo publicly as-is

The demo accounts have known passwords and the default `NEXTAUTH_SECRET` in `docker-compose.yml` is a placeholder. For a shared demo, set a real `NEXTAUTH_SECRET` and a `DEMO_PASSWORD`.
