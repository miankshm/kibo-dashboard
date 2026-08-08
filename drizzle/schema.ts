import { pgTable, foreignKey, unique, uuid, varchar, text, boolean, timestamp, date, integer, check, numeric, jsonb, index } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const admins = pgTable("admins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	isActive: boolean("is_active").default(true),
	invitedBy: uuid("invited_by"),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [table.id],
			name: "admins_invited_by_fkey"
		}),
	unique("admins_email_key").on(table.email),
]);

export const adminInvitations = pgTable("admin_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	invitationToken: text("invitation_token").notNull(),
	invitedBy: uuid("invited_by"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [admins.id],
			name: "admin_invitations_invited_by_fkey"
		}),
	unique("admin_invitations_invitation_token_key").on(table.invitationToken),
]);

export const eventMasters = pgTable("event_masters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	category: varchar({ length: 50 }),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("event_masters_name_key").on(table.name),
]);

export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventMasterId: uuid("event_master_id"),
	eventDate: date("event_date").notNull(),
	year: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventMasterId],
			foreignColumns: [eventMasters.id],
			name: "events_event_master_id_fkey"
		}),
	unique("events_event_master_id_year_key").on(table.year, table.eventMasterId),
]);

export const stores = pgTable("stores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	key: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 50 }),
	address: text(),
	phone: varchar({ length: 30 }),
	timezone: varchar({ length: 50 }).default('America/Toronto'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("stores_key_key").on(table.key),
	unique("stores_code_key").on(table.code),
]);

export const sales = pgTable("sales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id").notNull(),
	salesDate: date("sales_date").notNull(),
	dineInSales: numeric("dine_in_sales", { precision: 12, scale:  2 }).default('0'),
	cardSales: numeric("card_sales", { precision: 12, scale:  2 }).default('0'),
	cardTip: numeric("card_tip", { precision: 12, scale:  2 }).default('0'),
	cashSales: numeric("cash_sales", { precision: 12, scale:  2 }).default('0'),
	uberEatsSales: numeric("uber_eats_sales", { precision: 12, scale:  2 }).default('0'),
	doordashSales: numeric("doordash_sales", { precision: 12, scale:  2 }).default('0'),
	cashAndCarrySales: numeric("cash_and_carry_sales", { precision: 12, scale:  2 }).default('0'),
	actualClosingCash: numeric("actual_closing_cash", { precision: 12, scale:  2 }).default('0'),
	expectedCashAmount: numeric("expected_cash_amount", { precision: 12, scale:  2 }).default('0'),
	cashDifference: numeric("cash_difference", { precision: 12, scale:  2 }).default('0'),
	totalSales: numeric("total_sales", { precision: 12, scale:  2 }).default('0'),
	netSales: numeric("net_sales", { precision: 12, scale:  2 }).default('0'),
	note: text(),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "sales_store_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [admins.id],
			name: "sales_created_by_fkey"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [admins.id],
			name: "sales_updated_by_fkey"
		}),
	unique("sales_store_id_sales_date_key").on(table.storeId, table.salesDate),
	check("sales_card_sales_check", sql`card_sales >= (0)::numeric`),
	check("sales_card_tip_check", sql`card_tip >= (0)::numeric`),
	check("sales_cash_sales_check", sql`cash_sales >= (0)::numeric`),
	check("sales_uber_eats_sales_check", sql`uber_eats_sales >= (0)::numeric`),
	check("sales_doordash_sales_check", sql`doordash_sales >= (0)::numeric`),
	check("sales_cash_and_carry_sales_check", sql`cash_and_carry_sales >= (0)::numeric`),
	check("sales_actual_closing_cash_check", sql`actual_closing_cash >= (0)::numeric`),
	check("sales_expected_cash_amount_check", sql`expected_cash_amount >= (0)::numeric`),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tableName: varchar("table_name", { length: 100 }).notNull(),
	recordId: uuid("record_id").notNull(),
	fieldName: varchar("field_name", { length: 100 }).notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	changedBy: uuid("changed_by"),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.changedBy],
			foreignColumns: [admins.id],
			name: "audit_logs_changed_by_fkey"
		}),
]);

