# Lift Log

A personal workout planner and tracker built with Next.js 16, Postgres (Neon) and Vercel's Geist design language.

- **Exercises**: a library of exercises with an optional target rest time.
- **Workout plans**: a Monday–Sunday template; each day has exercises with sets × reps.
- **Schedules**: run a plan from any start date for 4 / 8 / 12 (or any number of) weeks. Month calendar included.
- **Today**: today's planned workout, with a week strip and swipe left/right (or arrows) to browse other days.
- **Workout mode**: log weight and actual reps per set (above or below target), always see what you did last session, and an automatic rest timer that starts after each set (vibrates when the exercise's rest target is reached; the screen stays awake). Sets can be edited/deleted, extra sets and exercises added.
- **Statistics**: volume per workout, weekly volume, per-exercise progression (top set + estimated 1RM), per-block summaries, workout history; everything can be filtered by training block.
- **Body weight**: log entries and see them next to your training blocks and volume.

## Deploy to Vercel

1. Push this repository to GitHub and **import it in Vercel** (framework preset: Next.js, no settings to change).
2. In the Vercel project go to **Storage → Create Database → Neon (Postgres)** and connect it to the project.
   This sets `DATABASE_URL` for all environments.
3. Add an environment variable **`APP_PASSWORD`** (Settings → Environment Variables) — that's your login.
4. **Redeploy.** The build runs `scripts/migrate.ts` first, which creates/updates the tables automatically.

Open the site on your phone and use *Add to Home Screen* for an app-like experience.

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
