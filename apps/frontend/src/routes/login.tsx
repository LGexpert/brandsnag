import type { LoginInput } from '@acme/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { useAppContext } from '../lib/useAppContext'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginPage() {
  const { api, auth, queryClient } = useAppContext()
  const navigate = useNavigate()

  const form = useForm<LoginInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const login = useMutation({
    mutationFn: async (input: LoginInput) => {
      return await api.login(input)
    },
    onSuccess: (res) => {
      auth.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      auth.setUser(res.user)
      queryClient.setQueryData(['me'], res.user)
      void navigate({ to: '/dashboard' })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await login.mutateAsync(values)
  })

  return (
    <div className="mx-auto max-w-md pt-10">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Access your favorites, watchlist, and history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="login-email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            {login.isError ? (
              <p className="text-sm text-destructive">{login.error.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" /> Logging in
                </span>
              ) : (
                'Log in'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link to="/signup" className="underline">
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
