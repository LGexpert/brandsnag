import type { PlatformDefinition } from './types'

export const DEFAULT_PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    baseUrl: 'https://www.facebook.com',
    profileUrlTemplate: 'https://www.facebook.com/{handle}',
    handleRegex: '^[A-Za-z0-9.]{5,50}$',
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
  {
    key: 'twitch',
    name: 'Twitch',
    baseUrl: 'https://www.twitch.tv',
    profileUrlTemplate: 'https://www.twitch.tv/{handle}',
    handleRegex: '^[A-Za-z0-9_]{4,25}$',
    sortOrder: 60,
  },
  {
    key: 'youtube',
    name: 'YouTube',
    baseUrl: 'https://www.youtube.com',
    profileUrlTemplate: 'https://www.youtube.com/@{handle}',
    handleRegex: '^[A-Za-z0-9._-]{3,30}$',
    sortOrder: 70,
  },
  {
    key: 'pinterest',
    name: 'Pinterest',
    baseUrl: 'https://www.pinterest.com',
    profileUrlTemplate: 'https://www.pinterest.com/{handle}/',
    handleRegex: '^[A-Za-z0-9_]{3,30}$',
    sortOrder: 80,
  },
]

export const DEFAULT_PLATFORM_KEYS = DEFAULT_PLATFORM_DEFINITIONS.map((p) => p.key)
