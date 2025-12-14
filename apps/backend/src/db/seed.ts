import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '../env'

import {
  favorites,
  platforms,
  sessions,
  suggestedNames,
  usernameChecks,
  users,
  watchlistItems,
} from './schema'

type PlatformSeed = {
  key: string
  name: string
  baseUrl: string
  profileUrlTemplate: string
  handleRegex?: string
  iconUrl?: string
  sortOrder: number
}

const DEFAULT_PLATFORMS: PlatformSeed[] = [
  {
    key: 'github',
    name: 'GitHub',
    baseUrl: 'https://github.com',
    profileUrlTemplate: 'https://github.com/{handle}',
    handleRegex: '^[a-zA-Z0-9-]{1,39}$',
    sortOrder: 10,
  },
  {
    key: 'x',
    name: 'X',
    baseUrl: 'https://x.com',
    profileUrlTemplate: 'https://x.com/{handle}',
    handleRegex: '^[A-Za-z0-9_]{1,15}$',
    sortOrder: 20,
  },
  {
    key: 'instagram',
    name: 'Instagram',
    baseUrl: 'https://www.instagram.com',
    profileUrlTemplate: 'https://www.instagram.com/{handle}/',
    handleRegex: '^[A-Za-z0-9_.]{1,30}$',
    sortOrder: 30,
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    baseUrl: 'https://www.tiktok.com',
    profileUrlTemplate: 'https://www.tiktok.com/@{handle}',
    handleRegex: '^[A-Za-z0-9_.]{2,24}$',
    sortOrder: 40,
  },
  {
    key: 'reddit',
    name: 'Reddit',
    baseUrl: 'https://www.reddit.com',
    profileUrlTemplate: 'https://www.reddit.com/user/{handle}/',
    handleRegex: '^[A-Za-z0-9_-]{3,20}$',
    sortOrder: 50,
  },
]

async function seed() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed the database')
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  })

  const db = drizzle(pool)

  await db
    .insert(platforms)
    .values(
      DEFAULT_PLATFORMS.map((p) => ({
        ...p,
        status: 'active' as const,
      })),
    )
    .onConflictDoNothing({
      target: platforms.key,
    })

  const platformRows = await db
    .select({ id: platforms.id, key: platforms.key })
    .from(platforms)
    .where(
      inArray(
        platforms.key,
        DEFAULT_PLATFORMS.map((p) => p.key),
      ),
    )

  const platformIdByKey = new Map(platformRows.map((p) => [p.key, p.id]))

  const [demoUser] = await db
    .insert(users)
    .values({
      email: 'demo@acme.com',
      displayName: 'Demo User',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: 'Demo User',
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id })

  const demoUserId = demoUser?.id
  if (!demoUserId) {
    throw new Error('failed to create demo user')
  }

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

  await db
    .insert(sessions)
    .values({
      userId: demoUserId,
      token: 'demo-session-token',
      status: 'active',
      expiresAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sessions.token,
      set: {
        userId: demoUserId,
        status: 'active',
        expiresAt,
        updatedAt: new Date(),
      },
    })

  const githubId = platformIdByKey.get('github')
  const xId = platformIdByKey.get('x')
  const instagramId = platformIdByKey.get('instagram')

  if (githubId) {
    await db
      .insert(favorites)
      .values({
        userId: demoUserId,
        platformId: githubId,
        handle: 'octocat',
      })
      .onConflictDoNothing({
        target: [favorites.userId, favorites.platformId, favorites.handle],
      })

    const existingCheck = await db
      .select({ id: usernameChecks.id })
      .from(usernameChecks)
      .where(
        and(
          eq(usernameChecks.userId, demoUserId),
          eq(usernameChecks.platformId, githubId),
          eq(usernameChecks.handle, 'octocat'),
        ),
      )
      .limit(1)

    if (existingCheck.length === 0) {
      await db.insert(usernameChecks).values({
        userId: demoUserId,
        platformId: githubId,
        handle: 'octocat',
        status: 'taken',
        source: 'manual',
        profileUrl: 'https://github.com/octocat',
      })
    }

    await db
      .insert(suggestedNames)
      .values([
        {
          platformId: githubId,
          handle: 'acme-dev',
          status: 'suggested',
          source: 'seed',
        },
        {
          platformId: githubId,
          handle: 'acme-tools',
          status: 'suggested',
          source: 'seed',
        },
      ])
      .onConflictDoNothing({
        target: [suggestedNames.platformId, suggestedNames.handle],
      })
  }

  if (xId) {
    await db
      .insert(watchlistItems)
      .values({
        userId: demoUserId,
        platformId: xId,
        handle: 'acme',
        status: 'active',
      })
      .onConflictDoNothing({
        target: [watchlistItems.userId, watchlistItems.platformId, watchlistItems.handle],
      })
  }

  if (instagramId) {
    await db
      .insert(suggestedNames)
      .values({
        platformId: instagramId,
        handle: 'acme.studio',
        status: 'suggested',
        source: 'seed',
      })
      .onConflictDoNothing({
        target: [suggestedNames.platformId, suggestedNames.handle],
      })
  }

  await pool.end()
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
