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

## Deploy to Vercel

1. Push this repository to GitHub and **import it in Vercel** (framework preset: Next.js, no settings to change).
2. In the Vercel project go to **Storage → Create Database → Neon (Postgres)** and connect it to the project.
   This sets `DATABASE_URL` for all environments.
3. Add an environment variable **`APP_PASSWORD`** (Settings → Environment Variables) — that's your login.
4. **Redeploy.** The build runs `scripts/migrate.ts` first, which creates/updates the tables automatically.

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
cp .env.example .env.local   # set APP_PASSWORD, leave DATABASE_URL empty
npm run dev
```

Without `DATABASE_URL` the app uses an embedded Postgres ([PGlite](https://pglite.dev)) stored in `./.pglite`, so no database server is needed. Without `APP_PASSWORD` the login is skipped in development (but always enforced in production).

### Database changes

The schema lives in `src/db/schema.ts`. After changing it run `npm run db:generate` to create a migration in `./drizzle`; it is applied on the next deploy (or with `npm run db:migrate` against `DATABASE_URL`).

## Notes

- Weights are in kg. Volume = weight × reps summed over sets. Estimated 1RM uses the Epley formula.
- "Today" is calculated in your browser's timezone.
