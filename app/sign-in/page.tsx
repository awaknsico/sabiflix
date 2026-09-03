import { AuthForm } from '@/components/auth-form'
import { AuthShell } from '@/components/auth-shell'

export const metadata = {
  title: 'Sign in — SabiFlix',
}

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthForm mode="sign-in" />
    </AuthShell>
  )
}
