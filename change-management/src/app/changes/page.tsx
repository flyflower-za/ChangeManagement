'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames } from '@/lib/utils'

type Change = {
  id: string
  serial?: number
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
  const [search, setSearch] = useState('')
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

  // Client-side keyword search
  const filteredChanges = changes.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (c.serial && String(c.serial).includes(q)) ||
      c.title.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.initiator?.name.toLowerCase().includes(q)
    )
  })

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
    { key: 'APPROVING', label: '审批中' },
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

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 pl-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
          placeholder="搜索变更项目 - 编号、名称、描述、发起人..."
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">✕</button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b flex-1">
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
        {search && (
          <span className="text-xs text-gray-500 flex-shrink-0 ml-3">
            找到 {filteredChanges.length} 条结果
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-gray-400">加载中...</div>
      ) : filteredChanges.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无变更项目</p>
          <Link href="/changes/new" className="text-blue-600 hover:underline mt-2 inline-block">创建第一个变更</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChanges.map(c => {
            const p = priorityConfig(c.priority)
            const s = statusConfig(c.status)
            const pct = c.progress?.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0
            const modifyAllowed = canModify(c)
            return (
              <div key={c.id} className="bg-white rounded-lg border px-4 py-3 hover:shadow-sm transition group">
                <div className="flex items-center gap-3">
                  {/* Left: Main Content */}
                  <Link href={`/changes/${c.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Priority + Status + Title + Desc in one row */}
                      <span className={classNames('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border flex-shrink-0', p.color)}>
                        <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                      </span>
                      {c.serial && <span className="text-xs text-gray-400 font-mono flex-shrink-0">#{c.serial}</span>}
                      <span className="font-medium text-gray-900 truncate">{c.title}</span>
                      <span className={classNames('px-1.5 py-0.5 rounded-full text-xs flex-shrink-0', s.color)}>{s.label}</span>
                      {c.description && <span className="text-xs text-gray-400 truncate hidden sm:inline">{c.description}</span>}
                    </div>

                    {/* Second row: progress + modules + info */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {/* Compact progress bar */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>

                      {/* Module tags - compact */}
                      <div className="flex gap-1 overflow-hidden">
                        {c.moduleProgress?.map((mp: any) => (
                          <span key={mp.id} className={classNames(
                            'text-xs px-1.5 py-0 rounded-full flex-shrink-0',
                            mp.status === 'approved' || mp.status === 'APPROVED' ? 'text-green-600' :
                            (mp.status === 'REVIEWING' || mp.status === 'reviewing') ? 'text-purple-600' :
                            (mp.status === 'EXECUTING' || mp.status === 'executing') ? 'text-amber-600' :
                            'text-gray-400'
                          )}>
                            {mp.name} {mp.done}/{mp.total}
                          </span>
                        ))}
                      </div>

                      <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                        {c.initiator?.name} · {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </Link>

                  {/* Right: Action Buttons */}
                  {modifyAllowed && (
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleArchive(e, c.id)} disabled={actionLoading === c.id}
                        className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition whitespace-nowrap">
                        {actionLoading === c.id ? '...' : '归档'}
                      </button>
                      <button onClick={(e) => handleDelete(e, c.id)} disabled={actionLoading === c.id}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition whitespace-nowrap">
                        {actionLoading === c.id ? '...' : '删除'}
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
