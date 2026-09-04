import { SignUp } from '@clerk/nextjs'
import { AuthShell } from '@/components/auth-shell'

export const metadata = {
  title: 'Sign up — SabiFlix',
}

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </AuthShell>
  )
}
