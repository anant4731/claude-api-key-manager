import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull().default(""),
    role: text("role").notNull().default("user"),
    passwordHash: text("password_hash").notNull(),
    createdAt: text("created_at").notNull(),
    createdBy: text("created_by"),
    lastLoginAt: text("last_login_at"),
  },
  (t) => [index("users_email").on(t.email)]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [index("sessions_user").on(t.userId)]
);

export const apiKeyAssignments = sqliteTable(
  "api_key_assignments",
  {
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: text("assigned_at").notNull(),
    assignedBy: text("assigned_by"),
  },
  (t) => [
    primaryKey({ columns: [t.apiKeyId, t.userId] }),
    index("assignments_user").on(t.userId),
    index("assignments_key").on(t.apiKeyId),
  ]
);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  encryptedAdminKey: text("encrypted_admin_key").notNull(),
  partialAdminKeyHint: text("partial_admin_key_hint").notNull().default(""),
  orgId: text("org_id").notNull(),
  orgName: text("org_name").notNull(),
  connectedAt: text("connected_at").notNull(),
  lastSyncedAt: text("last_synced_at"),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  accountId: text("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  anthropicKeyId: text("anthropic_key_id").unique(),
  name: text("name").notNull(),
  workspaceId: text("workspace_id"),
  status: text("status").notNull().default("active"),
  partialKeyHint: text("partial_key_hint").notNull().default(""),
  encryptedKey: text("encrypted_key"),
  proxyToken: text("proxy_token").notNull().unique(),
  purposeClarity: text("purpose_clarity").notNull().default("unknown"),
  purposeClarityReason: text("purpose_clarity_reason").notNull().default(""),
  purposeClarityCheckedFor: text("purpose_clarity_checked_for").notNull().default(""),
  monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(500),
  createdAt: text("created_at").notNull(),
  syncedAt: text("synced_at"),
});

export const requests = sqliteTable(
  "requests",
  {
    id: text("id").primaryKey(),
    apiKeyId: text("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    timestamp: text("timestamp").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    costCents: real("cost_cents").notNull().default(0),
    promptExcerpt: text("prompt_excerpt").notNull().default(""),
    classification: text("classification").notNull().default("pending"),
    classificationReason: text("classification_reason").notNull().default(""),
    latencyMs: integer("latency_ms").notNull().default(0),
    statusCode: integer("status_code").notNull().default(200),
  },
  (t) => [
    index("requests_key_ts").on(t.apiKeyId, t.timestamp),
    index("requests_class").on(t.classification),
  ]
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type RequestRow = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type ApiKeyAssignment = typeof apiKeyAssignments.$inferSelect;

export type PurposeClarity = "clear" | "unclear" | "unknown";
export type UserRole = "admin" | "user";
