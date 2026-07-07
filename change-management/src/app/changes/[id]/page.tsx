'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { priorityConfig, statusConfig, formatDate, evidenceTypeLabel, classNames } from '@/lib/utils'

type ChangeModule = {
  id: string
  status: string
  approverId: string | null
  approver: { name: string } | null
  approvedAt: string | null
  rejectReason: string | null
  module: { name: string }
  items: Array<{
    id: string
    title: string
    description: string | null
    expectedResult: string | null
    evidenceType: string
    isRequired: boolean
    status: string
    executorId: string | null
    executor: { name: string } | null
    executedAt: string | null
    evidenceNotes: string | null
    rejectReason: string | null
    sortOrder: number
  }>
}

type ChangeDetail = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  product?: { name: string; assignments?: Array<{ moduleId: string; person: string; module: { id: string; name: string } }> } | null
  plannedStart: string | null
  plannedEnd: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  initiator: { name: string }
  modules: ChangeModule[]
}

export default function ChangeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [change, setChange] = useState<ChangeDetail | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist'>('overview')
  const [actionLoading, setActionLoading] = useState(false)
  const [batchExecutor, setBatchExecutor] = useState('')
  const [batchAssigning, setBatchAssigning] = useState(false)
  const [approvalFilter, setApprovalFilter] = useState<string>('all') // all | done | na | rejected | pending
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Modal states
  const [showReject, setShowReject] = useState<string | null>(null) // changeModuleId or 'single:itemId'
  const [rejectReason, setRejectReason] = useState('')
  const [rejectItemIds, setRejectItemIds] = useState<string[]>([])
  const [singleRejectItemId, setSingleRejectItemId] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null) // itemId
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const loadChange = () => {
    fetch(`/api/changes/${id}`).then(r => r.json()).then(d => {
      setChange(d)
      if (d.modules && d.modules.length > 0) {
        setSelectedModuleId(d.modules[0].id)
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadChange()
    fetch('/api/users').then(r => r.json()).then(setUsers)
    fetch('/api/me').then(r => r.json()).then(setCurrentUser)
  }, [id])

  const handleExecute = async (itemId: string) => {
    setActionLoading(true)
    // Upload files first
    for (const file of uploadFiles) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('itemId', itemId)
      await fetch('/api/upload', { method: 'POST', body: formData })
    }
    // Save execution evidence
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'execute_item', itemId, evidenceNotes }),
    })
    setActionLoading(false)
    setExecuting(null)
    setEvidenceNotes('')
    setUploadFiles([])
    loadChange()
  }

  const handleNotApplicable = async (itemId: string) => {
    setActionLoading(true)
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'not_applicable', itemId, evidenceNotes: '不涉及' }),
    })
    setActionLoading(false)
    loadChange()
  }

  const handleApprove = async (changeModuleId: string) => {
    setActionLoading(true)
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_module', changeModuleId }),
    })
    setActionLoading(false)
    loadChange()
  }

  const handleReject = async () => {
    if (!showReject) return
    setActionLoading(true)

    if (singleRejectItemId) {
      // Single item reject
      await fetch(`/api/changes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_item',
          itemId: singleRejectItemId,
          rejectReason: rejectReason.trim(),
        }),
      })
    } else {
      // Module-level reject
      await fetch(`/api/changes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_module',
          changeModuleId: showReject,
          rejectReason: rejectReason.trim(),
          rejectItemIds,
        }),
      })
    }

    setActionLoading(false)
    setShowReject(null)
    setRejectReason('')
    setRejectItemIds([])
    setSingleRejectItemId(null)
    loadChange()
  }

  const handleAssignExecutor = async (itemId: string, executorId: string) => {
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign_executor', itemId, executorId }),
    })
    loadChange()
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除此变更项目吗？此操作不可恢复。')) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/changes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/changes')
      } else {
        const data = await res.json()
        alert(data.error || '删除失败')
        setDeleteLoading(false)
      }
    } catch (err) {
      alert('删除失败')
      setDeleteLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('确定要归档此变更项目吗？归档后将无法继续执行。')) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/changes/${id}?action=archive`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/changes')
      } else {
        const data = await res.json()
        alert(data.error || '归档失败')
        setDeleteLoading(false)
      }
    } catch (err) {
      alert('归档失败')
      setDeleteLoading(false)
    }
  }

  if (loading) return <div className="text-gray-400">加载中...</div>
  if (!change) return <div className="text-gray-400">变更不存在</div>

  const p = priorityConfig(change.priority)
  const s = statusConfig(change.status)
  const selectedModule = change.modules.find((m: ChangeModule) => m.id === selectedModuleId)

  // 计算整体进度
  const totalItems = change.modules.reduce((sum, m) => sum + m.items.length, 0)
  const doneItems = change.modules.reduce((sum, m) => sum + m.items.filter(i => i.status === 'DONE' || i.status === 'done' || i.status === 'NOT_APPLICABLE' || i.status === 'not_applicable').length, 0)
  const overallProgress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <button onClick={() => router.push('/changes')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
        ← 返回列表
      </button>

      {/* 变更摘要卡片 */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
              </span>
              {change.product && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  📦 {change.product.name}
                </span>
              )}
              <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{change.title}</h1>
            {change.description && <p className="text-gray-600 mt-2">{change.description}</p>}
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {(change.status !== 'COMPLETED' || currentUser?.role === 'admin') && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={classNames(
                  'px-4 py-2 rounded-lg text-sm font-medium transition',
                  editMode
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {editMode ? '✓ 完成编辑' : '✏️ 编辑'}
              </button>
            )}
            {change.status === 'COMPLETED' && currentUser?.role !== 'admin' && (
              <span className="px-3 py-2 text-xs text-gray-400 bg-gray-50 rounded-lg">变更已完成，只读</span>
            )}
            <button
              onClick={handleArchive}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition disabled:opacity-50"
            >
              {deleteLoading ? '处理中...' : '归档'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
            >
              {deleteLoading ? '处理中...' : '删除'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-gray-500 mt-4">
          <span>👤 发起人: {change.initiator?.name}</span>
          <span>📅 创建: {formatDate(change.createdAt)}</span>
          {change.plannedStart && (
            <span>⏰ 窗口: {formatDate(change.plannedStart)} ~ {formatDate(change.plannedEnd)}</span>
          )}
        </div>

        {/* 整体进度条 */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">整体进度</span>
            <span className="text-sm text-gray-500">{doneItems}/{totalItems} 项 ({overallProgress}%)</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      {/* 主内容区域：左侧导航 + 右侧内容 */}
      <div className="flex gap-6">
        {/* 左侧模块导航 */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">模块</h3>
            <div className="space-y-1">
              {change.modules.map((m: ChangeModule) => {
                const mStatus = statusConfig(m.status)
                const mDone = m.items.filter(i => i.status === 'DONE' || i.status === 'done' || i.status === 'NOT_APPLICABLE' || i.status === 'not_applicable').length
                const mTotal = m.items.length
                const isReviewing = m.status === 'REVIEWING' || m.status === 'reviewing'

                return (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModuleId(m.id); setAiSummary(null) }}
                    className={classNames(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                      selectedModuleId === m.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{m.module.name}</span>
                      {mStatus && (
                        <span className={classNames('w-2 h-2 rounded-full', mStatus.dot?.replace('bg-', 'bg-blue-500'))} />
                      )}
                    </div>
                    <div className={classNames('text-xs mt-1', selectedModuleId === m.id ? 'text-blue-500' : 'text-gray-400')}>
                      {mDone}/{mTotal} {isReviewing && '· 待审批'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0">
          {selectedModule && (
            <div className="bg-white rounded-xl border">
              {/* Tab 导航 */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={classNames(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  概览
                </button>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={classNames(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'checklist'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  检查项
                </button>
              </div>

              {/* Tab 内容 */}
              <div className="p-6">
                {/* 概览 Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">模块信息</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-500">模块名称</span>
                          <span className="font-medium">{selectedModule.module.name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-500">状态</span>
                          <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig(selectedModule.status).color)}>
                            {statusConfig(selectedModule.status).label}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-500">审批人</span>
                          <span className="font-medium">{selectedModule.approver?.name || '未指定'}</span>
                        </div>
                        {selectedModule.approvedAt && (
                          <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-500">审批时间</span>
                            <span className="font-medium">{formatDate(selectedModule.approvedAt)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-2">
                          <span className="text-gray-500">Checklist 项数</span>
                          <span className="font-medium">{selectedModule.items.length} 项</span>
                        </div>
                      </div>
                    </div>

                    {/* Batch Executor Assignment */}
                    {editMode && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-blue-700 whitespace-nowrap">批量分配执行人：</span>
                          <select
                            className="px-3 py-1.5 rounded border border-blue-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={batchExecutor}
                            onChange={async (e) => {
                              const executorId = e.target.value
                              if (!executorId) return
                              const targetUser = users.find(u => u.id === executorId)
                              if (!confirm(`确定要将${selectedModule.module.name}的所有${selectedModule.items.length}个检查项分配给${targetUser?.name}吗？`)) {
                                setBatchExecutor('')
                                return
                              }
                              setBatchAssigning(true)
                              setBatchExecutor(executorId)
                              for (const item of selectedModule.items) {
                                const res = await fetch(`/api/changes/${id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'assign_executor', itemId: item.id, executorId }),
                                })
                                if (!res.ok) {
                                  const err = await res.json()
                                  alert(`分配失败: ${err.error || '未知错误'}`)
                                  break
                                }
                              }
                              setBatchExecutor('')
                              setBatchAssigning(false)
                              loadChange()
                            }}
                            disabled={batchAssigning}
                          >
                            <option value="">选择执行人...</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          <span className="text-xs text-blue-500">
                            {batchAssigning ? '分配中...' : '一键分配给当前部门所有检查项'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Checklist Items with Executor */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">检查项及负责人</h3>
                      <div className="space-y-1.5">
                        {selectedModule.items.map((item, idx) => {
                          const isDone = item.status === 'DONE' || item.status === 'done'
                          const isNA = item.status === 'NOT_APPLICABLE' || item.status === 'not_applicable'
                          const isRejected = item.status === 'REJECTED' || item.status === 'rejected'
                          // Get product-assigned person for this department
                          const prodPerson = change.product?.assignments?.find(
                            (a: any) => a.moduleId === selectedModule.moduleId
                          )?.person
                          return (
                            <div key={item.id} className={classNames(
                              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm',
                              isDone ? 'bg-green-50' :
                              isNA ? 'bg-gray-100' :
                              isRejected ? 'bg-red-50' : 'bg-gray-50'
                            )}>
                              <span className={classNames(
                                'w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                                isDone ? 'bg-green-500 text-white' :
                                isNA ? 'bg-gray-400 text-white' :
                                isRejected ? 'bg-red-500 text-white' :
                                'bg-gray-300 text-gray-500'
                              )}>
                                {isDone ? '✓' : isNA ? 'N' : isRejected ? '!' : idx + 1}
                              </span>
                              <span className={classNames(
                                'flex-1',
                                (isDone || isNA) && 'text-gray-500',
                                isRejected && 'text-red-600'
                              )}>
                                {item.title}
                              </span>
                              <span className={classNames(
                                'text-xs flex-shrink-0',
                                item.executor?.name ? 'text-blue-600' : (prodPerson ? 'text-green-600' : 'text-gray-400')
                              )}>
                                {item.executor?.name || prodPerson || '未分配'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Checklist Tab */}
                {activeTab === 'checklist' && (
                  <>
                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {(() => {
                      const items = selectedModule.items
                      const doneCount = items.filter((i: any) => i.status === 'DONE' || i.status === 'done').length
                      const naCount = items.filter((i: any) => i.status === 'NOT_APPLICABLE' || i.status === 'not_applicable').length
                      const rejectedCount = items.filter((i: any) => i.status === 'REJECTED' || i.status === 'rejected').length
                      const pendingCount = items.length - doneCount - naCount - rejectedCount
                      const filters = [
                        { key: 'all', label: '全部', count: items.length, active: approvalFilter === 'all' },
                        { key: 'done', label: '已完成', count: doneCount, active: approvalFilter === 'done' },
                        ...(naCount > 0 ? [{ key: 'na', label: '不涉及', count: naCount, active: approvalFilter === 'na' }] : []),
                        ...(rejectedCount > 0 ? [{ key: 'rejected', label: '已驳回', count: rejectedCount, active: approvalFilter === 'rejected' }] : []),
                        ...(pendingCount > 0 ? [{ key: 'pending', label: '待执行', count: pendingCount, active: approvalFilter === 'pending' }] : []),
                      ] as const
                      return filters.map(f => (
                        <button key={f.key} onClick={() => setApprovalFilter(f.key === approvalFilter ? 'all' : f.key)}
                          className={classNames('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition border',
                            f.active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
                          <span className="font-bold">{f.count}</span> <span>{f.label}</span>
                        </button>
                      ))
                    })()}
                    {(selectedModule.status === 'REVIEWING' || selectedModule.status === 'reviewing') && (
                      <span className="text-xs text-gray-400 ml-auto">审批人: {selectedModule.approver?.name || '未指定'}</span>
                    )}
                  </div>

                  {/* Approval Actions - Above Table */}
                  {(selectedModule.status === 'REVIEWING' || selectedModule.status === 'reviewing') && editMode && (
                    <div className="space-y-2 mb-3">
                      {aiSummary && (
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-purple-700">🤖 AI 审批摘要</span>
                            <button onClick={() => setAiSummary(null)} className="text-xs text-purple-400 hover:text-purple-600">✕</button>
                          </div>
                          <div className="text-sm text-purple-800 whitespace-pre-wrap">{aiSummary}</div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <button onClick={async () => {
                          setAiLoading(true); setAiSummary(null)
                          try {
                            const res = await fetch('/api/ai-summary', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ changeModuleId: selectedModule.id }),
                            })
                            const d = await res.json()
                            setAiSummary(d.error ? `❌ ${d.error}` : d.summary)
                          } catch { setAiSummary('❌ 请求失败') }
                          setAiLoading(false)
                        }}
                          disabled={aiLoading}
                          className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition disabled:opacity-50 whitespace-nowrap">
                          {aiLoading ? '分析中...' : '🤖 AI摘要'}
                        </button>
                        <textarea className="flex-1 px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={1} placeholder="审批意见（可选）..." />
                        <button onClick={() => handleApprove(selectedModule.id!)} disabled={actionLoading}
                          className="px-5 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 disabled:opacity-50">✅ 通过</button>
                        <button onClick={() => { setShowReject(selectedModule.id!); setRejectItemIds([]); setSingleRejectItemId(null); setRejectReason('') }}
                          className="px-5 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">❌ 驳回</button>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b text-xs text-gray-500">
                        <tr>
                          <th className="pl-3 pr-2 py-2 text-left w-8"></th>
                          <th className="px-2 py-2 text-left">检查项</th>
                          <th className="px-2 py-2 text-left hidden sm:table-cell">描述</th>
                          <th className="px-2 py-2 text-left w-24">证据</th>
                          <th className="px-2 py-2 text-right w-16">状态</th>
                          {editMode && <th className="pr-3 pl-2 py-2 text-right w-36">操作</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                    {selectedModule.items.filter((item: any) => {
                      if (approvalFilter === 'done') return item.status === 'DONE' || item.status === 'done'
                      if (approvalFilter === 'na') return item.status === 'NOT_APPLICABLE' || item.status === 'not_applicable'
                      if (approvalFilter === 'rejected') return item.status === 'REJECTED' || item.status === 'rejected'
                      if (approvalFilter === 'pending') return item.status !== 'DONE' && item.status !== 'done' && item.status !== 'NOT_APPLICABLE' && item.status !== 'not_applicable' && item.status !== 'REJECTED' && item.status !== 'rejected'
                      return true
                    }).map((item: any) => {
                      const isDone = item.status === 'DONE' || item.status === 'done'
                      const isRejected = item.status === 'REJECTED' || item.status === 'rejected'
                      const isNA = item.status === 'NOT_APPLICABLE' || item.status === 'not_applicable'
                      const isReviewing = selectedModule.status === 'REVIEWING' || selectedModule.status === 'reviewing'

                      return (
                        <tr key={item.id} className={classNames(
                          isRejected ? 'bg-red-50/50' : isDone ? 'bg-green-50/30' : isNA ? 'bg-gray-50' : '',
                          editMode && !isDone && !isNA && !isRejected && 'bg-amber-50/20'
                        )}>
                          <td className="pl-3 pr-2 py-2">
                            <span className={classNames(
                              'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                              isDone ? 'bg-green-500 text-white' :
                              isNA ? 'bg-gray-400 text-white' :
                              isRejected ? 'bg-red-500 text-white' :
                              'bg-gray-200 text-gray-500'
                            )}>
                              {isDone ? '✓' : isNA ? 'N' : isRejected ? '!' : idx + 1}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className={classNames('text-sm font-medium', (isDone || isNA) && 'text-gray-500 line-through')}>
                              {item.title}
                            </div>
                            {item.description && <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>}
                            {/* Evidence + Executor */}
                            {(item.evidenceNotes || item.attachments?.length > 0) && (
                              <div className="mt-1 space-y-0.5">
                                {item.evidenceNotes && <p className="text-xs text-gray-500">📝 {item.evidenceNotes}</p>}
                                {item.attachments?.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.attachments.map((att: any) => (
                                      <a key={att.id} href={att.filePath} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 rounded text-xs text-blue-600 hover:bg-blue-100">
                                        {att.fileType === 'image' ? '🖼️' : '📎'} {att.fileName}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                <span className="text-xs text-gray-400">👤 {item.executor?.name || '-'} · {item.executedAt ? formatDate(item.executedAt!) : '-'}</span>
                              </div>
                            )}
                            {item.rejectReason && <div className="mt-1 text-xs text-red-600">⚠️ {item.rejectReason}</div>}
                            {/* Executor assignment in edit */}
                            {editMode && !isDone && !isNA && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs">
                                <span className="text-gray-400">执行人:</span>
                                <select value={item.executorId || ''} onChange={e => handleAssignExecutor(item.id, e.target.value)}
                                  className="px-1.5 py-0.5 rounded border border-gray-200 text-xs">
                                  <option value="">未分配</option>
                                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 hidden sm:table-cell">
                            <span className="text-xs text-gray-400">{item.description || '-'}</span>
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-400">
                            {evidenceTypeLabel(item.evidenceType)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={classNames('text-xs', isDone ? 'text-green-600' : isNA ? 'text-gray-400' : isRejected ? 'text-red-500' : 'text-amber-500')}>
                              {isDone ? '已完成' : isNA ? '不涉及' : isRejected ? '需重做' : '待执行'}
                            </span>
                          </td>
                          {editMode && (
                            <td className="pr-3 pl-2 py-2 text-right">
                              {!isDone && !isRejected && !isNA && (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => { setExecuting(item.id); setEvidenceNotes('') }}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-500">完成</button>
                                  <button onClick={() => handleNotApplicable(item.id)}
                                    className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300">N/A</button>
                                </div>
                              )}
                              {isRejected && (
                                <button onClick={() => { setExecuting(item.id); setEvidenceNotes('') }}
                                  className="px-2 py-1 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-400">重做</button>
                              )}
                              {isReviewing && (isDone || isNA) && !isRejected && (
                                <button onClick={() => { setSingleRejectItemId(item.id); setShowReject(selectedModule.id!); setRejectReason('') }}
                                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded" title="单项驳回">↺</button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                      </tbody>
                    </table>
                  </div>


                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 执行模态框 */}
      {executing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setExecuting(null); setUploadFiles([]) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">执行检查项</h3>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">执行说明 / 证据备注</label>
            <textarea
              value={evidenceNotes}
              onChange={e => setEvidenceNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="填写执行过程和结果说明..."
            />

            {/* File Upload */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">上传证据文件</label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={e => {
                  if (e.target.files) {
                    setUploadFiles(prev => [...prev, ...Array.from(e.target.files!)])
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
              {/* File preview list */}
              {uploadFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-1.5">
                      <span>📎 {f.name}</span>
                      <span className="text-gray-300">({(f.size / 1024).toFixed(1)}KB)</span>
                      <button onClick={() => setUploadFiles(uploadFiles.filter((_, x) => x !== i))} className="ml-auto text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">支持图片、PDF、Word、Excel 文件</p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleExecute(executing!)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition disabled:opacity-50"
              >
                {actionLoading ? '提交中...' : '确认完成'}
              </button>
              <button onClick={() => { setExecuting(null); setUploadFiles([]) }} className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 驳回模态框 */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowReject(null); setSingleRejectItemId(null) }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">
              {singleRejectItemId ? '单项驳回' : '驳回检查项'}
            </h3>
            {singleRejectItemId ? (
              <p className="text-sm text-gray-500 mb-4">
                将驳回该项检查要求重新执行，其他项不受影响。
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">勾选需要驳回的具体检查项（不勾选则全部驳回）：</p>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {change.modules.find((m: ChangeModule) => m.id === showReject)?.items.map((item: any) => (
                    <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rejectItemIds.includes(item.id)}
                        onChange={e => {
                          if (e.target.checked) setRejectItemIds([...rejectItemIds, item.id])
                          else setRejectItemIds(rejectItemIds.filter(x => x !== item.id))
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">{item.title}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-1.5">驳回理由 *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none transition"
              placeholder="请填写驳回理由..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-500 transition disabled:opacity-50"
              >
                {actionLoading ? '提交中...' : '确认驳回'}
              </button>
              <button onClick={() => setShowReject(null)} className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
