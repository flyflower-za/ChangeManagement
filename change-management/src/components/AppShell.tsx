'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { classNames } from '@/lib/utils'

const navItems = [
  { href: '/', label: '仪表盘', icon: '📊' },
  { href: '/changes', label: '变更项目', icon: '📋' },
  { href: '/my-tasks', label: '我的待办', icon: '✅' },
  { href: '/history', label: '变更历史', icon: '📜' },
  { href: '/approvals', label: '审批中心', icon: '🔔' },
  { href: '/management', label: '管理中心', icon: '⚙️' },
  { href: '/users', label: '用户管理', icon: '👥' },
]

export default function AppShell({ children, user }: { children: React.ReactNode; user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={classNames(
        'flex flex-col border-r bg-white transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}>
        <div className="flex items-center gap-2 px-4 h-14 border-b">
          {!collapsed && <span className="font-bold text-lg">变更管理</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg"
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                'flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors',
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600'
                  : 'text-gray-700'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                  {user?.name?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  await fetch('/api/auth', { method: 'DELETE' })
                  router.push('/login')
                }}
                className="w-full text-xs text-gray-500 hover:text-red-500 text-left"
              >
                退出登录
              </button>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mx-auto">
              {user?.name?.[0] || '?'}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
