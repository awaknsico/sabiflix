import { SignIn } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth-shell'

export const metadata = {
  title: 'Sign in — SabiFlix',
}

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  )
}
