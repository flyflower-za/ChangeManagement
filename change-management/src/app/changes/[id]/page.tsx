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
  const [loading, setLoading] = useState(true)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'execute' | 'approve' | 'history'>('overview')
  const [actionLoading, setActionLoading] = useState(false)

  // Modal states
  const [showReject, setShowReject] = useState<string | null>(null) // changeModuleId
  const [rejectReason, setRejectReason] = useState('')
  const [rejectItemIds, setRejectItemIds] = useState<string[]>([])
  const [executing, setExecuting] = useState<string | null>(null) // itemId
  const [evidenceNotes, setEvidenceNotes] = useState('')

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
  }, [id])

  const handleExecute = async (itemId: string) => {
    setActionLoading(true)
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'execute_item', itemId, evidenceNotes }),
    })
    setActionLoading(false)
    setExecuting(null)
    setEvidenceNotes('')
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
    await fetch(`/api/changes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject_module',
        changeModuleId: showReject,
        rejectReason,
        rejectItemIds,
      }),
    })
    setActionLoading(false)
    setShowReject(null)
    setRejectReason('')
    setRejectItemIds([])
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

  if (loading) return <div className="text-gray-400">加载中...</div>
  if (!change) return <div className="text-gray-400">变更不存在</div>

  const p = priorityConfig(change.priority)
  const s = statusConfig(change.status)
  const selectedModule = change.modules.find((m: ChangeModule) => m.id === selectedModuleId)

  // 计算整体进度
  const totalItems = change.modules.reduce((sum, m) => sum + m.items.length, 0)
  const doneItems = change.modules.reduce((sum, m) => sum + m.items.filter(i => i.status === 'DONE' || i.status === 'done').length, 0)
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
              <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{change.title}</h1>
            {change.description && <p className="text-gray-600 mt-2">{change.description}</p>}
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
                const mDone = m.items.filter(i => i.status === 'DONE' || i.status === 'done').length
                const mTotal = m.items.length
                const isReviewing = m.status === 'REVIEWING' || m.status === 'reviewing'

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModuleId(m.id)}
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
                  onClick={() => setActiveTab('execute')}
                  className={classNames(
                    'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === 'execute'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  Checklist
                </button>
                {(selectedModule.status === 'REVIEWING' || selectedModule.status === 'reviewing') && (
                  <button
                    onClick={() => setActiveTab('approve')}
                    className={classNames(
                      'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                      activeTab === 'approve'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    审批
                  </button>
                )}
              </div>

              {/* Tab 内容 */}
              <div className="p-6">
                {/* 概览 Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
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
                  </div>
                )}

                {/* Checklist Tab */}
                {activeTab === 'execute' && (
                  <div className="space-y-3">
                    {selectedModule.items.map((item, idx) => {
                      const itemStatus = statusConfig(item.status)
                      const isDone = item.status === 'DONE' || item.status === 'done'
                      const isRejected = item.status === 'REJECTED' || item.status === 'rejected'

                      return (
                        <div key={item.id} className={classNames(
                          'border rounded-lg p-4',
                          isRejected && 'border-red-200 bg-red-50/30'
                        )}>
                          <div className="flex items-start gap-3">
                            <div className={classNames(
                              'mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                              isDone ? 'bg-green-500 text-white' :
                              isRejected ? 'bg-red-500 text-white' :
                              'bg-gray-200 text-gray-500'
                            )}>
                              {isDone ? '✓' : isRejected ? '!' : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={classNames('font-medium', isDone && 'text-gray-500 line-through')}>
                                  {item.title}
                                </h4>
                                {item.isRequired && <span className="text-xs text-red-400">*必填</span>}
                                <span className="text-xs text-gray-400">证据: {evidenceTypeLabel(item.evidenceType)}</span>
                                {isRejected && <span className="text-xs text-red-500">需重做</span>}
                              </div>
                              {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                              {item.expectedResult && <p className="text-xs text-gray-400 mt-0.5">预期: {item.expectedResult}</p>}

                              {/* 证据 */}
                              {item.evidenceNotes && (
                                <div className="mt-2 bg-green-50 rounded-lg p-3 text-sm">
                                  <p className="text-gray-600">📝 {item.evidenceNotes}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    执行人: {item.executor?.name} · {formatDate(item.executedAt!)}
                                  </p>
                                </div>
                              )}

                              {/* 驳回理由 */}
                              {item.rejectReason && (
                                <div className="mt-2 bg-red-50 rounded-lg p-3 text-sm">
                                  <p className="text-red-600">❌ 驳回理由: {item.rejectReason}</p>
                                </div>
                              )}

                              {/* 执行人分配 */}
                              {!isDone && (
                                <div className="mt-3 flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">执行人:</span>
                                  <select
                                    value={item.executorId || ''}
                                    onChange={e => handleAssignExecutor(item.id, e.target.value)}
                                    className="px-2 py-1 rounded border border-gray-200 text-xs"
                                  >
                                    <option value="">未分配</option>
                                    {users.map(u => (
                                      <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex-shrink-0">
                              {!isDone && !isRejected && (
                                <button
                                  onClick={() => { setExecuting(item.id); setEvidenceNotes('') }}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition"
                                >
                                  标记完成
                                </button>
                              )}
                              {isRejected && (
                                <button
                                  onClick={() => { setExecuting(item.id); setEvidenceNotes('') }}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-400 transition"
                                >
                                  重新执行
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 审批 Tab */}
                {activeTab === 'approve' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist 执行记录</h3>
                      <div className="space-y-2">
                        {selectedModule.items.map((item, idx) => {
                          const isDone = item.status === 'DONE' || item.status === 'done'
                          return (
                            <div key={item.id} className={classNames(
                              'flex items-center gap-3 p-3 rounded-lg',
                              isDone ? 'bg-green-50' : 'bg-gray-50'
                            )}>
                              <span className={classNames(
                                'w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                                isDone ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-500'
                              )}>
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <span className={classNames('text-sm', isDone ? 'text-gray-600' : 'text-gray-400')}>
                                {item.title}
                              </span>
                              {item.evidenceNotes && (
                                <span className="text-xs text-gray-400 ml-auto">
                                  有证据
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">审批意见</h3>
                      <textarea
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                        rows={3}
                        placeholder="填写审批意见（可选）..."
                      />
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleApprove(selectedModule.id!)}
                          disabled={actionLoading}
                          className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition disabled:opacity-50"
                        >
                          ✅ 审批通过
                        </button>
                        <button
                          onClick={() => { setShowReject(selectedModule.id!); setRejectItemIds([]); setRejectReason('') }}
                          className="px-6 py-2.5 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
                        >
                          ❌ 驳回
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 执行模态框 */}
      {executing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setExecuting(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">执行检查项</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">执行说明 / 证据备注</label>
            <textarea
              value={evidenceNotes}
              onChange={e => setEvidenceNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="填写执行过程和结果说明..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleExecute(executing!)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition disabled:opacity-50"
              >
                {actionLoading ? '提交中...' : '确认完成'}
              </button>
              <button onClick={() => setExecuting(null)} className="px-6 py-2.5 border rounded-lg font-medium hover:bg-gray-50">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 驳回模态框 */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReject(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">驳回检查项</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">驳回理由</label>
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
