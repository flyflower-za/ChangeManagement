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
  product?: { name: string } | null
  createdAt: string
  plannedEnd?: string
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
    const priorityLabels: Record<string, string> = { critical: '紧急', high: '高', medium: '中', low: '低' }
    const statusLabels: Record<string, string> = { DRAFT: '草稿', PENDING: '待执行', EXECUTING: '执行中', APPROVING: '待审批', COMPLETED: '已完成', CANCELLED: '已取消' }
    return (
      (c.serial && String(c.serial).includes(q)) ||
      c.title.toLowerCase().includes(q) ||
      c.initiator?.name.toLowerCase().includes(q) ||
      (c.product?.name && c.product.name.toLowerCase().includes(q)) ||
      (priorityLabels[c.priority] || c.priority).includes(q) ||
      c.priority.toLowerCase().includes(q) ||
      (statusLabels[c.status] || c.status).includes(q) ||
      c.status.toLowerCase().includes(q)
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
          placeholder="搜索 - 编号、优先级、标题、产品、状态、发起人..."
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
                <th className="px-2 py-2.5 text-left whitespace-nowrap">截止时间</th>
                <th className="pr-4 pl-2 py-2.5 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredChanges.map(c => {
                const p = priorityConfig(c.priority)
                const s = statusConfig(c.status)
                const pct = c.progress?.total ? Math.round((c.progress.done / c.progress.total) * 100) : 0
                const modifyAllowed = canModify(c)
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition group">
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
                    <td className="px-3 py-2 w-full">
                      <Link href={`/changes/${c.id}`} className="font-medium text-gray-900 truncate block" style={{ maxWidth: 'none' }}>{c.title}</Link>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>{c.product?.name || '-'}</Link>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link href={`/changes/${c.id}`}>
                        <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {c.initiator?.name}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">
                      {c.plannedEnd ? new Date(c.plannedEnd).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap w-0">
                      {modifyAllowed && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => handleArchive(e, c.id)} disabled={actionLoading === c.id}
                            className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition">
                            {actionLoading === c.id ? '...' : '归档'}
                          </button>
                          <button onClick={(e) => handleDelete(e, c.id)} disabled={actionLoading === c.id}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition">
                            {actionLoading === c.id ? '...' : '删除'}
                          </button>
                        </div>
                      )}
                    </td>
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
