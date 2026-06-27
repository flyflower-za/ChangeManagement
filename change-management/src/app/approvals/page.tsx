'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { priorityConfig, statusConfig, classNames, formatDate } from '@/lib/utils'

export default function ApprovalsPage() {
  const [changes, setChanges] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showReject, setShowReject] = useState<{ changeId: string; moduleId: string; moduleName: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadChanges = () => {
    Promise.all([
      fetch('/api/changes?status=all').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([d, user]) => {
      setCurrentUser(user)
      // 只显示当前用户需要审批的变更（过滤审批人是自己的模块）
      const myChanges = d
        .map((c: any) => ({
          ...c,
          moduleProgress: c.moduleProgress?.filter((mp: any) =>
            mp.approverId === user.id &&
            (mp.status === 'REVIEWING' || mp.status === 'reviewing' ||
             c.status === 'APPROVING' || c.status === 'EXECUTING')
          ) || []
        }))
        .filter((c: any) => c.moduleProgress.length > 0)
      setChanges(myChanges)
      setLoading(false)
    })
  }

  useEffect(() => { loadChanges() }, [])

  const handleApprove = async (changeId: string, moduleId: string) => {
    setActionLoading(moduleId)
    await fetch(`/api/changes/${changeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_module', changeModuleId: moduleId }),
    })
    setActionLoading(null)
    loadChanges()
  }

  const handleReject = async () => {
    if (!showReject || !rejectReason.trim()) return
    setActionLoading(showReject.moduleId)
    await fetch(`/api/changes/${showReject.changeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject_module',
        changeModuleId: showReject.moduleId,
        rejectReason: rejectReason.trim(),
        rejectItemIds: [],
      }),
    })
    setActionLoading(null)
    setShowReject(null)
    setRejectReason('')
    loadChanges()
  }

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">审批中心</h1>
        <p className="text-sm text-gray-500 mt-1">审批各部门提交的变更模块</p>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无待审批变更</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changes.map(c => {
            const p = priorityConfig(c.priority)
            const s = statusConfig(c.status)
            const myModules = c.moduleProgress || []

            return (
              <div key={c.id} className="bg-white rounded-xl border overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <Link href={`/changes/${c.id}`} className="hover:text-blue-600 transition">
                      <div className="flex items-center gap-2">
                        <span className={classNames('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', p.color)}>
                          <span className={classNames('w-1.5 h-1.5 rounded-full', p.dot)} />{p.label}
                        </span>
                        <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', s.color)}>{s.label}</span>
                        <h3 className="font-medium text-gray-900">{c.title}</h3>
                      </div>
                    </Link>
                    <span className="text-xs text-gray-400">
                      {c.initiator?.name} · {formatDate(c.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Reviewing Modules */}
                {myModules.length > 0 ? (
                  <div className="divide-y">
                    {myModules.map((mp: any) => (
                      <div key={mp.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50">
                        <div className="flex items-center gap-4">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          <div>
                            <Link href={`/changes/${c.id}`} className="text-sm font-medium text-gray-700 hover:text-blue-600">
                              {mp.name}
                            </Link>
                            <span className="text-xs text-gray-400 ml-2">
                              完成 {mp.done}/{mp.total} 项检查
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(c.id, mp.id)}
                            disabled={actionLoading === mp.id}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 transition disabled:opacity-50"
                          >
                            {actionLoading === mp.id ? '处理中...' : '✅ 通过'}
                          </button>
                          <button
                            onClick={() => setShowReject({ changeId: c.id, moduleId: mp.id, moduleName: mp.name })}
                            className="px-4 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition"
                          >
                            ❌ 驳回
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-center text-sm text-gray-400">
                    该项目下有模块正在执行中，暂无待审批模块
                    <Link href={`/changes/${c.id}`} className="text-blue-500 ml-1 hover:underline">查看详情</Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowReject(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">驳回审批 - {showReject.moduleName}</h3>
            <p className="text-sm text-gray-500 mb-4">请填写驳回理由，该模块所有检查项将退回重新执行</p>
            <label className="block text-sm font-medium mb-1.5">驳回理由 *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none transition"
              placeholder="填写驳回原因..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowReject(null); setRejectReason('') }}
                className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === showReject.moduleId || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-500 transition disabled:opacity-50"
              >
                {actionLoading === showReject.moduleId ? '处理中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
