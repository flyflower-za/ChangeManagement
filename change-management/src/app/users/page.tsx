'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadUsers()
    fetch('/api/modules').then(r => r.json()).then(setModules)
    fetch('/api/me').then(r => r.json()).then(setCurrentUser)
  }, [])

  const loadUsers = () => {
    fetch('/api/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false))
  }

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return '-'
    const m = modules.find((mod: any) => mod.id === deptId)
    return m?.name || deptId
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      approver: '审批人',
      executor: '执行人',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      approver: 'bg-blue-100 text-blue-700',
      executor: 'bg-gray-100 text-gray-700',
    }
    return colors[role] || 'bg-gray-100 text-gray-700'
  }

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理系统用户及其权限
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => router.push('/users/new')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            + 新建用户
          </button>
        )}
      </div>

      {/* User List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 text-sm font-medium text-gray-700">{user.username || '-'}</td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">{user.name[0]}</div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="px-3 py-4 text-sm text-gray-500">{getDeptName(user.departmentId)}</td>
                <td className="px-3 py-4">
                  <span className={classNames('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', getRoleColor(user.role))}>
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-right">
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => router.push(`/users/${user.id}/edit`)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                      编辑
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Legend */}
      <div className="bg-blue-50 rounded-lg p-4 text-sm">
        <h3 className="font-semibold text-blue-900 mb-2">角色说明</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="font-medium text-red-700">管理员</span>
            <p className="text-blue-700 text-xs mt-1">拥有所有权限，可以管理部门、用户和模版</p>
          </div>
          <div>
            <span className="font-medium text-blue-700">审批人</span>
            <p className="text-blue-700 text-xs mt-1">可以作为部门负责人审批变更</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">执行人</span>
            <p className="text-blue-700 text-xs mt-1">可以创建变更和执行检查项</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
