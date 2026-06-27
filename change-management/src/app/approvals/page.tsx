'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames, formatDate } from '@/lib/utils'

export default function ApprovalsPage() {
  const [changes, setChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/changes?status=reviewing').then(r => r.json()).then(d => {
      setChanges(d)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">审批中心</h1>

      {changes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无待审批变更</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map(c => {
            const p = priorityConfig(c.priority)
            const reviewingModules = c.moduleProgress?.filter((mp: any) => mp.status === 'reviewing' || mp.status === 'executing') || []
            return (
              <Link key={c.id} href={`/changes/${c.id}`} className="block bg-white rounded-xl border p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                        <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900">{c.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">发起人: {c.initiator?.name} · {formatDate(c.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-2">
                      {reviewingModules.map((mp: any) => (
                        <span key={mp.id} className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600">
                          {mp.name} 待审批 ({mp.done}/{mp.total})
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
