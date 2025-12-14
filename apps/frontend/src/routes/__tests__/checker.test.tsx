import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderApp } from '../../test/testApp'

describe('checker', () => {
  it('streams results into the grid', async () => {
    const user = userEvent.setup()

    const api = {
      me: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      login: vi.fn(),
      getPlatforms: vi.fn(async () => ({ platforms: [] })),
      listFavorites: vi.fn(async () => ({ favorites: [] })),
      listWatchlist: vi.fn(async () => ({ watchlist: [] })),
      addFavorite: vi.fn(),
      updateFavorite: vi.fn(),
      deleteFavorite: vi.fn(),
      addWatchlistItem: vi.fn(),
      updateWatchlistItem: vi.fn(),
      deleteWatchlistItem: vi.fn(),
      listHistory: vi.fn(),
      checkBulkSse: vi.fn(),
      checkHandleSse: vi.fn(async ({ handle, onPartial }: any) => {
        const now = new Date().toISOString()

        onPartial({
          handle,
          result: {
            platformId: 1,
            platformKey: 'x',
            platformName: 'X',
            status: 'available',
            checkedAt: now,
            profileUrl: 'https://x.com/test',
            responseMs: 120,
            errorMessage: null,
          },
        })

        return {
          handle,
          requestedAt: now,
          results: [
            {
              platformId: 1,
              platformKey: 'x',
              platformName: 'X',
              status: 'available',
              checkedAt: now,
              profileUrl: 'https://x.com/test',
              responseMs: 120,
              errorMessage: null,
            },
          ],
        }
      }),
    } as any

    renderApp({ initialPath: '/', api })

    await user.type(screen.getByPlaceholderText('brandname'), 'test')
    await user.click(screen.getByRole('button', { name: /^check$/i }))

    expect(await screen.findByText(/results for/i)).toBeInTheDocument()
    expect(await screen.findByText(/available/i)).toBeInTheDocument()
  })
})
