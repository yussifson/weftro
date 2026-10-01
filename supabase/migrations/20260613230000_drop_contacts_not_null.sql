-- Remove NOT NULL constraints from deprecated columns
ALTER TABLE "public"."univ_contacts" ALTER COLUMN "first_name" DROP NOT NULL;
ALTER TABLE "public"."univ_contacts" ALTER COLUMN "last_name" DROP NOT NULL;
