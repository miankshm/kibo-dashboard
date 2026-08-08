ALTER TABLE "sales_records_new"
ADD COLUMN IF NOT EXISTS "store_id" uuid;

UPDATE "sales_records_new" srn
SET "store_id" = s."id"
FROM "stores" s
WHERE s."key" = 'st-clair'
  AND srn."store_id" IS NULL;

ALTER TABLE "sales_records_new"
ALTER COLUMN "store_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_records_new_store_id_fkey'
  ) THEN
    ALTER TABLE "sales_records_new"
    ADD CONSTRAINT "sales_records_new_store_id_fkey"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_records_new_sale_date_key'
  ) THEN
    ALTER TABLE "sales_records_new"
    DROP CONSTRAINT "sales_records_new_sale_date_key";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sales_records_new_store_id_sale_date_key'
  ) THEN
    ALTER TABLE "sales_records_new"
    ADD CONSTRAINT "sales_records_new_store_id_sale_date_key"
    UNIQUE ("store_id", "sale_date");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_sales_records_new_store_date"
ON "sales_records_new" USING btree ("store_id", "sale_date");
