import type { SignupInput } from '@acme/shared'
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
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().optional(),
})

export function SignupPage() {
  const { api, auth, queryClient } = useAppContext()
  const navigate = useNavigate()

  const form = useForm<SignupInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', displayName: '' },
  })

  const signup = useMutation({
    mutationFn: async (input: SignupInput) => {
      return await api.signup(input)
    },
    onSuccess: (res) => {
      auth.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      auth.setUser(res.user)
      queryClient.setQueryData(['me'], res.user)
      void navigate({ to: '/dashboard' })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await signup.mutateAsync(values)
  })

  return (
    <div className="mx-auto max-w-md pt-10">
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Sign up to save favorites and track history.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="signup-email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-displayName" className="text-sm font-medium">
                Display name (optional)
              </label>
              <Input id="signup-displayName" autoComplete="name" {...form.register('displayName')} />
            </div>

            {signup.isError ? (
              <p className="text-sm text-destructive">{signup.error.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={signup.isPending}>
              {signup.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-4 w-4" /> Creating
                </span>
              ) : (
                'Sign up'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="underline">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