export const bulkUploadHistories = pgTable("bulk_upload_histories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	uploadedBy: uuid("uploaded_by"),
	fileName: text("file_name"),
	totalRows: integer("total_rows"),
	successRows: integer("success_rows"),
	failedRows: integer("failed_rows"),
	uploadStatus: varchar("upload_status", { length: 50 }),
	errorLog: jsonb("error_log"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [admins.id],
			name: "bulk_upload_histories_uploaded_by_fkey"
		}),
]);

export const aiAnalysisReports = pgTable("ai_analysis_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	storeId: uuid("store_id"),
	periodStart: date("period_start"),
	periodEnd: date("period_end"),
	reportType: varchar("report_type", { length: 50 }),
	summary: text(),
	insights: jsonb(),
	generatedByModel: varchar("generated_by_model", { length: 50 }),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "ai_analysis_reports_store_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [admins.id],
			name: "ai_analysis_reports_created_by_fkey"
		}),
]);

export const weatherSnapshots = pgTable("weather_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	snapshotDate: date("snapshot_date"),
	temperature: numeric({ precision: 5, scale:  2 }),
	weatherCondition: varchar("weather_condition", { length: 100 }),
	precipitation: numeric({ precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const salesRecordsNew = pgTable("sales_records_new", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	saleDate: date("sale_date").notNull(),
	dayOfWeek: varchar("day_of_week", { length: 20 }),
	grossSale: numeric("gross_sale", { precision: 18, scale:  6 }).default('0'),
	cardWithoutTips: numeric("card_without_tips", { precision: 18, scale:  6 }).default('0'),
	paidOut: numeric("paid_out", { precision: 18, scale:  6 }).default('0'),
	cardWithTips: numeric("card_with_tips", { precision: 18, scale:  6 }).default('0'),
	cashSaleInclGross: numeric("cash_sale_incl_gross", { precision: 18, scale:  6 }).default('0'),
	ubereats: numeric({ precision: 18, scale:  6 }).default('0'),
	doordash: numeric({ precision: 18, scale:  6 }).default('0'),
	cashAndCarry: numeric("cash_and_carry", { precision: 18, scale:  6 }).default('0'),
	totalSale: numeric("total_sale", { precision: 18, scale:  6 }).default('0'),
	cashExpenses: numeric("cash_expenses", { precision: 18, scale:  6 }).default('0'),
	cashLeft: numeric("cash_left", { precision: 18, scale:  6 }).default('0'),
	actualCash: numeric("actual_cash", { precision: 18, scale:  6 }).default('0'),
	totalCash: numeric("total_cash", { precision: 18, scale:  6 }).default('0'),
	balance: numeric({ precision: 18, scale:  6 }).default('0'),
	ubereatsCommissionRate: numeric("ubereats_commission_rate", { precision: 18, scale:  6 }).default('0'),
	ubereatsCommission: numeric("ubereats_commission", { precision: 18, scale:  6 }).default('0'),
	doordashCommissionRate: numeric("doordash_commission_rate", { precision: 18, scale:  6 }).default('0'),
	doordashCommission: numeric("doordash_commission", { precision: 18, scale:  6 }).default('0'),
	totalCommissions: numeric("total_commissions", { precision: 18, scale:  6 }).default('0'),
	totalSaleAfterCommission: numeric("total_sale_after_commission", { precision: 18, scale:  6 }).default('0'),
	weeklyTotalSales: numeric("weekly_total_sales", { precision: 18, scale:  6 }).default('0'),
	weeklyCashTotal: numeric("weekly_cash_total", { precision: 18, scale:  6 }).default('0'),
	weeklySalesAfterCommission: numeric("weekly_sales_after_commission", { precision: 18, scale:  6 }).default('0'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	storeId: uuid("store_id").notNull(),
}, (table) => [
	index("idx_sales_records_new_sale_date").using("btree", table.saleDate.asc().nullsLast().op("date_ops")),
	index("idx_sales_records_new_store_date").using("btree", table.storeId.asc().nullsLast().op("date_ops"), table.saleDate.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "sales_records_new_store_id_fkey"
		}),
	unique("sales_records_new_store_id_sale_date_key").on(table.storeId, table.saleDate),
]);
