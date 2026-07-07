'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ModuleEditPage() {
  const params = useParams()
  const router = useRouter()
  const [moduleData, setModuleData] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params.id as string
    Promise.all([
      fetch('/api/modules').then(r => r.json()),
      fetch('/api/users').then(r => r.json())
    ]).then(([modules, usersData]) => {
      const found = modules.find((m: any) => m.id === id)
      setModuleData(found || null)
      setUsers(usersData)
      setLoading(false)
    })
  }, [params.id])

  const handleSave = async () => {
    if (!moduleData) return
    setSaving(true); setError(null)
    const res = await fetch('/api/modules', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: moduleData.id, name: moduleData.name, description: moduleData.description, managerId: moduleData.managerId, currentManagerId: moduleData.managerId })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false) }
    else router.push('/management')
  }

  if (loading) return <div className="text-gray-400 text-center py-16">加载中...</div>
  if (!moduleData) return <div className="text-red-500 text-center py-16">部门不存在</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/management')} className="text-gray-500 hover:text-gray-700">← 返回</button>
        <h1 className="text-2xl font-bold">编辑部门</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">部门名称</label>
          <input value={moduleData.name} onChange={e => setModuleData({ ...moduleData, name: e.target.value })} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">描述</label>
          <textarea value={moduleData.description || ''} onChange={e => setModuleData({ ...moduleData, description: e.target.value })} rows={2} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">审批人</label>
          <select value={moduleData.managerId || ''} onChange={e => setModuleData({ ...moduleData, managerId: e.target.value })} className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition">
            <option value="">未指定</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={() => router.push('/management')} className="px-6 py-2 border rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
        </div>
      </div>
    </div>
  )
}
