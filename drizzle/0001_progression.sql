ALTER TABLE "exercises" ADD COLUMN "min_reps" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "max_reps" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "weight_step" real DEFAULT 2.5 NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_items" DROP COLUMN "reps";--> statement-breakpoint
ALTER TABLE "session_exercises" DROP COLUMN "target_reps";