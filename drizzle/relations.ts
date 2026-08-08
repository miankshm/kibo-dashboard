import { relations } from "drizzle-orm/relations";
import { admins, adminInvitations, eventMasters, events, stores, sales, auditLogs, bulkUploadHistories, aiAnalysisReports, salesRecordsNew } from "./schema";

export const adminsRelations = relations(admins, ({one, many}) => ({
	admin: one(admins, {
		fields: [admins.invitedBy],
		references: [admins.id],
		relationName: "admins_invitedBy_admins_id"
	}),
	admins: many(admins, {
		relationName: "admins_invitedBy_admins_id"
	}),
	adminInvitations: many(adminInvitations),
	sales_createdBy: many(sales, {
		relationName: "sales_createdBy_admins_id"
	}),
	sales_updatedBy: many(sales, {
		relationName: "sales_updatedBy_admins_id"
	}),
	auditLogs: many(auditLogs),
	bulkUploadHistories: many(bulkUploadHistories),
	aiAnalysisReports: many(aiAnalysisReports),
}));

export const adminInvitationsRelations = relations(adminInvitations, ({one}) => ({
	admin: one(admins, {
		fields: [adminInvitations.invitedBy],
		references: [admins.id]
	}),
}));

export const eventsRelations = relations(events, ({one}) => ({
	eventMaster: one(eventMasters, {
		fields: [events.eventMasterId],
		references: [eventMasters.id]
	}),
}));

export const eventMastersRelations = relations(eventMasters, ({many}) => ({
	events: many(events),
}));

export const salesRelations = relations(sales, ({one}) => ({
	store: one(stores, {
		fields: [sales.storeId],
		references: [stores.id]
	}),
	admin_createdBy: one(admins, {
		fields: [sales.createdBy],
		references: [admins.id],
		relationName: "sales_createdBy_admins_id"
	}),
	admin_updatedBy: one(admins, {
		fields: [sales.updatedBy],
		references: [admins.id],
		relationName: "sales_updatedBy_admins_id"
	}),
}));

export const storesRelations = relations(stores, ({many}) => ({
	sales: many(sales),
	aiAnalysisReports: many(aiAnalysisReports),
	salesRecordsNews: many(salesRecordsNew),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	admin: one(admins, {
		fields: [auditLogs.changedBy],
		references: [admins.id]
	}),
}));

export const bulkUploadHistoriesRelations = relations(bulkUploadHistories, ({one}) => ({
	admin: one(admins, {
		fields: [bulkUploadHistories.uploadedBy],
		references: [admins.id]
	}),
}));

export const aiAnalysisReportsRelations = relations(aiAnalysisReports, ({one}) => ({
	store: one(stores, {
		fields: [aiAnalysisReports.storeId],
		references: [stores.id]
	}),
	admin: one(admins, {
		fields: [aiAnalysisReports.createdBy],
		references: [admins.id]
	}),
}));

export const salesRecordsNewRelations = relations(salesRecordsNew, ({one}) => ({
	store: one(stores, {
		fields: [salesRecordsNew.storeId],
		references: [stores.id]
	}),
}));