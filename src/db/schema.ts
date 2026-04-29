import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    salt: text("salt").notNull(),
    data: jsonb("data").notNull().$type<AccountData>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    usernameIdx: uniqueIndex("accounts_username_idx").on(t.username),
  }),
);

export const friendships = pgTable(
  "friendships",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    friendId: integer("friend_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
  }),
);

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rankEntries = pgTable("rank_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventState = pgTable("event_state", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdBy: integer("created_by").references(() => accounts.id, { onDelete: "set null" }),
});

export type AccountData = {
  monnaie: number;
  classesOwned: string[];
  classSelected: string;
  records: { solo: number; duo: number; endless: number };
  achievements: string[];
  daily: { date: string; progress: number; claimed: boolean } | null;
  stats: Record<string, number>;
  avatar: { preset: number };
  totalEverEaten: number;
  lang: "pl" | "fr";
};

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Friendship = typeof friendships.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type RankEntry = typeof rankEntries.$inferSelect;
export type EventStateRow = typeof eventState.$inferSelect;
