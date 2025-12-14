import { z } from 'zod'

const idSchema = z.number().int().positive()
const isoDateTimeSchema = z.string().datetime()

export const platformStatusSchema = z.enum(['active', 'disabled'])
export type PlatformStatus = z.infer<typeof platformStatusSchema>

export const userRoleSchema = z.enum(['user', 'admin'])
export type UserRole = z.infer<typeof userRoleSchema>

export const sessionStatusSchema = z.enum(['active', 'revoked', 'expired'])
export type SessionStatus = z.infer<typeof sessionStatusSchema>

export const usernameCheckSourceSchema = z.enum(['manual', 'watchlist'])
export type UsernameCheckSource = z.infer<typeof usernameCheckSourceSchema>

export const usernameCheckStatusSchema = z.enum([
  'available',
  'taken',
  'unknown',
  'invalid',
  'error',
])
export type UsernameCheckStatus = z.infer<typeof usernameCheckStatusSchema>

export const watchlistItemStatusSchema = z.enum(['active', 'paused', 'archived'])
export type WatchlistItemStatus = z.infer<typeof watchlistItemStatusSchema>

export const suggestedNameStatusSchema = z.enum(['suggested', 'dismissed', 'claimed'])
export type SuggestedNameStatus = z.infer<typeof suggestedNameStatusSchema>

export const userSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: userRoleSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  token: z.string().min(1),
  status: sessionStatusSchema,
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.nullable(),
  lastSeenAt: isoDateTimeSchema.nullable(),
})
export type Session = z.infer<typeof sessionSchema>

export const platformSchema = z.object({
  id: idSchema,
  key: z.string().min(1),
  name: z.string().min(1),
  status: platformStatusSchema,
  baseUrl: z.string().url(),
  profileUrlTemplate: z.string().min(1),
  handleRegex: z.string().nullable(),
  iconUrl: z.string().url().nullable(),
  sortOrder: z.number().int(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Platform = z.infer<typeof platformSchema>

export const favoriteSchema = z.object({
  id: idSchema,
  userId: idSchema,
  platformId: idSchema,
  handle: z.string().min(1),
  tags: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type Favorite = z.infer<typeof favoriteSchema>

export const watchlistItemSchema = z.object({
  id: idSchema,
  userId: idSchema,
  platformId: idSchema,
  handle: z.string().min(1),
  status: watchlistItemStatusSchema,
  lastStatus: usernameCheckStatusSchema.nullable(),
  lastCheckedAt: isoDateTimeSchema.nullable(),
  tags: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
})
export type WatchlistItem = z.infer<typeof watchlistItemSchema>

export const suggestedNameSchema = z.object({
  id: idSchema,
  platformId: idSchema,
  handle: z.string().min(1),
  status: suggestedNameStatusSchema,
  source: z.string().nullable(),
  createdAt: isoDateTimeSchema,
})
export type SuggestedName = z.infer<typeof suggestedNameSchema>

export const usernameCheckSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  sessionId: idSchema.nullable(),
  platformId: idSchema,
  handle: z.string().min(1),
  source: usernameCheckSourceSchema,
  status: usernameCheckStatusSchema,
  profileUrl: z.string().url().nullable(),
  errorMessage: z.string().nullable(),
  responseMs: z.number().int().nonnegative().nullable(),
  checkedAt: isoDateTimeSchema,
})
export type UsernameCheck = z.infer<typeof usernameCheckSchema>

export const createFavoriteInputSchema = z.object({
  platformId: idSchema,
  handle: z.string().min(1),
})
export type CreateFavoriteInput = z.infer<typeof createFavoriteInputSchema>

export const createWatchlistItemInputSchema = z.object({
  platformId: idSchema,
  handle: z.string().min(1),
})
export type CreateWatchlistItemInput = z.infer<typeof createWatchlistItemInputSchema>

export const createUsernameCheckInputSchema = z.object({
  platformId: idSchema,
  handle: z.string().min(1),
  source: usernameCheckSourceSchema.optional(),
})
export type CreateUsernameCheckInput = z.infer<typeof createUsernameCheckInputSchema>
