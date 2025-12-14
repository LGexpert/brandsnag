import { usernameCheckStatusSchema } from '@acme/shared'
import { z } from 'zod'

export const platformKeySchema = z.string().min(1)
export type PlatformKey = z.infer<typeof platformKeySchema>

export const handleSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.-]+$/)

export type Handle = z.infer<typeof handleSchema>

export const platformCheckResultSchema = z.object({
  platformId: z.number().int().positive().nullable(),
  platformKey: platformKeySchema,
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

export type PlatformDefinition = {
  key: PlatformKey
  name: string
  baseUrl: string
  profileUrlTemplate: string
  handleRegex?: string
  sortOrder: number
}
