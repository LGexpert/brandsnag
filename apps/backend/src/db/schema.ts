import { relations } from 'drizzle-orm'
import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const platformStatusEnum = pgEnum('platform_status', ['active', 'disabled'])
export const sessionStatusEnum = pgEnum('session_status', ['active', 'revoked', 'expired'])
export const usernameCheckSourceEnum = pgEnum('username_check_source', ['manual', 'watchlist'])
export const usernameCheckStatusEnum = pgEnum('username_check_status', [
  'available',
  'taken',
  'unknown',
  'invalid',
  'error',
])
export const watchlistItemStatusEnum = pgEnum('watchlist_item_status', [
  'active',
  'paused',
  'archived',
])
export const suggestedNameStatusEnum = pgEnum('suggested_name_status', [
  'suggested',
  'dismissed',
  'claimed',
])

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_unique').on(t.email),
  }),
)

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    status: sessionStatusEnum('status').default('active').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => ({
    tokenUnique: uniqueIndex('sessions_token_unique').on(t.token),
    userIdIdx: index('sessions_user_id_idx').on(t.userId),
  }),
)

export const platforms = pgTable(
  'platforms',
  {
    id: serial('id').primaryKey(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    status: platformStatusEnum('status').default('active').notNull(),
    baseUrl: text('base_url').notNull(),
    profileUrlTemplate: text('profile_url_template').notNull(),
    handleRegex: text('handle_regex'),
    iconUrl: text('icon_url'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    keyUnique: uniqueIndex('platforms_key_unique').on(t.key),
    statusIdx: index('platforms_status_idx').on(t.status),
    sortOrderIdx: index('platforms_sort_order_idx').on(t.sortOrder),
  }),
)

export const favorites = pgTable(
  'favorites',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platformId: integer('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'restrict' }),
    handle: text('handle').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdIdx: index('favorites_user_id_idx').on(t.userId),
    platformIdIdx: index('favorites_platform_id_idx').on(t.platformId),
    userPlatformHandleUnique: uniqueIndex('favorites_user_platform_handle_unique').on(
      t.userId,
      t.platformId,
      t.handle,
    ),
  }),
)

export const watchlistItems = pgTable(
  'watchlist_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platformId: integer('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'restrict' }),
    handle: text('handle').notNull(),
    status: watchlistItemStatusEnum('status').default('active').notNull(),
    lastStatus: usernameCheckStatusEnum('last_status'),
    lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    userIdIdx: index('watchlist_items_user_id_idx').on(t.userId),
    platformIdIdx: index('watchlist_items_platform_id_idx').on(t.platformId),
    userPlatformHandleUnique: uniqueIndex('watchlist_items_user_platform_handle_unique').on(
      t.userId,
      t.platformId,
      t.handle,
    ),
  }),
)

export const suggestedNames = pgTable(
  'suggested_names',
  {
    id: serial('id').primaryKey(),
    platformId: integer('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull(),
    status: suggestedNameStatusEnum('status').default('suggested').notNull(),
    source: text('source'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    platformIdIdx: index('suggested_names_platform_id_idx').on(t.platformId),
    platformHandleUnique: uniqueIndex('suggested_names_platform_handle_unique').on(
      t.platformId,
      t.handle,
    ),
  }),
)

export const usernameChecks = pgTable(
  'username_checks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    sessionId: integer('session_id').references(() => sessions.id, {
      onDelete: 'set null',
    }),
    platformId: integer('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'restrict' }),
    handle: text('handle').notNull(),
    source: usernameCheckSourceEnum('source').default('manual').notNull(),
    status: usernameCheckStatusEnum('status').notNull(),
    profileUrl: text('profile_url'),
    errorMessage: text('error_message'),
    responseMs: integer('response_ms'),
    checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index('username_checks_user_id_idx').on(t.userId),
    sessionIdIdx: index('username_checks_session_id_idx').on(t.sessionId),
    platformIdIdx: index('username_checks_platform_id_idx').on(t.platformId),
    platformHandleIdx: index('username_checks_platform_handle_idx').on(t.platformId, t.handle),
  }),
)

export const usersRelations = relations(users, ({ many }) => ({
  favorites: many(favorites),
  sessions: many(sessions),
  usernameChecks: many(usernameChecks),
  watchlistItems: many(watchlistItems),
}))

export const sessionsRelations = relations(sessions, ({ many, one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  usernameChecks: many(usernameChecks),
}))

export const platformsRelations = relations(platforms, ({ many }) => ({
  favorites: many(favorites),
  suggestedNames: many(suggestedNames),
  usernameChecks: many(usernameChecks),
  watchlistItems: many(watchlistItems),
}))

export const favoritesRelations = relations(favorites, ({ one }) => ({
  platform: one(platforms, {
    fields: [favorites.platformId],
    references: [platforms.id],
  }),
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}))

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  platform: one(platforms, {
    fields: [watchlistItems.platformId],
    references: [platforms.id],
  }),
  user: one(users, {
    fields: [watchlistItems.userId],
    references: [users.id],
  }),
}))

export const suggestedNamesRelations = relations(suggestedNames, ({ one }) => ({
  platform: one(platforms, {
    fields: [suggestedNames.platformId],
    references: [platforms.id],
  }),
}))

export const usernameChecksRelations = relations(usernameChecks, ({ one }) => ({
  platform: one(platforms, {
    fields: [usernameChecks.platformId],
    references: [platforms.id],
  }),
  session: one(sessions, {
    fields: [usernameChecks.sessionId],
    references: [sessions.id],
  }),
  user: one(users, {
    fields: [usernameChecks.userId],
    references: [users.id],
  }),
}))
