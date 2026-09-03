import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata = {
  title: 'Admin — SabiFlix',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
