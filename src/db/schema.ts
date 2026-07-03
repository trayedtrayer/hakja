import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ──
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  trips: many(trips),
  participations: many(tripParticipants),
  expenses: many(expenses, { relationName: "paidBy" }),
  expenseParticipants: many(expenseParticipants),
  expenseLogs: many(expenseLog),
  profiles: many(participantProfiles),
  notifications: many(notifications),
}));

// ── Trips ──
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  currency: text("currency").notNull().default("RUB"),
  totalBudget: numeric("total_budget", { precision: 12, scale: 2 }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tripsRelations = relations(trips, ({ one, many }) => ({
  owner: one(users, {
    fields: [trips.ownerId],
    references: [users.id],
  }),
  countries: many(tripCountries),
  cities: many(tripCities),
  participants: many(tripParticipants),
  expenses: many(expenses),
  notifications: many(notifications),
}));

// ── TripCountries ──
export const tripCountries = pgTable("trip_countries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
});

export const tripCountriesRelations = relations(tripCountries, ({ one }) => ({
  trip: one(trips, {
    fields: [tripCountries.tripId],
    references: [trips.id],
  }),
}));

// ── TripCities ──
export const tripCities = pgTable("trip_cities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
});

export const tripCitiesRelations = relations(tripCities, ({ one }) => ({
  trip: one(trips, {
    fields: [tripCities.tripId],
    references: [trips.id],
  }),
}));

// ── TripParticipants ──
export const tripParticipants = pgTable("trip_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("participant"), // "owner" | "participant"
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const tripParticipantsRelations = relations(
  tripParticipants,
  ({ one }) => ({
    trip: one(trips, {
      fields: [tripParticipants.tripId],
      references: [trips.id],
    }),
    user: one(users, {
      fields: [tripParticipants.userId],
      references: [users.id],
    }),
  }),
);

// ── ParticipantProfiles (for saving profiles) ──
export const participantProfiles = pgTable("participant_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const participantProfilesRelations = relations(
  participantProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [participantProfiles.userId],
      references: [users.id],
    }),
    trip: one(trips, {
      fields: [participantProfiles.tripId],
      references: [trips.id],
    }),
  }),
);

// ── Expenses ──
export const expenses = pgTable("expenses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  paidByUserId: uuid("paid_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("RUB"),
  splitType: text("split_type").notNull().default("equal"), // "equal" | "custom"
  receiptUrl: text("receipt_url"),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  trip: one(trips, {
    fields: [expenses.tripId],
    references: [trips.id],
  }),
  paidBy: one(users, {
    fields: [expenses.paidByUserId],
    references: [users.id],
    relationName: "paidBy",
  }),
  createdBy: one(users, {
    fields: [expenses.createdByUserId],
    references: [users.id],
    relationName: "createdBy",
  }),
  participants: many(expenseParticipants),
  logs: many(expenseLog),
}));

// ── ExpenseParticipants ──
export const expenseParticipants = pgTable("expense_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amountOwed: numeric("amount_owed", { precision: 12, scale: 2 }).notNull(),
});

export const expenseParticipantsRelations = relations(
  expenseParticipants,
  ({ one }) => ({
    expense: one(expenses, {
      fields: [expenseParticipants.expenseId],
      references: [expenses.id],
    }),
    user: one(users, {
      fields: [expenseParticipants.userId],
      references: [users.id],
    }),
  }),
);

// ── ExpenseLog ──
export const expenseLog = pgTable("expense_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "created" | "updated" | "deleted"
  changedByUserId: uuid("changed_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseLogRelations = relations(expenseLog, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseLog.expenseId],
    references: [expenses.id],
  }),
  changedBy: one(users, {
    fields: [expenseLog.changedByUserId],
    references: [users.id],
  }),
}));

// ── Invitations ──
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Notifications ──
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  type: text("type").notNull().default("expense"), // "expense" | "participant"
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  trip: one(trips, {
    fields: [notifications.tripId],
    references: [trips.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
