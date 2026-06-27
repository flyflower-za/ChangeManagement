'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ModulesPage() {
  const router = useRouter()
  const [modules, setModules] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    loadModules()
    fetch('/api/users').then(r => r.json()).then(setUsers)
    fetch('/api/me').then(r => r.json()).then(setCurrentUser)
  }, [])

  const loadModules = () => {
    fetch('/api/modules').then(r => r.json()).then(setModules)
  }

  const createModule = async (name: string, description: string, managerId: string) => {
    await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, managerId }),
    })
    loadModules()
  }

  const deleteModule = async (id: string) => {
    if (!confirm('确定要删除此模块吗？')) return
    // TODO: 添加删除 API
    alert('删除功能待实现')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模块管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            配置各部门模块及其负责人，负责人将自动成为该模块变更的审批人
          </p>
        </div>
      </div>

      {/* Module List - Table Style */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模块名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">负责人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist 模板</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {modules.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{m.description || '-'}</td>
                <td className="px-6 py-4">
                  {m.manager ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {m.manager.name}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">未指定</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{m.templates.length} 个</td>
                <td className="px-6 py-4 text-right">
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => router.push(`/modules/${m.id}/edit`)}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition mr-2"
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

      {/* Create Module Form - Compact */}
      {currentUser?.role === 'admin' && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-4">新建模块</h2>
          <div className="grid grid-cols-4 gap-4">
            <input
              placeholder="模块名称 *"
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              id="new-module-name"
            />
            <input
              placeholder="描述"
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              id="new-module-desc"
            />
            <select
              className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              id="new-module-manager"
            >
              <option value="">选择负责人</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button
              onClick={() => {
                const name = (document.getElementById('new-module-name') as HTMLInputElement)?.value
                const desc = (document.getElementById('new-module-desc') as HTMLInputElement)?.value
                const mgr = (document.getElementById('new-module-manager') as HTMLSelectElement)?.value
                if (name) {
                  createModule(name, desc, mgr)
                  ;(document.getElementById('new-module-name') as HTMLInputElement).value = ''
                  ;(document.getElementById('new-module-desc') as HTMLInputElement).value = ''
                  ;(document.getElementById('new-module-manager') as HTMLSelectElement).value = ''
                }
              }}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
            >
              创建模块
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
