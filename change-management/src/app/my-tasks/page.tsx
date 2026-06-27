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
    changeProject: { id: string; title: string; priority: string; plannedStart: string | null }
  }
}

type ApprovalTask = {
  id: string
  serial?: number
  title: string
  priority: string
  product?: { name: string } | null
  createdAt: string
  plannedEnd?: string
  initiator?: { name: string }
  modules: Array<{ id: string; moduleName: string; status: string; itemCount: number; doneCount: number }>
}

export default function MyTasksPage() {
  const router = useRouter()
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>([])
  const [approvalTasks, setApprovalTasks] = useState<ApprovalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'checklist' | 'approval'>('checklist')

  useEffect(() => {
    Promise.all([
      fetch('/api/my-tasks/checklist').then(r => r.json()),
      fetch('/api/my-tasks/approvals').then(r => r.json()),
    ]).then(([c, a]) => {
      setChecklistTasks(c)
      setApprovalTasks(a)
      setLoading(false)
    })
  }, [])

  const checklistPending = checklistTasks.filter(t => t.status === 'PENDING' || t.status === 'REJECTED').length
  const approvalPending = approvalTasks.filter(t => t.modules.some(m => m.status === 'REVIEWING')).length

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的待办</h1>
        <p className="text-sm text-gray-500 mt-1">管理您需要执行的检查项和审批的变更</p>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('checklist')}
          className={classNames('px-4 py-2 border-b-2 transition-colors text-sm font-medium',
            activeTab === 'checklist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
          执行任务 {checklistPending > 0 && `(${checklistPending})`}
        </button>
        <button onClick={() => setActiveTab('approval')}
          className={classNames('px-4 py-2 border-b-2 transition-colors text-sm font-medium',
            activeTab === 'approval' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
          待审批 {approvalPending > 0 && `(${approvalPending})`}
        </button>
      </div>

      {/* Checklist Tasks Table */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500">
                <th className="pl-4 pr-2 py-2.5 text-left w-8"></th>
                <th className="px-2 py-2.5 text-left">检查项</th>
                <th className="px-2 py-2.5 text-left">部门</th>
                <th className="px-3 py-2.5 text-left">变更项目</th>
                <th className="px-2 py-2.5 text-right w-20">状态</th>
                <th className="pr-4 pl-2 py-2.5 text-right w-20">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {checklistTasks.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">✅ 暂无待执行的检查项</td></tr>
              ) : (
                checklistTasks.map(task => {
                  const isRejected = task.status === 'REJECTED'
                  const isPending = task.status === 'PENDING' || isRejected
                  return (
                    <tr key={task.id} className={classNames('hover:bg-gray-50 cursor-pointer transition', isRejected && 'bg-red-50/50')}
                      onClick={() => router.push(`/changes/${task.changeModule.changeProject.id}`)}>
                      <td className="pl-4 pr-2 py-2">
                        <span className={classNames('w-5 h-5 rounded-full flex items-center justify-center text-xs',
                          isRejected ? 'bg-red-500 text-white' : isPending ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white')}>
                          {isRejected ? '!' : isPending ? '●' : '✓'}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={classNames('text-sm font-medium', !isPending && 'text-gray-500 line-through')}>{task.title}</span>
                        {task.description && <div className="text-xs text-gray-400 mt-0.5">{task.description}</div>}
                      </td>
                      <td className="px-2 py-2 text-sm text-gray-500">{task.changeModule.module.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        <span className="truncate block max-w-[300px]">{task.changeModule.changeProject.title}</span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={classNames('text-xs font-medium', isRejected ? 'text-red-500' : isPending ? 'text-amber-500' : 'text-green-600')}>
                          {isRejected ? '需重做' : isPending ? '待执行' : '已完成'}
                        </span>
                      </td>
                      <td className="pr-4 pl-2 py-2 text-right">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/changes/${task.changeModule.changeProject.id}`) }}
                          className={classNames('px-2 py-1 rounded text-xs font-medium transition',
                            isPending ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-100 text-gray-500')}>
                          {isPending ? '执行' : '查看'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Tasks Table */}
      {activeTab === 'approval' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500">
                <th className="pl-4 pr-2 py-2.5 text-left whitespace-nowrap">编号</th>
                <th className="px-3 py-2.5 text-left">变更标题</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">产品</th>
                <th className="px-2 py-2.5 text-left">待审批模块</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">发起人</th>
                <th className="px-2 py-2.5 text-left whitespace-nowrap">创建时间</th>
                <th className="pr-4 pl-2 py-2.5 text-right w-20">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {approvalTasks.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">👁️ 暂无待审批的变更</td></tr>
              ) : (
                approvalTasks.map(task => {
                  const reviewingModules = task.modules.filter(m => m.status === 'REVIEWING')
                  return (
                    <tr key={task.id} className="hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => router.push(`/changes/${task.id}`)}>
                      <td className="pl-4 pr-2 py-2 text-xs text-gray-400 font-mono whitespace-nowrap">#{task.serial || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium text-gray-900 truncate block max-w-[300px]">{task.title}</span>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{task.product?.name || '-'}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {reviewingModules.map(m => (
                            <span key={m.id} className="px-1.5 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">
                              {m.moduleName} {m.doneCount}/{m.itemCount}
                            </span>
                          ))}
                          {reviewingModules.length === 0 && task.modules.map(m => (
                            <span key={m.id} className="text-xs text-gray-400">{m.moduleName} {m.doneCount}/{m.itemCount}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{task.initiator?.name || '-'}</td>
                      <td className="px-2 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDate(task.createdAt)}</td>
                      <td className="pr-4 pl-2 py-2 text-right">
                        {reviewingModules.length > 0 ? (
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/changes/${task.id}`) }}
                            className="px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition">
                            审批
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/changes/${task.id}`) }}
                            className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            查看
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
