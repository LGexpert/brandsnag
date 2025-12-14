import { z } from 'zod'

import {
  favoriteSchema,
  platformSchema,
  userRoleSchema,
  userSchema,
  usernameCheckSchema,
  usernameCheckStatusSchema,
  watchlistItemSchema,
} from './db'

const handleSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/)

export type Handle = z.infer<typeof handleSchema>

export const authUserSchema = userSchema.pick({
  id: true,
  email: true,
  displayName: true,
  role: true,
})
export type AuthUser = z.infer<typeof authUserSchema>

export const signupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
})
export type SignupInput = z.infer<typeof signupInputSchema>

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})
export type AuthTokens = z.infer<typeof authTokensSchema>

export const authResponseSchema = authTokensSchema.extend({
  user: authUserSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

export const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
})
export type RefreshResponse = z.infer<typeof refreshResponseSchema>

export const meResponseSchema = authUserSchema
export type MeResponse = z.infer<typeof meResponseSchema>

export const platformListResponseSchema = z.object({
  platforms: z.array(platformSchema),
})
export type PlatformListResponse = z.infer<typeof platformListResponseSchema>

export const platformCheckResultSchema = z.object({
  platformId: z.number().int().positive().nullable(),
  platformKey: z.string().min(1),
  platformName: z.string().min(1),
  status: usernameCheckStatusSchema,
  checkedAt: z.string().datetime(),
  profileUrl: z.string().url().nullable(),
  responseMs: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
  cached: z.boolean().optional(),
  suggestions: z.array(z.string()).optional(),
})
export type PlatformCheckResult = z.infer<typeof platformCheckResultSchema>

export const handleCheckResponseSchema = z.object({
  handle: handleSchema,
  requestedAt: z.string().datetime(),
  results: z.array(platformCheckResultSchema),
})
export type HandleCheckResponse = z.infer<typeof handleCheckResponseSchema>

export const bulkHandleCheckResponseSchema = z.object({
  handles: z.array(handleSchema),
  requestedAt: z.string().datetime(),
  results: z.array(handleCheckResponseSchema),
})
export type BulkHandleCheckResponse = z.infer<typeof bulkHandleCheckResponseSchema>

export const checkSseMetaEventSchema = z.object({
  handle: handleSchema.optional(),
  handles: z.array(handleSchema).optional(),
  requestedAt: z.string().datetime(),
})
export type CheckSseMetaEvent = z.infer<typeof checkSseMetaEventSchema>

export const checkSsePartialResultEventSchema = z.object({
  handle: handleSchema,
  result: platformCheckResultSchema,
})
export type CheckSsePartialResultEvent = z.infer<typeof checkSsePartialResultEventSchema>

export const checkSseErrorEventSchema = z.object({
  message: z.string().min(1),
})
export type CheckSseErrorEvent = z.infer<typeof checkSseErrorEventSchema>

export const favoriteWithPlatformSchema = favoriteSchema.extend({
  platform: platformSchema,
})
export type FavoriteWithPlatform = z.infer<typeof favoriteWithPlatformSchema>

export const favoritesListResponseSchema = z.object({
  favorites: z.array(favoriteWithPlatformSchema),
})
export type FavoritesListResponse = z.infer<typeof favoritesListResponseSchema>

export const favoriteCreateResponseSchema = z.object({
  favorite: favoriteWithPlatformSchema,
})
export type FavoriteCreateResponse = z.infer<typeof favoriteCreateResponseSchema>

export const favoriteUpdateResponseSchema = z.object({
  favorite: favoriteWithPlatformSchema,
})
export type FavoriteUpdateResponse = z.infer<typeof favoriteUpdateResponseSchema>

export const watchlistItemWithPlatformSchema = watchlistItemSchema.extend({
  platform: platformSchema,
})
export type WatchlistItemWithPlatform = z.infer<typeof watchlistItemWithPlatformSchema>

export const watchlistListResponseSchema = z.object({
  watchlist: z.array(watchlistItemWithPlatformSchema),
})
export type WatchlistListResponse = z.infer<typeof watchlistListResponseSchema>

export const watchlistCreateResponseSchema = z.object({
  watchlistItem: watchlistItemWithPlatformSchema,
})
export type WatchlistCreateResponse = z.infer<typeof watchlistCreateResponseSchema>

export const watchlistUpdateResponseSchema = z.object({
  watchlistItem: watchlistItemWithPlatformSchema,
})
export type WatchlistUpdateResponse = z.infer<typeof watchlistUpdateResponseSchema>

export const usernameCheckWithPlatformSchema = usernameCheckSchema.extend({
  platform: platformSchema,
})
export type UsernameCheckWithPlatform = z.infer<typeof usernameCheckWithPlatformSchema>

export const historyListResponseSchema = z.object({
  history: z.array(usernameCheckWithPlatformSchema),
  pagination: z.object({
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
})
export type HistoryListResponse = z.infer<typeof historyListResponseSchema>

export { userRoleSchema }
