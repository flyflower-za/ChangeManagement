'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { classNames, formatDate, statusConfig } from '@/lib/utils'

type ChecklistTask = {
  id: string
  title: string
  description: string | null
  evidenceType: string
  isRequired: boolean
  status: string
  changeModule: {
    id: string
    module: { name: string }
    changeProject: {
      id: string
      title: string
      priority: string
      plannedStart: string | null
    }
  }
}

type ApprovalTask = {
  id: string
  title: string
  priority: string
  plannedStart: string | null
  modules: Array<{
    id: string
    moduleName: string
    status: string
    itemCount: number
    doneCount: number
  }>
}

export default function MyTasksPage() {
  const router = useRouter()
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>([])
  const [approvalTasks, setApprovalTasks] = useState<ApprovalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'checklist' | 'approval'>('checklist')

  useEffect(() => {
    // 获取 Checklist 待办任务
    fetch('/api/my-tasks/checklist')
      .then(r => r.json())
      .then(data => {
        setChecklistTasks(data)
      })

    // 获取审批任务
    fetch('/api/my-tasks/approvals')
      .then(r => r.json())
      .then(data => {
        setApprovalTasks(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const checklistPending = checklistTasks.filter(t => t.status === 'PENDING' || t.status === 'REJECTED').length
  const approvalPending = approvalTasks.filter(t => t.modules.some(m => m.status === 'REVIEWING')).length

  if (loading) {
    return <div className="text-gray-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的待办</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('checklist')}
          className={classNames(
            'px-4 py-2 border-b-2 transition-colors',
            activeTab === 'checklist'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          执行任务 {checklistPending > 0 && `(${checklistPending})`}
        </button>
        <button
          onClick={() => setActiveTab('approval')}
          className={classNames(
            'px-4 py-2 border-b-2 transition-colors',
            activeTab === 'approval'
              ? 'border-blue-600 text-blue-600 font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          待审批 {approvalPending > 0 && `(${approvalPending})`}
        </button>
      </div>

      {/* Checklist Tasks */}
      {activeTab === 'checklist' && (
        <div className="space-y-3">
          {checklistTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p>暂无待执行的Checklist项</p>
            </div>
          ) : (
            checklistTasks.map(task => {
              const isPending = task.status === 'PENDING' || task.status === 'REJECTED'
              const isRejected = task.status === 'REJECTED'
              return (
                <div
                  key={task.id}
                  onClick={() => router.push(`/changes/${task.changeModule.changeProject.id}`)}
                  className={classNames(
                    'bg-white rounded-xl border p-5 hover:shadow-md transition cursor-pointer',
                    isRejected && 'border-red-200 bg-red-50/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isRejected && (
                          <span className="text-red-500 text-xs">❌ 需重做</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {task.changeModule.module.name}
                        </span>
                        {isRequiredTag(task.isRequired)}
                      </div>
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>变更: {task.changeModule.changeProject.title}</span>
                        <span>窗口: {task.changeModule.changeProject.plannedStart ? formatDate(task.changeModule.changeProject.plannedStart) : '未设置'}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {isPending ? (
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition">
                          执行
                        </button>
                      ) : (
                        <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', statusConfig(task.status).color)}>
                          {statusConfig(task.status).label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Approval Tasks */}
      {activeTab === 'approval' && (
        <div className="space-y-3">
          {approvalTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">👁️</p>
              <p>暂无待审批的变更</p>
            </div>
          ) : (
            approvalTasks.map(task => {
              return (
                <div
                  key={task.id}
                  onClick={() => router.push(`/changes/${task.id}`)}
                  className="bg-white rounded-xl border p-5 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>优先级: {task.priority}</span>
                        <span>窗口: {task.plannedStart ? formatDate(task.plannedStart) : '未设置'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {task.modules.map(m => {
                          const pct = m.itemCount > 0 ? Math.round((m.doneCount / m.itemCount) * 100) : 0
                          const isReviewing = m.status === 'REVIEWING'
                          return (
                            <div
                              key={m.id}
                              className={classNames(
                                'px-2 py-1 rounded-lg text-xs',
                                isReviewing ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                              )}
                            >
                              {m.moduleName} {m.doneCount}/{m.itemCount} {isReviewing && '待审批'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="ml-4">
                      <button className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 transition">
                        审批
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function isRequiredTag(required: boolean) {
  if (!required) return null
  return <span className="text-xs text-red-400">*必填</span>
}
