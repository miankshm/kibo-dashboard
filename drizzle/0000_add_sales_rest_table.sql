CREATE TABLE "admin_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"invitation_token" text NOT NULL,
	"invited_by" uuid,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_invitations_invitation_token_unique" UNIQUE("invitation_token")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"invited_by" uuid,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ai_analysis_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid,
	"period_start" date,
	"period_end" date,
	"report_type" varchar(50),
	"summary" text,
	"insights" jsonb,
	"generated_by_model" varchar(50),
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bulk_upload_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" uuid,
	"file_name" text,
	"total_rows" integer,
	"success_rows" integer,
	"failed_rows" integer,
	"upload_status" varchar(50),
	"error_log" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "event_masters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_master_id" uuid,
	"event_date" date NOT NULL,
	"year" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "events_event_master_id_year_key" UNIQUE("event_master_id","year")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"sales_date" date NOT NULL,
	"dine_in_sales" numeric(12, 2) DEFAULT 0,
	"card_sales" numeric(12, 2) DEFAULT 0,
	"card_tip" numeric(12, 2) DEFAULT 0,
	"cash_sales" numeric(12, 2) DEFAULT 0,
	"uber_eats_sales" numeric(12, 2) DEFAULT 0,
	"doordash_sales" numeric(12, 2) DEFAULT 0,
	"cash_and_carry_sales" numeric(12, 2) DEFAULT 0,
	"actual_closing_cash" numeric(12, 2) DEFAULT 0,
	"expected_cash_amount" numeric(12, 2) DEFAULT 0,
	"cash_difference" numeric(12, 2) DEFAULT 0,
	"total_sales" numeric(12, 2) DEFAULT 0,
	"net_sales" numeric(12, 2) DEFAULT 0,
	"note" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sales_store_id_sales_date_key" UNIQUE("store_id","sales_date"),
	CONSTRAINT "sales_card_sales_check" CHECK ("sales"."card_sales" >= 0),
	CONSTRAINT "sales_card_tip_check" CHECK ("sales"."card_tip" >= 0),
	CONSTRAINT "sales_cash_sales_check" CHECK ("sales"."cash_sales" >= 0),
	CONSTRAINT "sales_uber_eats_sales_check" CHECK ("sales"."uber_eats_sales" >= 0),
	CONSTRAINT "sales_doordash_sales_check" CHECK ("sales"."doordash_sales" >= 0),
	CONSTRAINT "sales_cash_and_carry_sales_check" CHECK ("sales"."cash_and_carry_sales" >= 0),
	CONSTRAINT "sales_actual_closing_cash_check" CHECK ("sales"."actual_closing_cash" >= 0),
	CONSTRAINT "sales_expected_cash_amount_check" CHECK ("sales"."expected_cash_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales_rest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_date" date NOT NULL,
	"day_of_week" varchar(20),
	"gross_sale" numeric(12, 2) DEFAULT 0,
	"card_without_tips" numeric(12, 2) DEFAULT 0,
	"paid_out" numeric(12, 2) DEFAULT 0,
	"card_with_tips" numeric(12, 2) DEFAULT 0,
	"cash_sale" numeric(12, 2) DEFAULT 0,
	"ubereats_sale" numeric(12, 2) DEFAULT 0,
	"doordash_sale" numeric(12, 2) DEFAULT 0,
	"cash_and_carry" numeric(12, 2) DEFAULT 0,
	"total_sale" numeric(12, 2) DEFAULT 0,
	"cash_expenses" numeric(12, 2) DEFAULT 0,
	"cash_left" numeric(12, 2),
	"actual_cash" numeric(12, 2),
	"total_cash" numeric(12, 2),
	"balance" numeric(12, 2),
	"ubereats_fee" numeric(12, 2) DEFAULT 0,
	"doordash_fee" numeric(12, 2) DEFAULT 0,
	"total_commissions" numeric(12, 2) DEFAULT 0,
	"total_sale_after_commission" numeric(12, 2) DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sales_rest_sale_date_key" UNIQUE("sale_date")
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"address" text,
	"phone" varchar(30),
	"timezone" varchar(50) DEFAULT 'America/Toronto',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stores_key_unique" UNIQUE("key"),
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "weather_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_date" date,
	"temperature" numeric(5, 2),
	"weather_condition" varchar(100),
	"precipitation" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_admins_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_invited_by_admins_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis_reports" ADD CONSTRAINT "ai_analysis_reports_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analysis_reports" ADD CONSTRAINT "ai_analysis_reports_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_admins_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_upload_histories" ADD CONSTRAINT "bulk_upload_histories_uploaded_by_admins_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_master_id_event_masters_id_fk" FOREIGN KEY ("event_master_id") REFERENCES "public"."event_masters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_record" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "idx_events_master_date" ON "events" USING btree ("event_master_id","event_date");--> statement-breakpoint
CREATE INDEX "idx_sales_store_date" ON "sales" USING btree ("store_id","sales_date");--> statement-breakpoint
CREATE INDEX "idx_sales_date" ON "sales" USING btree ("sales_date");--> statement-breakpoint
CREATE INDEX "idx_sales_rest_sale_date" ON "sales_rest" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "idx_stores_key" ON "stores" USING btree ("key");