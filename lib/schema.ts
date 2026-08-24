import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  receiveReportEmails: boolean('receive_report_emails').default(true),
  isActive: boolean('is_active').default(true),
  invitedBy: uuid('invited_by').references((): AnyPgColumn => admins.id),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const adminInvitations = pgTable('admin_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  invitationToken: text('invitation_token').notNull().unique(),
  invitedBy: uuid('invited_by').references(() => admins.id),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  acceptedAt: timestamp('accepted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('user_id').notNull().references(() => admins.id),
  tokenHash: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  adminIndex: index('idx_password_reset_tokens_admin').on(table.adminId),
}))

export const joinRequests = pgTable('join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  requestedAt: timestamp('requested_at', { mode: 'date' }).defaultNow(),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  approvedByAdminId: uuid('approved_by_admin_id').references(() => admins.id),
  inviteToken: text('invite_token'),
  inviteSentAt: timestamp('invite_sent_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
})

export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).unique(),
  address: text('address'),
  phone: varchar('phone', { length: 30 }),
  timezone: varchar('timezone', { length: 50 }).default('America/Toronto'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  keyIndex: index('idx_stores_key').on(table.key),
}))

export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  salesDate: date('sales_date', { mode: 'string' }).notNull(),
  dineInSales: numeric('dine_in_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cardSales: numeric('card_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cardTip: numeric('card_tip', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashSales: numeric('cash_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  uberEatsSales: numeric('uber_eats_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  doordashSales: numeric('doordash_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashAndCarrySales: numeric('cash_and_carry_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  actualClosingCash: numeric('actual_closing_cash', { precision: 12, scale: 2, mode: 'number' }).default(0),
  expectedCashAmount: numeric('expected_cash_amount', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashDifference: numeric('cash_difference', { precision: 12, scale: 2, mode: 'number' }).default(0),
  totalSales: numeric('total_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  netSales: numeric('net_sales', { precision: 12, scale: 2, mode: 'number' }).default(0),
  note: text('note'),
  createdBy: uuid('created_by').references(() => admins.id),
  updatedBy: uuid('updated_by').references(() => admins.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  storeDateUnique: unique('sales_store_id_sales_date_key').on(table.storeId, table.salesDate),
  storeDateIndex: index('idx_sales_store_date').on(table.storeId, table.salesDate),
  salesDateIndex: index('idx_sales_date').on(table.salesDate),
  cardSalesCheck: check('sales_card_sales_check', sql`${table.cardSales} >= 0`),
  cardTipCheck: check('sales_card_tip_check', sql`${table.cardTip} >= 0`),
  cashSalesCheck: check('sales_cash_sales_check', sql`${table.cashSales} >= 0`),
  uberEatsSalesCheck: check('sales_uber_eats_sales_check', sql`${table.uberEatsSales} >= 0`),
  doordashSalesCheck: check('sales_doordash_sales_check', sql`${table.doordashSales} >= 0`),
  cashAndCarrySalesCheck: check('sales_cash_and_carry_sales_check', sql`${table.cashAndCarrySales} >= 0`),
  actualClosingCashCheck: check('sales_actual_closing_cash_check', sql`${table.actualClosingCash} >= 0`),
  expectedCashAmountCheck: check('sales_expected_cash_amount_check', sql`${table.expectedCashAmount} >= 0`),
}))

export const eventMasters = pgTable('event_masters', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventMasterId: uuid('event_master_id').references(() => eventMasters.id),
  eventDate: date('event_date', { mode: 'string' }).notNull(),
  year: integer('year').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  masterYearUnique: unique('events_event_master_id_year_key').on(table.eventMasterId, table.year),
  masterDateIndex: index('idx_events_master_date').on(table.eventMasterId, table.eventDate),
}))

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: uuid('record_id').notNull(),
  fieldName: varchar('field_name', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by').references(() => admins.id),
  reason: text('reason'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  recordIndex: index('idx_audit_logs_record').on(table.recordId),
}))

export const bulkUploadHistories = pgTable('bulk_upload_histories', {
  id: uuid('id').defaultRandom().primaryKey(),
  uploadedBy: uuid('uploaded_by').references(() => admins.id),
  fileName: text('file_name'),
  totalRows: integer('total_rows'),
  successRows: integer('success_rows'),
  failedRows: integer('failed_rows'),
  uploadStatus: varchar('upload_status', { length: 50 }),
  errorLog: jsonb('error_log'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})

export const aiAnalysisReports = pgTable('ai_analysis_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').references(() => stores.id),
  periodStart: date('period_start', { mode: 'string' }),
  periodEnd: date('period_end', { mode: 'string' }),
  reportType: varchar('report_type', { length: 50 }),
  summary: text('summary'),
  insights: jsonb('insights'),
  generatedByModel: varchar('generated_by_model', { length: 50 }),
  createdBy: uuid('created_by').references(() => admins.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})

export const weatherSnapshots = pgTable('weather_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  snapshotDate: date('snapshot_date', { mode: 'string' }),
  temperature: numeric('temperature', { precision: 5, scale: 2, mode: 'number' }),
  weatherCondition: varchar('weather_condition', { length: 100 }),
  precipitation: numeric('precipitation', { precision: 5, scale: 2, mode: 'number' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
})

export const salesRest = pgTable('sales_rest', {
  id: uuid('id').defaultRandom().primaryKey(),
  saleDate: date('sale_date', { mode: 'string' }).notNull(),
  dayOfWeek: varchar('day_of_week', { length: 20 }),
  grossSale: numeric('gross_sale', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cardWithoutTips: numeric('card_without_tips', { precision: 12, scale: 2, mode: 'number' }).default(0),
  paidOut: numeric('paid_out', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cardWithTips: numeric('card_with_tips', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashSale: numeric('cash_sale', { precision: 12, scale: 2, mode: 'number' }).default(0),
  ubereatsSale: numeric('ubereats_sale', { precision: 12, scale: 2, mode: 'number' }).default(0),
  doordashSale: numeric('doordash_sale', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashAndCarry: numeric('cash_and_carry', { precision: 12, scale: 2, mode: 'number' }).default(0),
  totalSale: numeric('total_sale', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashExpenses: numeric('cash_expenses', { precision: 12, scale: 2, mode: 'number' }).default(0),
  cashLeft: numeric('cash_left', { precision: 12, scale: 2, mode: 'number' }),
  actualCash: numeric('actual_cash', { precision: 12, scale: 2, mode: 'number' }),
  totalCash: numeric('total_cash', { precision: 12, scale: 2, mode: 'number' }),
  balance: numeric('balance', { precision: 12, scale: 2, mode: 'number' }),
  ubereatsFee: numeric('ubereats_fee', { precision: 12, scale: 2, mode: 'number' }).default(0),
  doordashFee: numeric('doordash_fee', { precision: 12, scale: 2, mode: 'number' }).default(0),
  totalCommissions: numeric('total_commissions', { precision: 12, scale: 2, mode: 'number' }).default(0),
  totalSaleAfterCommission: numeric('total_sale_after_commission', { precision: 12, scale: 2, mode: 'number' }).default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  saleDateUnique: unique('sales_rest_sale_date_key').on(table.saleDate),
  saleDateIndex: index('idx_sales_rest_sale_date').on(table.saleDate),
}))

export const salesRecordsNew = pgTable('sales_records_new', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  saleDate: date('sale_date', { mode: 'string' }).notNull(),
  dayOfWeek: varchar('day_of_week', { length: 20 }),
  grossSale: numeric('gross_sale', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cardWithoutTips: numeric('card_without_tips', { precision: 18, scale: 6, mode: 'number' }).default(0),
  paidOut: numeric('paid_out', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cardWithTips: numeric('card_with_tips', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cashSaleInclGross: numeric('cash_sale_incl_gross', { precision: 18, scale: 6, mode: 'number' }).default(0),
  ubereats: numeric('ubereats', { precision: 18, scale: 6, mode: 'number' }).default(0),
  doordash: numeric('doordash', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cashAndCarry: numeric('cash_and_carry', { precision: 18, scale: 6, mode: 'number' }).default(0),
  totalSale: numeric('total_sale', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cashExpenses: numeric('cash_expenses', { precision: 18, scale: 6, mode: 'number' }).default(0),
  cashLeft: numeric('cash_left', { precision: 18, scale: 6, mode: 'number' }).default(0),
  actualCash: numeric('actual_cash', { precision: 18, scale: 6, mode: 'number' }).default(0),
  totalCash: numeric('total_cash', { precision: 18, scale: 6, mode: 'number' }).default(0),
  balance: numeric('balance', { precision: 18, scale: 6, mode: 'number' }).default(0),
  ubereatsCommissionRate: numeric('ubereats_commission_rate', { precision: 18, scale: 6, mode: 'number' }).default(0),
  ubereatsCommission: numeric('ubereats_commission', { precision: 18, scale: 6, mode: 'number' }).default(0),
  doordashCommissionRate: numeric('doordash_commission_rate', { precision: 18, scale: 6, mode: 'number' }).default(0),
  doordashCommission: numeric('doordash_commission', { precision: 18, scale: 6, mode: 'number' }).default(0),
  totalCommissions: numeric('total_commissions', { precision: 18, scale: 6, mode: 'number' }).default(0),
  totalSaleAfterCommission: numeric('total_sale_after_commission', { precision: 18, scale: 6, mode: 'number' }).default(0),
  weeklyTotalSales: numeric('weekly_total_sales', { precision: 18, scale: 6, mode: 'number' }).default(0),
  weeklyCashTotal: numeric('weekly_cash_total', { precision: 18, scale: 6, mode: 'number' }).default(0),
  weeklySalesAfterCommission: numeric('weekly_sales_after_commission', { precision: 18, scale: 6, mode: 'number' }).default(0),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow(),
}, (table) => ({
  storeDateUnique: unique('sales_records_new_store_id_sale_date_key').on(table.storeId, table.saleDate),
  storeDateIndex: index('idx_sales_records_new_store_date').on(table.storeId, table.saleDate),
  saleDateIndex: index('idx_sales_records_new_sale_date').on(table.saleDate),
}))