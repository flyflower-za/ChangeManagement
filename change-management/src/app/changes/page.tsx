'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames } from '@/lib/utils'

type Change = {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  createdAt: string
  initiator: { name: string }
  modules: any[]
  progress?: { total: number; done: number }
  moduleProgress?: { id: string; name: string; status: string; total: number; done: number }[]
}

export default function ChangesPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/changes?status=${filter}`).then(r => r.json()).then(d => {
      setChanges(d)
      setLoading(false)
    })
  }, [filter])

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'executing', label: '执行中' },
    { key: 'reviewing', label: '审批中' },
    { key: 'completed', label: '已完成' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">变更项目</h1>
        <Link href="/changes/new" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          + 创建变更
        </Link>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setLoading(true) }}
            className={classNames(
              'px-4 py-2 text-sm font-medium border-b-2 transition',
              filter === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : changes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无变更项目</p>
          <Link href="/changes/new" className="text-blue-600 hover:underline mt-2 inline-block">创建第一个变更</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map(c => {
            const p = priorityConfig(c.priority)
            const s = statusConfig(c.status)
            const pct = c.progress?.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0
            return (
              <Link key={c.id} href={`/changes/${c.id}`} className="block bg-white rounded-xl border p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                        <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                      </span>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                    </div>
                    <h3 className="font-medium text-gray-900">{c.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-2">发起人: {c.initiator?.name} · {new Date(c.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{pct}%</span>
                    </div>
                    <div className="flex gap-2 mt-1.5 justify-end">
                      {c.moduleProgress?.map((mp: any) => (
                        <span key={mp.id} className={classNames(
                          'text-xs px-1.5 py-0.5 rounded',
                          mp.status === 'approved' ? 'text-green-600 bg-green-50' :
                          mp.status === 'reviewing' ? 'text-purple-600 bg-purple-50' :
                          mp.status === 'executing' ? 'text-amber-600 bg-amber-50' :
                          'text-gray-400 bg-gray-50'
                        )}>
                          {mp.name} {mp.done}/{mp.total}
                        </span>
                      ))}
                    </div>
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
