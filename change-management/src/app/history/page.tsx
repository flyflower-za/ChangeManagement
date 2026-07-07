'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames, formatDate } from '@/lib/utils'

type Change = {
  id: string
  serial?: number
  title: string
  description?: string
  status: string
  priority: string
  product?: { name: string } | null
  createdAt: string
  plannedEnd?: string
  completedAt?: string
  initiator: { name: string }
  progress: { total: number; done: number }
}

export default function HistoryPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/changes?status=all').then(r => r.json()).then(setChanges)
  }, [])

  const filtered = changes.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const priorityLabels: Record<string, string> = { critical: '紧急', high: '高', medium: '中', low: '低' }
    const statusLabels: Record<string, string> = { DRAFT: '草稿', PENDING: '待执行', EXECUTING: '执行中', APPROVING: '待审批', COMPLETED: '已完成', CANCELLED: '已取消' }
    return (
      (c.serial && String(c.serial).includes(q)) ||
      c.title.toLowerCase().includes(q) ||
      c.initiator?.name.toLowerCase().includes(q) ||
      (c.product?.name && c.product.name.toLowerCase().includes(q)) ||
      (priorityLabels[c.priority] || c.priority).includes(q) ||
      (statusLabels[c.status] || c.status).includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">变更历史</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有变更记录</p>
      </div>

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
          placeholder="搜索 - 编号、标题、产品、优先级、状态、发起人..."
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无变更记录</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500">
                <th className="pl-4 pr-2 py-2.5 text-left whitespace-nowrap">编号</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">优先级</th>
                <th className="px-3 py-2.5 text-left">变更标题</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">产品</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">状态</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">进度</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">发起人</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">创建时间</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">完成时间</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(c => {
                const p = priorityConfig(c.priority)
                const s = statusConfig(c.status)
                const pct = c.progress.total > 0 ? Math.round((c.progress.done / c.progress.total) * 100) : 0
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="pl-4 pr-2 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>#{c.serial || '-'}</Link>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>
                        <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                          <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/changes/${c.id}`} className="font-medium text-gray-900 truncate block">{c.title}</Link>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>{c.product?.name || '-'}</Link>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>
                        <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                      </Link>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{c.initiator?.name}</td>
                    <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="pr-4 pl-2 py-2 text-xs text-gray-400 whitespace-nowrap">{c.completedAt ? formatDate(c.completedAt) : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
