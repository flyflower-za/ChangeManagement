'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames, formatDate } from '@/lib/utils'

export default function HistoryPage() {
  const [changes, setChanges] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/changes?status=completed').then(r => r.json()).then(setChanges)
  }, [])

  const filtered = changes.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">变更历史</h1>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索变更标题或描述..."
        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">暂无已完成的变更</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const p = priorityConfig(c.priority)
            return (
              <Link key={c.id} href={`/changes/${c.id}`} className="block bg-white rounded-xl border p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                      <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                    </span>
                    <span className="font-medium">{c.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="text-green-600">✅ 已完成</span>
                    <span>{c.initiator?.name}</span>
                    <span>{formatDate(c.completedAt || c.createdAt)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
