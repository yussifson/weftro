ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "language" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "date_format" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "time_format" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "calendar_start" text;
ALTER TABLE "public"."companies" ADD COLUMN IF NOT EXISTS "timezone" text;
