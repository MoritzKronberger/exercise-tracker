# Lift Log

A personal workout planner and tracker built with Next.js 16, Postgres (Neon) and Vercel's Geist design language.

- **Exercises**: a library of exercises with an optional target rest time.
- **Workout plans**: a Monday–Sunday template; each day has exercises with sets × reps.
- **Schedules**: run a plan from any start date for 4 / 8 / 12 (or any number of) weeks. Month calendar included.
- **Today**: today's planned workout, with a week strip and swipe left/right (or arrows) to browse other days.
- **Workout mode**: log weight and actual reps per set (above or below target), always see what you did last session, and an automatic rest timer that starts after each set (vibrates when the exercise's rest target is reached; the screen stays awake). Sets can be edited/deleted, extra sets and exercises added.
- **Statistics**: volume per workout, weekly volume, per-exercise progression (top set + estimated 1RM), per-block summaries, workout history; everything can be filtered by training block.
- **Body weight**: log entries and see them next to your training blocks and volume.

## Design

Built for use mid-workout with tired hands, on a coarse grid:

- **8px unit, whole multiples only** (Tailwind's `--spacing` is set to 8px, so `h-6` = 48px, `h-8` = 64px).
- **Touch targets:** 48px minimum, 56px for workout controls, 64px for the one primary action per screen.
- **Four text sizes** (`text-meta`, `text-body`, `text-title`, `text-display`); all other sizes are disabled.
- **Workout focus mode:** one exercise per screen, rest timer in the top bar, "Log set" in the thumb zone,
  everything else in the menu behind the exercise counter.

## Progression

Every set is assumed to be taken to failure. Each exercise has a rep range (default 6–12) and a weight step
(the smallest change actually possible, default 2.5 kg), set on the Exercises screen. Plans only define the
number of sets (default 2).

Each set number progresses on its own track — set 2 is only compared with set 2 of the last session, because a
second set to failure naturally lands lower:

- **Reached the top of the range** → heavier. The Epley 1RM estimate from that set picks the weight (rounded to
  the step) that should land you mid-range; if even one step would drop you below the range, keep the weight.
- **Fell below the range** → about 5% lighter, rounded to the step (at least one step).
- **Otherwise** → same weight, one more rep.

During a workout the rep range is drawn above the controls: the reps you're about to log (blue), what this set
did last time (ring), and on either end the weight change the next session will suggest if you go past it.

Evidence: load and rep progression give similar results (Plotkin et al. 2022, PeerJ); taking sets close to
failure matters most for hypertrophy when volume is low (Robinson et al. 2024, Sports Med); hypertrophy is
similar across a wide load range when sets are hard (Schoenfeld et al. 2017, JSCR); 1RM estimates are most
accurate at ≤10 reps (Reynolds et al. 2006, JSCR), so they're only used to predict where a new weight lands.
The rules live in `src/lib/progression.ts` and are covered by `npm test`.

## Deploy to Vercel

1. Push this repository to GitHub and **import it in Vercel** (framework preset: Next.js, no settings to change).
2. In the Vercel project go to **Storage → Create Database → Neon (Postgres)** and connect it to the project.
   This sets `DATABASE_URL` for all environments.
3. Add two environment variables (Settings → Environment Variables):
   - **`APP_PASSWORD`**: the invite code needed to create an account.
   - **`BETTER_AUTH_SECRET`**: a long random value, e.g. the output of `openssl rand -base64 32`.
4. **Redeploy.** The build runs `scripts/migrate.ts` first, which creates/updates the tables automatically.
5. Open the app, choose **Create account**, and enter the invite code. The **first account** also takes over
   any data that existed before accounts were added.

## Accounts

Email + password via [Better Auth](https://www.better-auth.com) (MIT, self-hosted): users and sessions live in
your own database, no outside service. Every page and action only sees the signed-in user's data.

- **Invite only:** creating an account needs `APP_PASSWORD`. Share it with the people you want to invite.
- **Change password / sign out:** person icon on Today (or "Account" on desktop).
- **Forgot password:** there's no email, so the owner resets it:
  `DATABASE_URL=… npm run reset-password -- someone@example.com 'new-password'` (signs out their sessions).

## Install as an app

Lift Log is an installable PWA (standalone window, app icon, home-screen shortcuts for Today / Weight / Stats).

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app* (or accept the install banner).
- **Desktop (Chrome/Edge):** install icon in the address bar.

Bad gym signal is handled: if the connection drops, logged sets show *offline · will sync* and are sent
automatically when the network returns, keeping the time you actually logged them (so rest times stay correct).
The app still needs a connection to open pages it hasn't loaded yet.

## Local development

```bash
npm install
cp .env.example .env.local   # set APP_PASSWORD, leave DATABASE_URL and BETTER_AUTH_SECRET empty
npm run dev
```

Without `DATABASE_URL` the app uses an embedded Postgres ([PGlite](https://pglite.dev)) stored in `./.pglite`, so no database server is needed. In development a built-in secret is used when `BETTER_AUTH_SECRET` is empty.

### Database changes

The schema lives in `src/db/schema.ts`. After changing it run `npm run db:generate` to create a migration in `./drizzle`; it is applied on the next deploy (or with `npm run db:migrate` against `DATABASE_URL`).

## Notes

- Weights are in kg. Volume = weight × reps summed over sets. Estimated 1RM uses the Epley formula.
- "Today" is calculated in your browser's timezone.
