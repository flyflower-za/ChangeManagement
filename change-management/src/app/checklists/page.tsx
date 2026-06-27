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
      <h1 className="text-2xl font-bold">模版管理</h1>

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
  const [editMode, setEditMode] = useState(false)

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
      isRequired: true, // 默认为true，但UI中不显示选项
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

  const setItemOrder = (itemIdx: number, newOrder: number) => {
    if (newOrder < 1 || newOrder > items.length) return
    if (newOrder === itemIdx + 1) return // No change needed

    const newItems = [...items]
    const [movedItem] = newItems.splice(itemIdx, 1)
    newItems.splice(newOrder - 1, 0, movedItem)
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
        <div className="flex items-center gap-2">
          {dirty && !editMode && (
            <span className="text-xs text-amber-600">有未保存的修改</span>
          )}
          {editMode ? (
            <button
              onClick={() => { onSave(items); setEditMode(false); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition"
            >
              ✓ 保存并完成
            </button>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              ✏️ 编辑
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b text-xs font-medium text-gray-500">
              <th className="px-3 py-3 text-center whitespace-nowrap" style={{ width: '70px' }}>序号</th>
              <th className="px-3 py-3 text-left" style={{ width: 'auto' }}>检查项标题</th>
              <th className="px-3 py-3 text-left" style={{ width: 'auto' }}>详细描述</th>
              <th className="px-3 py-3 text-left whitespace-nowrap" style={{ width: '90px' }}>证据类型</th>
              <th className="px-3 py-3 text-left whitespace-nowrap" style={{ width: '130px' }}>默认执行人</th>
              <th className="px-3 py-3 text-center whitespace-nowrap" style={{ width: '50px' }}>操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, idx) => (
              <tr key={idx} className={editMode ? 'hover:bg-gray-50/50' : ''}>
                {/* Order */}
                <td className="px-3 py-3 text-center">
                  {editMode ? (
                    <select
                      value={idx + 1}
                      onChange={e => setItemOrder(idx, parseInt(e.target.value))}
                      className="text-center text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1 py-1 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none cursor-pointer hover:bg-gray-100 transition"
                      style={{ width: '52px' }}
                    >
                      {items.map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-medium text-gray-600">{idx + 1}</span>
                  )}
                </td>

                {/* Title */}
                <td className="px-3 py-3">
                  {editMode ? (
                    <input
                      value={item.title}
                      onChange={e => updateItem(idx, 'title', e.target.value)}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition"
                      placeholder="检查项标题"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-800 py-1">{item.title}</div>
                  )}
                </td>

                {/* Description */}
                <td className="px-3 py-3">
                  {editMode ? (
                    <textarea
                      value={item.description || ''}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      rows={2}
                      className="w-full text-sm text-gray-500 px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition resize-y"
                      placeholder="详细描述"
                    />
                  ) : (
                    <div className="text-sm text-gray-500 py-1">{item.description || '-'}</div>
                  )}
                </td>

                {/* Evidence Type */}
                <td className="px-3 py-3">
                  {editMode ? (
                    <select
                      value={item.evidenceType}
                      onChange={e => updateItem(idx, 'evidenceType', e.target.value)}
                      className="w-full text-xs px-2 py-2 rounded border border-gray-200 focus:border-blue-400 outline-none"
                    >
                      <option value="text">文字</option>
                      <option value="screenshot">截图</option>
                      <option value="log">日志</option>
                      <option value="config">配置</option>
                    </select>
                  ) : (
                    <span className="text-xs text-gray-600">
                      {item.evidenceType === 'text' ? '文字' :
                       item.evidenceType === 'screenshot' ? '截图' :
                       item.evidenceType === 'log' ? '日志' : '配置'}
                    </span>
                  )}
                </td>

                {/* Default Executor */}
                <td className="px-3 py-3">
                  {editMode ? (
                    <select
                      value={item.defaultExecutorId || ''}
                      onChange={e => updateItem(idx, 'defaultExecutorId', e.target.value)}
                      className="w-full text-xs px-2 py-2 rounded border border-gray-200 focus:border-blue-400 outline-none"
                    >
                      <option value="">默认执行人</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-600">
                      {users.find(u => u.id === item.defaultExecutorId)?.name || '未分配'}
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-center">
                  {editMode ? (
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-gray-300 hover:text-red-500 text-sm transition"
                      title="删除"
                    >
                      ✕
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Button */}
      <div className="px-5 py-4 border-t">
        {editMode ? (
          <button onClick={addItem} className="text-sm text-blue-600 hover:underline">+ 添加检查项</button>
        ) : (
          <div className="text-sm text-gray-400">点击右上角"编辑"按钮修改模版</div>
        )}
      </div>
    </div>
  )
}
