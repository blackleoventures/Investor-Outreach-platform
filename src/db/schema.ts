// Database schema for Black Leo Venture Deal Room
// Using Drizzle ORM with PostgreSQL
// NOTE: This project currently uses Firebase. Use this schema as a target for migration or reference.

import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
    index,
    jsonb,
    pgTable,
    timestamp,
    varchar,
    text,
    integer,
    pgEnum,
} from "drizzle-orm/pg-core";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
    "sessions",
    {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull(),
    },
    (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    userType: varchar("user_type", { length: 20 }).notNull().default('founder'), // 'founder' or 'investor'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Deal status enum
export const dealStatusEnum = pgEnum('deal_status', ['draft', 'active', 'archived']);

// Deals table - pitch decks uploaded by founders
export const deals = pgTable("deals", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    founderId: varchar("founder_id").notNull().references(() => users.id),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    description: text("description"),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    fileSize: integer("file_size"),
    status: dealStatusEnum("status").default('active'),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;

// AI Analysis table - stores AI-generated analysis for each deal
export const aiAnalyses = pgTable("ai_analyses", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id").notNull().references(() => deals.id),
    analyzedBy: varchar("analyzed_by").notNull().references(() => users.id), // investor who requested analysis

    // Summary and overall score
    summary: text("summary").notNull(),
    totalScore: integer("total_score").notNull(), // 0-100
    recommendation: varchar("recommendation", { length: 20 }).notNull(), // 'not_ready', 'promising', 'ready'

    // Individual criteria scores (0-10 each)
    problemSolutionScore: integer("problem_solution_score").notNull(),
    marketSizeScore: integer("market_size_score").notNull(),
    businessModelScore: integer("business_model_score").notNull(),
    tractionScore: integer("traction_score").notNull(),
    teamScore: integer("team_score").notNull(),
    competitiveAdvantageScore: integer("competitive_advantage_score").notNull(),
    goToMarketScore: integer("go_to_market_score").notNull(),
    financialsScore: integer("financials_score").notNull(),
    exitPotentialScore: integer("exit_potential_score").notNull(),
    alignmentScore: integer("alignment_score").notNull(),

    // Detailed analysis for each criterion
    problemSolutionAnalysis: text("problem_solution_analysis"),
    marketSizeAnalysis: text("market_size_analysis"),
    businessModelAnalysis: text("business_model_analysis"),
    tractionAnalysis: text("traction_analysis"),
    teamAnalysis: text("team_analysis"),
    competitiveAdvantageAnalysis: text("competitive_advantage_analysis"),
    goToMarketAnalysis: text("go_to_market_analysis"),
    financialsAnalysis: text("financials_analysis"),
    exitPotentialAnalysis: text("exit_potential_analysis"),
    alignmentAnalysis: text("alignment_analysis"),

    // Suggested questions for the founder
    suggestedQuestions: text("suggested_questions").array(),

    createdAt: timestamp("created_at").defaultNow(),
});

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = typeof aiAnalyses.$inferInsert;

// Deal views tracking - who viewed which deal
export const dealViews = pgTable("deal_views", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id").notNull().references(() => deals.id),
    viewerId: varchar("viewer_id").notNull().references(() => users.id),
    viewedAt: timestamp("viewed_at").defaultNow(),
});

export type DealView = typeof dealViews.$inferSelect;
export type InsertDealView = typeof dealViews.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    deals: many(deals),
    analyses: many(aiAnalyses),
    dealViews: many(dealViews),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
    founder: one(users, {
        fields: [deals.founderId],
        references: [users.id],
    }),
    analyses: many(aiAnalyses),
    views: many(dealViews),
}));

export const aiAnalysesRelations = relations(aiAnalyses, ({ one }) => ({
    deal: one(deals, {
        fields: [aiAnalyses.dealId],
        references: [deals.id],
    }),
    analyzer: one(users, {
        fields: [aiAnalyses.analyzedBy],
        references: [users.id],
    }),
}));

export const dealViewsRelations = relations(dealViews, ({ one }) => ({
    deal: one(deals, {
        fields: [dealViews.dealId],
        references: [deals.id],
    }),
    viewer: one(users, {
        fields: [dealViews.viewerId],
        references: [users.id],
    }),
}));
