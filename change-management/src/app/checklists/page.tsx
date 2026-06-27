'use client'

import { useEffect, useState } from 'react'
import { classNames } from '@/lib/utils'

export default function ChecklistsPage() {
  const [modules, setModules] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/modules').then(r => r.json()).then(d => {
      setModules(d)
      if (d.length > 0) setSelectedModule(d[0].id)
      setLoading(false)
    })
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  const selectedMod = modules.find(m => m.id === selectedModule)

  const updateTemplate = async (templateId: string, items: any[]) => {
    const tpl = selectedMod?.templates.find((t: any) => t.id === templateId)
    await fetch('/api/checklist-templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: templateId,
        name: tpl?.name,
        description: tpl?.description,
        items,
      }),
    })
    // Reload
    const res = await fetch('/api/modules')
    const data = await res.json()
    setModules(data)
  }

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Checklist 管理</h1>

      <div className="flex gap-6">
        {/* Module List */}
        <div className="w-56 space-y-1">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModule(m.id)}
              className={classNames(
                'w-full text-left px-4 py-3 rounded-lg transition',
                selectedModule === m.id ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50'
              )}
            >
              📦 {m.name}
              {m.templates.length > 0 && (
                <span className="text-xs text-gray-400 ml-1">({m.templates[0].items.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Checklist Content */}
        <div className="flex-1">
          {selectedMod && (
            <ChecklistEditor
              module={selectedMod}
              users={users}
              onSave={(items) => {
                if (selectedMod.templates[0]) {
                  updateTemplate(selectedMod.templates[0].id, items)
                } else {
                  // Create new template
                  fetch('/api/checklist-templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      moduleId: selectedMod.id,
                      name: `${selectedMod.name}变更 Checklist`,
                      description: '',
                      items,
                    }),
                  }).then(() => {
                    fetch('/api/modules').then(r => r.json()).then(setModules)
                  })
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ChecklistEditor({ module, users, onSave }: { module: any; users: any[]; onSave: (items: any[]) => void }) {
  const template = module.templates[0]
  const [items, setItems] = useState<any[]>(template?.items || [])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setItems(template?.items || [])
    setDirty(false)
  }, [module.id, template?.id])

  const addItem = () => {
    setItems([...items, {
      title: '新检查项',
      description: '',
      expectedResult: '',
      evidenceType: 'text',
      isRequired: true,
      defaultExecutorId: null,
      sortOrder: items.length + 1,
    }])
    setDirty(true)
  }

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setItems(newItems)
    setDirty(true)
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
    setDirty(true)
  }

  const moveItem = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const newItems = [...items]
    ;[newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]]
    newItems.forEach((it, i) => it.sortOrder = i + 1)
    setItems(newItems)
    setDirty(true)
  }

  return (
    <div className="bg-white rounded-2xl border">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">{template?.name || `${module.name} Checklist`}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {template ? '编辑检查项模板' : '尚无模板，点击添加创建'}
          </p>
        </div>
        <button
          onClick={() => onSave(items)}
          disabled={!dirty}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-30"
        >
          保存
        </button>
      </div>

      <div className="divide-y">
        {items.map((item, idx) => (
          <div key={idx} className="px-5 py-4 hover:bg-gray-50/50">
            <div className="flex items-start gap-3">
              <span className="text-gray-300 font-medium mt-1.5">{idx + 1}</span>
              <div className="flex-1 space-y-2">
                <input
                  value={item.title}
                  onChange={e => updateItem(idx, 'title', e.target.value)}
                  className="w-full font-medium px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                  placeholder="检查项标题"
                />
                <input
                  value={item.description || ''}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  className="w-full text-sm text-gray-500 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                  placeholder="详细描述"
                />
                <div className="flex items-center gap-3 text-xs">
                  <select
                    value={item.evidenceType}
                    onChange={e => updateItem(idx, 'evidenceType', e.target.value)}
                    className="px-2 py-1 rounded border border-gray-200"
                  >
                    <option value="text">文字说明</option>
                    <option value="screenshot">截图</option>
                    <option value="log">日志</option>
                    <option value="config">配置文件</option>
                  </select>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={item.isRequired} onChange={e => updateItem(idx, 'isRequired', e.target.checked)} className="w-3.5 h-3.5 rounded" />
                    必填
                  </label>
                  <select
                    value={item.defaultExecutorId || ''}
                    onChange={e => updateItem(idx, 'defaultExecutorId', e.target.value)}
                    className="px-2 py-1 rounded border border-gray-200"
                  >
                    <option value="">默认执行人</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => moveItem(idx, -1)} className="text-gray-300 hover:text-gray-600 text-sm">▲</button>
                <button onClick={() => moveItem(idx, 1)} className="text-gray-300 hover:text-gray-600 text-sm">▼</button>
                <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 text-sm">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 border-t">
        <button onClick={addItem} className="text-sm text-blue-600 hover:underline">+ 添加检查项</button>
      </div>
    </div>
  )
}
