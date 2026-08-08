CREATE TABLE "join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"approved_by_admin_id" uuid,
	"invite_token" text,
	"invite_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sales_records_new" DROP CONSTRAINT "sales_records_new_sale_date_key";--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "receive_update_emails" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "sales_records_new" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_approved_by_admin_id_admins_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_records_new" ADD CONSTRAINT "sales_records_new_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sales_records_new_store_date" ON "sales_records_new" USING btree ("store_id","sale_date");--> statement-breakpoint
ALTER TABLE "sales_records_new" ADD CONSTRAINT "sales_records_new_store_id_sale_date_key" UNIQUE("store_id","sale_date");