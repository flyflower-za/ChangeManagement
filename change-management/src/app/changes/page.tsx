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
  createdById?: string
  initiator: { name: string }
  modules: any[]
  progress?: { total: number; done: number }
  moduleProgress?: { id: string; name: string; status: string; total: number; done: number }[]
}

export default function ChangesPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/changes?status=${filter}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json())
    ]).then(([changesData, userData]) => {
      setChanges(changesData)
      setCurrentUser(userData)
      setLoading(false)
    })
  }, [filter])

  const handleDelete = async (e: React.MouseEvent, changeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确定要删除此变更项目吗？此操作不可恢复。')) return

    setActionLoading(changeId)
    try {
      const res = await fetch(`/api/changes/${changeId}`, { method: 'DELETE' })
      if (res.ok) {
        setChanges(changes.filter(c => c.id !== changeId))
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
      }
    } catch (err) {
      alert('删除失败')
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (e: React.MouseEvent, changeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('确定要归档此变更项目吗？归档后将无法继续执行。')) return

    setActionLoading(changeId)
    try {
      const res = await fetch(`/api/changes/${changeId}?action=archive`, { method: 'DELETE' })
      if (res.ok) {
        setChanges(changes.filter(c => c.id !== changeId))
      } else {
        const data = await res.json()
        alert(data.error || '归档失败')
      }
    } catch (err) {
      alert('归档失败')
    } finally {
      setActionLoading(null)
    }
  }

  const canModify = (change: Change) => {
    return currentUser?.role === 'admin' || change.createdById === currentUser?.id
  }

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'executing', label: '执行中' },
    { key: 'reviewing', label: '审批中' },
    { key: 'completed', label: '已完成' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">变更项目</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理和跟踪所有变更项目
          </p>
        </div>
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
            const modifyAllowed = canModify(c)
            return (
              <div key={c.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Main Content */}
                  <Link href={`/changes/${c.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                        <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                      </span>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                    </div>
                    <h3 className="font-medium text-gray-900">{c.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-2">发起人: {c.initiator?.name} · {new Date(c.createdAt).toLocaleString('zh-CN')}</p>

                    {/* Progress Bar - Left Aligned */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          进度 {c.progress?.done || 0}/{c.progress?.total || 0}
                        </span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">{pct}%</span>
                      </div>
                    </div>

                    {/* Module Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {c.moduleProgress?.map((mp: any) => (
                        <span key={mp.id} className={classNames(
                          'text-xs px-2 py-0.5 rounded-full',
                          mp.status === 'approved' ? 'text-green-600 bg-green-50' :
                          mp.status === 'reviewing' ? 'text-purple-600 bg-purple-50' :
                          mp.status === 'executing' ? 'text-amber-600 bg-amber-50' :
                          'text-gray-400 bg-gray-50'
                        )}>
                          {mp.name} {mp.done}/{mp.total}
                        </span>
                      ))}
                    </div>
                  </Link>

                  {/* Right: Action Buttons */}
                  {modifyAllowed && (
                    <div className="flex flex-col gap-2 flex-shrink-0 pt-1">
                      <button
                        onClick={(e) => handleArchive(e, c.id)}
                        disabled={actionLoading === c.id}
                        className="px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition whitespace-nowrap"
                        title="归档"
                      >
                        {actionLoading === c.id ? '处理中...' : '归档'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, c.id)}
                        disabled={actionLoading === c.id}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition whitespace-nowrap"
                        title="删除"
                      >
                        {actionLoading === c.id ? '处理中...' : '删除'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
