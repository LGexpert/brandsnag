import type { HealthResponse } from '@acme/shared'
import { useQuery } from '@tanstack/react-query'


async function fetchHealth(): Promise<HealthResponse> {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
  const res = await fetch(`${apiUrl}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }
  return res.json() as Promise<HealthResponse>
}

export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
  })

  return (
    <section>
      <h1>Home</h1>
      <p>TanStack Router + React Query are wired in.</p>

      <h2>Backend health</h2>
      {health.isLoading ? <p>Loading…</p> : null}
      {health.isError ? <p>Failed: {health.error.message}</p> : null}
      {health.data ? <pre>{JSON.stringify(health.data, null, 2)}</pre> : null}
    </section>
  )
}
