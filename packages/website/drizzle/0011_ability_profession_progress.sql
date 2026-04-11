ALTER TABLE "user_stats"
ADD COLUMN IF NOT EXISTS "ability_allocations" jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE "user_stats"
SET "ability_allocations" = COALESCE("skill_allocations", '{}'::jsonb)
WHERE "ability_allocations" = '{}'::jsonb;

ALTER TABLE "user_stats"
ADD COLUMN IF NOT EXISTS "profession_progress" jsonb NOT NULL DEFAULT
'{"scavenging":0,"scrapping":0,"crafting":0,"gunsmithing":0,"chemistry":0,"tailoring":0,"cooking":0,"engineering":0}'::jsonb;
