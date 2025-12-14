import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderApp } from '../../test/testApp'

describe('auth flows', () => {
  it('allows signup and lands on dashboard', async () => {
    const user = userEvent.setup()

    const api = {
      me: vi.fn(),
      logout: vi.fn(),
      login: vi.fn(),
      checkHandleSse: vi.fn(),
      checkBulkSse: vi.fn(),
      listHistory: vi.fn(),
      addFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      deleteFavorite: vi.fn(),
      addWatchlistItem: vi.fn(),
      updateWatchlistItem: vi.fn(),
      deleteWatchlistItem: vi.fn(),
      signup: vi.fn(async () => ({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 1, email: 'a@b.com', displayName: null, role: 'user' },
      })),
      getPlatforms: vi.fn(async () => ({
        platforms: [
          {
            id: 1,
            key: 'x',
            name: 'X',
            status: 'active',
            baseUrl: 'https://x.com',
            profileUrlTemplate: 'https://x.com/{handle}',
            handleRegex: null,
            iconUrl: null,
            sortOrder: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      })),
      listFavorites: vi.fn(async () => ({ favorites: [] })),
      listWatchlist: vi.fn(async () => ({ watchlist: [] })),
    } as any

    renderApp({ initialPath: '/signup', api })

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})
