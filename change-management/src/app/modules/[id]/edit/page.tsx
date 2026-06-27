'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ModuleEditPage() {
  const params = useParams()
  const router = useRouter()
  const [module, setModule] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      fetch(`/api/modules/${id}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ]).then(([moduleData, usersData]) => {
      if (moduleData.error) {
        setError(moduleData.error)
      } else {
        setModule(moduleData)
        setUsers(usersData)
      }
      setLoading(false)
    }).catch(err => {
      setError('加载失败')
      setLoading(false)
    })
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/modules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: module.id,
        name: module.name,
        description: module.description,
        managerId: module.managerId,
        currentManagerId: module.managerId
      })
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setSaving(false)
    } else {
      router.push('/my-modules')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (error && !module) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">模块不存在</div>
      </div>
    )
  }

  const cannotChangeManager = module._permissions?.cannotChangeManager || false

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← 返回
        </button>
        <h1 className="text-2xl font-bold">编辑模块</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">模块名称</label>
          <input
            value={module.name}
            onChange={e => setModule({ ...module, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            placeholder="输入模块名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">描述</label>
          <textarea
            value={module.description || ''}
            onChange={e => setModule({ ...module, description: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            rows={3}
            placeholder="输入模块描述"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">模块负责人</label>
          <select
            value={module.managerId || ''}
            onChange={e => setModule({ ...module, managerId: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border"
            disabled={cannotChangeManager}
          >
            <option value="">未指定</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {cannotChangeManager && (
            <p className="text-xs text-gray-500 mt-1">
              只有管理员可以更改负责人
            </p>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
