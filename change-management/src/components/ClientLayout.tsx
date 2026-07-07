'use client'

import AppShell from '@/components/AppShell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // MVP: 无需认证，直接显示应用
  return <AppShell user={{ name: 'MVP 用户', email: 'mvp@example.com', role: 'admin' }}>{children}</AppShell>
}
