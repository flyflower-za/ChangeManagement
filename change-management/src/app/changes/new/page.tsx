'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewChangePage() {
  const [modules, setModules] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/modules').then(r => r.json()).then(data => {
      setModules(data)
      // 默认选择所有激活的模块
      setForm(f => ({
        ...f,
        moduleIds: data.filter((m: any) => m.isActive).map((m: any) => m.id),
      }))
    })
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    plannedStart: '',
    plannedEnd: '',
    moduleIds: [] as string[],
  })

  const toggleModule = (id: string) => {
    setForm(f => ({
      ...f,
      moduleIds: f.moduleIds.includes(id)
        ? f.moduleIds.filter(x => x !== id)
        : [...f.moduleIds, id],
    }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    const res = await fetch('/api/changes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const change = await res.json()
      router.push(`/changes/${change.id}`)
    } else {
      alert('创建失败')
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Sticky Header with Actions */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← 返回</button>
          <h1 className="text-xl font-bold">创建变更项目</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            已选 {form.moduleIds.length} / {modules.filter((m: any) => m.isActive).length} 个模块
          </span>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || form.moduleIds.length === 0}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? '创建中...' : '创建变更'}
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl p-6 space-y-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">变更标题 *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="如：数据库主从切换"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">变更描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="详细描述变更内容..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">优先级</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                <option value="critical">🔴 紧急</option>
                <option value="high">🟠 高</option>
                <option value="medium">🔵 中</option>
                <option value="low">⚪ 低</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">计划开始时间</label>
              <input
                type="datetime-local"
                value={form.plannedStart}
                onChange={e => setForm({ ...form, plannedStart: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">计划结束时间</label>
              <input
                type="datetime-local"
                value={form.plannedEnd}
                onChange={e => setForm({ ...form, plannedEnd: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">关联模块 *</label>
            <div className="space-y-2">
              {modules.map(m => (
                <label key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition ${!m.isActive ? 'opacity-50 bg-gray-100' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.moduleIds.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    disabled={!m.isActive}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.description}</p>
                  </div>
                  {m.templates.length > 0 && (
                    <span className="text-xs text-blue-500">📋 {m.templates[0].name} ({m.templates[0].items.length}项)</span>
                  )}
                  {!m.isActive && (
                    <span className="text-xs text-gray-400">已停用</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
