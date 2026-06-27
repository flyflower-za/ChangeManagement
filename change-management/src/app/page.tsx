'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames } from '@/lib/utils'

type Change = {
  id: string
  title: string
  status: string
  priority: string
  createdAt: string
  initiator: { name: string }
  modules: any[]
  progress: { total: number; done: number }
  moduleProgress: { id: string; name: string; status: string; total: number; done: number }[]
}

export default function DashboardPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [myTasks, setMyTasks] = useState<{ checklist: number; approval: number }>({ checklist: 0, approval: 0 })

  useEffect(() => {
    fetch('/api/changes').then(r => r.json()).then(d => {
      setChanges(d)
      setLoading(false)
    })

    // 获取我的待办数量
    Promise.all([
      fetch('/api/my-tasks/checklist').then(r => r.json()),
      fetch('/api/my-tasks/approvals').then(r => r.json()),
    ]).then(([checklistTasks, approvalTasks]) => {
      setMyTasks({
        checklist: checklistTasks.filter((t: any) => t.status === 'PENDING' || t.status === 'REJECTED').length,
        approval: approvalTasks.filter((t: any) => t.modules && t.modules.some((m: any) => m.status === 'REVIEWING')).length,
      })
    })
  }, [])

  if (loading) return <div className="text-gray-400">加载中...</div>

  const stats = {
    total: changes.length,
    executing: changes.filter(c => c.status === 'EXECUTING' || c.status === 'executing').length,
    reviewing: changes.filter(c => c.status === 'APPROVING' || c.status === 'reviewing').length,
    completed: changes.filter(c => c.status === 'COMPLETED' || c.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Link href="/changes/new" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          + 创建变更
        </Link>
      </div>

      {/* My Tasks Quick View */}
      <Link href="/my-tasks" className="block bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white hover:from-blue-600 hover:to-blue-700 transition">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-1">📋 我的待办</h2>
            <p className="text-blue-100 text-sm">
              {myTasks.checklist > 0 && `${myTasks.checklist} 项待执行 · `}
              {myTasks.approval > 0 && `${myTasks.approval} 个待审批`}
              {myTasks.checklist === 0 && myTasks.approval === 0 && '暂无待办任务'}
            </p>
          </div>
          <div className="text-3xl">→</div>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '总变更', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: '执行中', value: stats.executing, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '审批中', value: stats.reviewing, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: '已完成', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={classNames('rounded-xl p-5', s.bg)}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={classNames('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent changes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近变更</h2>
          <Link href="/changes" className="text-sm text-blue-600 hover:underline">查看全部 →</Link>
        </div>
        <div className="space-y-3">
          {changes.slice(0, 5).map(c => {
            const p = priorityConfig(c.priority)
            const s = statusConfig(c.status)
            const pct = c.progress.total > 0 ? Math.round((c.progress.done / c.progress.total) * 100) : 0
            return (
              <Link key={c.id} href={`/changes/${c.id}`} className="block bg-white rounded-xl border p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                        <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                      </span>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{c.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">发起人: {c.initiator?.name} · {new Date(c.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-600">{pct}%</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {c.moduleProgress.map(mp => (
                        <span key={mp.id} className={classNames(
                          'text-xs px-1.5 py-0.5 rounded',
                          mp.status === 'approved' ? 'text-green-600' :
                          mp.status === 'reviewing' ? 'text-purple-600' :
                          mp.status === 'executing' ? 'text-amber-600' :
                          'text-gray-400'
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
          {changes.length === 0 && (
            <div className="text-center py-12 text-gray-400">暂无变更项目</div>
          )}
        </div>
      </div>
    </div>
  )
}
