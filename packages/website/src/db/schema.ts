import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import type { PlayerInventoryPersistedPayload } from "@survive-the-night/game-shared/util/persisted-inventory-payload";
import type { PlayerBankPersistedPayload } from "@survive-the-night/game-shared/util/persisted-bank-payload";
import type { MapExplorationPersistedPayload } from "@survive-the-night/game-shared/util/map-exploration-payload";
import type { PlayerQuestStatePayload } from "@survive-the-night/game-shared/quests/player-quest-state";
import type { ProfessionProgress } from "@survive-the-night/game-shared/util/professions";
import type { ItemState } from "@survive-the-night/game-shared/types/entity";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  displayName: text("display_name").default("Survivor"),
  isAdmin: boolean("is_admin")
    .$default(() => false)
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  /** Last time this account started a claimed game session (distributed lease claim). */
  lastGameLoginAt: timestamp("last_game_login_at", { withTimezone: true }),
  /** Opaque lease id for the single active game WebSocket session (see game-server player-session API). */
  activeGameSessionId: text("active_game_session_id"),
  /** Game server instance id that owns the lease (env GAME_SERVER_INSTANCE_ID or fallback). */
  activeGameServerId: text("active_game_server_id"),
  /** Server heartbeats while the owning socket is connected; used for stale-lease recovery. */
  activeGameHeartbeatAt: timestamp("active_game_heartbeat_at", { withTimezone: true }),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()),
});

// User game stats for tracking kills, etc.
export const userStats = pgTable("user_stats", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  zombieKills: integer("zombie_kills").notNull().default(0),
  experience: integer("experience").notNull().default(0),
  abilityAllocations: jsonb("ability_allocations")
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  skillAllocations: jsonb("skill_allocations")
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  characterAllocations: jsonb("character_allocations")
    .$type<Record<string, number>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  professionProgress: jsonb("profession_progress")
    .$type<ProfessionProgress>()
    .notNull()
    .default(
      sql`'{"scavenging":0,"scrapping":0,"crafting":0,"gunsmithing":0,"chemistry":0,"tailoring":0,"cooking":0,"engineering":0}'::jsonb`,
    ),
  /** Open world: last tile indices when the player disconnected (alive). */
  lastTileX: integer("last_tile_x"),
  lastTileY: integer("last_tile_y"),
  /** Open world: campsite-fire respawn bind (tile indices). */
  respawnTileX: integer("respawn_tile_x"),
  respawnTileY: integer("respawn_tile_y"),
  /** Quest journal progress (game server hydrates / persists). */
  questProgress: jsonb("quest_progress")
    .$type<PlayerQuestStatePayload>()
    .notNull()
    .default(sql`'{"active":{},"completed":[]}'::jsonb`),
  /** Last bag + armor equipment snapshot (game server disconnect). */
  savedInventory: jsonb("saved_inventory").$type<PlayerInventoryPersistedPayload | null>(),
  /** Personal bank (bag-only) snapshot from game server. */
  savedBank: jsonb("saved_bank").$type<PlayerBankPersistedPayload | null>(),
  /** Sparse chunked minimap exploration (game server). */
  mapExploration: jsonb("map_exploration").$type<MapExplorationPersistedPayload | null>(),
  /** Coins from auction sales waiting to be claimed in-game at an auction house. */
  auctionClaimableCoins: integer("auction_claimable_coins").notNull().default(0),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

/** Self-registered game servers (browser uses public_ws_url to connect). */
export const gameServer = pgTable("game_server", {
  id: integer("id").primaryKey(),
  publicWsUrl: text("public_ws_url").notNull(),
  displayName: text("display_name"),
  /** Geographic or hosting region label (e.g. us-east, eu) for the world picker. */
  region: text("region"),
  listenPort: integer("listen_port"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const auctionHouseListing = pgTable("auction_house_listing", {
  id: text("id").primaryKey(),
  sellerUserId: text("seller_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  itemState: jsonb("item_state").$type<ItemState | null>(),
  price: integer("price").notNull(),
  itemCategory: text("item_category").notNull(),
  status: text("status").notNull().default("active"),
  buyerUserId: text("buyer_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

// Relations
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  stats: one(userStats),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(user, {
    fields: [userStats.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Type exports
export type User = typeof user.$inferSelect;
export type CreateUserData = typeof user.$inferInsert;
export type UpdateUserData = Partial<Omit<CreateUserData, "id" | "createdAt">>;

export type Session = typeof session.$inferSelect;
export type CreateSessionData = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type CreateAccountData = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type CreateVerificationData = typeof verification.$inferInsert;

export type UserStats = typeof userStats.$inferSelect;
export type CreateUserStatsData = typeof userStats.$inferInsert;

export type GameServerRow = typeof gameServer.$inferSelect;
export type CreateGameServerRow = typeof gameServer.$inferInsert;

// Subscription types
export type SubscriptionPlan = "free" | "basic" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing";
