'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { classNames } from '@/lib/utils'

type Tab = 'departments' | 'products' | 'templates'

export default function ManagementPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('departments')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(u => { setCurrentUser(u); setLoading(false) })
  }, [])

  if (loading) return <div className="text-gray-400">加载中...</div>

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'departments', label: '部门管理', icon: '🏢' },
    { key: 'products', label: '产品管理', icon: '📦' },
    { key: 'templates', label: '模版管理', icon: '📝' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理中心</h1>
        <p className="text-sm text-gray-500 mt-1">管理部门、产品和检查模版</p>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={classNames('px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            <span className="mr-1.5">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {tab === 'departments' && <DepartmentsPanel currentUser={currentUser} router={router} />}
      {tab === 'products' && <ProductsPanel currentUser={currentUser} />}
      {tab === 'templates' && <TemplatesPanel />}
    </div>
  )
}

// ============ 部门管理 ============
function DepartmentsPanel({ currentUser, router }: { currentUser: any; router: any }) {
  const [modules, setModules] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    fetch('/api/modules').then(r => r.json()).then(setModules)
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])

  const load = () => fetch('/api/modules').then(r => r.json()).then(setModules)
  const del = async (id: string, name: string) => {
    if (!confirm(`删除「${name}」？`)) return
    await fetch('/api/modules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {currentUser?.role === 'admin' && <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">+ 新建部门</button>}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr><th className="px-3 py-3 text-left text-xs font-medium text-gray-500">名称</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500">工厂</th><th className="px-3 py-3 text-left text-xs font-medium text-gray-500">审批人</th><th className="px-3 py-3 text-center text-xs font-medium text-gray-500 w-16">模版</th><th className="px-3 py-3 text-right text-xs font-medium text-gray-500 w-28">操作</th></tr></thead>
          <tbody className="divide-y">
            {modules.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-3 py-3"><span className="font-medium">{m.name}</span>{m.description && <p className="text-xs text-gray-400">{m.description}</p>}</td>
                <td className="px-3 py-3 text-sm text-gray-500">{m.factory?.name || '-'}</td>
                <td className="px-3 py-3">{m.manager ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{m.manager.name}</span> : <span className="text-xs text-gray-400">-</span>}</td>
                <td className="px-3 py-3 text-center text-sm text-gray-500">{m.templates?.length || 0}</td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {currentUser?.role === 'admin' && (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => router.push(`/modules/${m.id}/edit`)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg">编辑</button>
                      <button onClick={() => del(m.id, m.name)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg">删除</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Dept Modal */}
      {showNew && <NewDeptModal users={users} onClose={() => setShowNew(false)} onDone={load} />}
    </div>
  )
}

function NewDeptModal({ users, onClose, onDone }: { users: any[]; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState({ name: '', description: '', managerId: '', factoryId: '' })

  useEffect(() => { fetch('/api/modules').then(r => r.json()).then(mods => { if (mods[0]?.factoryId) setD(prev => ({ ...prev, factoryId: mods[0].factoryId })) }) }, [])

  const save = async () => {
    if (!d.name.trim()) return
    await fetch('/api/modules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
    onDone(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">新建部门</h2>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">名称 *</label><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">描述</label><input value={d.description} onChange={e => setD({ ...d, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">审批人</label><select value={d.managerId} onChange={e => setD({ ...d, managerId: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm"><option value="">未指定</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        </div>
        <div className="flex gap-3 mt-5"><button onClick={onClose} className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50">取消</button><button onClick={save} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">创建</button></div>
      </div>
    </div>
  )
}

// ============ 产品管理 ============
function ProductsPanel({ currentUser }: { currentUser: any }) {
  const [products, setProducts] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })

  useEffect(() => {
    load()
    fetch('/api/modules').then(r => r.json()).then(setModules)
  }, [])

  const load = () => fetch('/api/products').then(r => r.json()).then(p => { setProducts(p); if (!selected && p.length > 0) setSelected(p[0].id) })

  const save = async () => {
    if (!form.name.trim()) return
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowForm(false); setForm({ name: '', code: '', description: '' }); load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`删除产品「${name}」？`)) return
    await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (selected === id) setSelected(null); load()
  }

  const selectedProduct = products.find(p => p.id === selected)

  return (
    <div className="flex gap-6">
      <div className="w-48 space-y-1">
        {products.map(p => (
          <button key={p.id} onClick={() => setSelected(p.id)} className={classNames('w-full text-left px-3 py-2.5 rounded-lg text-sm transition', selected === p.id ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50')}>
            📦 {p.name} {p.code && <span className="text-xs text-gray-400">({p.code})</span>}
          </button>
        ))}
        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowForm(true)} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition">+ 新建产品</button>
        )}
      </div>

      <div className="flex-1">
        {selectedProduct && <ProductDetail product={selectedProduct} modules={modules} currentUser={currentUser} onUpdate={load} onDelete={del} />}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">新建产品</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">产品名 *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium mb-1">产品编号</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="如 PROD-A" /></div>
              <div><label className="block text-sm font-medium mb-1">描述</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-5"><button onClick={() => setShowForm(false)} className="flex-1 py-2 border rounded-lg text-sm">取消</button><button onClick={save} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm">创建</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductDetail({ product, modules, currentUser, onUpdate, onDelete }: any) {
  const [assignments, setAssignments] = useState<any[]>(product.assignments || [])
  const [dirty, setDirty] = useState(false)

  const updateAssignment = (moduleId: string, person: string) => {
    const existing = assignments.find((a: any) => a.moduleId === moduleId)
    if (existing) {
      setAssignments(assignments.map((a: any) => a.moduleId === moduleId ? { ...a, person } : a))
    } else if (person.trim()) {
      setAssignments([...assignments, { productId: product.id, moduleId, person }])
    }
    setDirty(true)
  }

  const removeAssignment = (moduleId: string) => {
    setAssignments(assignments.filter((a: any) => a.moduleId !== moduleId))
    setDirty(true)
  }

  const save = async () => {
    await fetch('/api/products', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product.id, name: product.name, code: product.code, description: product.description, assignments: assignments.map((a: any) => ({ moduleId: a.moduleId, person: a.person })) })
    })
    setDirty(false); onUpdate()
  }

  return (
    <div className="bg-white rounded-xl border">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">{product.name} {product.code && <span className="text-sm text-gray-400">({product.code})</span>}</h2>
          {product.description && <p className="text-xs text-gray-400 mt-0.5">{product.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">保存</button>}
          {currentUser?.role === 'admin' && <button onClick={() => onDelete(product.id, product.name)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">删除</button>}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Assignments: Department contacts */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">各部门负责人</h3>
          <div className="space-y-2">
            {modules.map((m: any) => {
              const a = assignments.find((x: any) => x.moduleId === m.id)
              return (
                <div key={m.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 w-24">{m.name}</span>
                  <span className="text-gray-300">→</span>
                  <input
                    value={a?.person || ''}
                    onChange={e => updateAssignment(m.id, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-200 focus:border-blue-400 outline-none transition"
                    placeholder={`${m.name}的产品负责人`}
                  />
                  {a?.person && <button onClick={() => removeAssignment(m.id)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

// ============ 模版管理 ============
function TemplatesPanel() {
  const [modules, setModules] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetch('/api/modules').then(r => r.json()), fetch('/api/users').then(r => r.json())])
      .then(([mods, us]) => { setModules(mods); setUsers(us); if (mods.length > 0) setSelectedModule(mods[0].id); setLoading(false) })
  }, [])

  const sm = modules.find(m => m.id === selectedModule)

  const updateTemplate = async (templateId: string, items: any[]) => {
    const tpl = sm?.templates.find((t: any) => t.id === templateId)
    await fetch('/api/checklist-templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: templateId, name: tpl?.name, description: tpl?.description, items }) })
    fetch('/api/modules').then(r => r.json()).then(setModules)
  }

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="flex gap-6">
      <div className="w-48 space-y-1">
        {modules.map(m => <button key={m.id} onClick={() => setSelectedModule(m.id)} className={classNames('w-full text-left px-3 py-2.5 rounded-lg text-sm transition', selectedModule === m.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50')}>{m.name} <span className="text-xs text-gray-400">({m.templates?.[0]?.items?.length || 0})</span></button>)}
      </div>
      <div className="flex-1">
        {sm && <TemplateEditor module={sm} users={users} onSave={(items) => { if (sm.templates[0]) updateTemplate(sm.templates[0].id, items); else { fetch('/api/checklist-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleId: sm.id, name: `${sm.name}变更检查清单`, description: '', items }) }).then(() => fetch('/api/modules').then(r => r.json()).then(setModules)) } }} />}
      </div>
    </div>
  )
}

function TemplateEditor({ module, users, onSave }: { module: any; users: any[]; onSave: (items: any[]) => void }) {
  const template = module.templates[0]
  const [items, setItems] = useState<any[]>(template?.items || [])
  const [dirty, setDirty] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => { setItems(template?.items || []); setDirty(false) }, [module.id, template?.id])

  const addItem = () => { setItems([...items, { title: '新检查项', description: '', evidenceType: 'text', isRequired: true, defaultExecutorId: null, sortOrder: items.length + 1 }]); setDirty(true) }
  const updateItem = (idx: number, field: string, value: any) => { const ni = [...items]; ni[idx] = { ...ni[idx], [field]: value }; setItems(ni); setDirty(true) }
  const removeItem = (idx: number) => { setItems(items.filter((_, i) => i !== idx)); setDirty(true) }
  const setOrder = (from: number, to: number) => { if (to < 1 || to > items.length || to === from + 1) return; const ni = [...items]; const [moved] = ni.splice(from, 1); ni.splice(to - 1, 0, moved); ni.forEach((it, i) => it.sortOrder = i + 1); setItems(ni); setDirty(true) }

  return (
    <div className="bg-white rounded-xl border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold">{template?.name || `${module.name}变更检查清单`}</h2>
        <div className="flex items-center gap-2">
          {editMode ? <button onClick={() => { onSave(items); setEditMode(false) }} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">✓ 保存并完成</button> : <button onClick={() => setEditMode(true)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">✏️ 编辑</button>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-gray-50 border-b text-xs text-gray-500"><th className="px-3 py-2 text-center" style={{ width: 60 }}>序号</th><th className="px-3 py-2 text-left">标题</th><th className="px-3 py-2 text-left">描述</th><th className="px-3 py-2 text-left" style={{ width: 90 }}>证据</th><th className="px-3 py-2 text-left" style={{ width: 120 }}>执行人</th><th className="px-3 py-2 text-center" style={{ width: 50 }}>操作</th></tr></thead>
          <tbody className="divide-y">
            {items.map((item, idx) => (
              <tr key={idx} className={editMode ? 'hover:bg-gray-50' : ''}>
                <td className="px-3 py-2 text-center">{editMode ? <select value={idx + 1} onChange={e => setOrder(idx, parseInt(e.target.value))} className="text-center text-sm text-gray-600 bg-gray-50 border rounded px-1 py-1 outline-none cursor-pointer" style={{ width: 48 }}>{items.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select> : <span className="text-sm text-gray-600">{idx + 1}</span>}</td>
                <td className="px-3 py-2">{editMode ? <input value={item.title} onChange={e => updateItem(idx, 'title', e.target.value)} className="w-full text-sm px-3 py-1.5 rounded border border-transparent hover:border-gray-200 focus:border-blue-400 outline-none" placeholder="标题" /> : <span className="text-sm font-medium">{item.title}</span>}</td>
                <td className="px-3 py-2">{editMode ? <textarea value={item.description || ''} onChange={e => updateItem(idx, 'description', e.target.value)} rows={1} className="w-full text-sm text-gray-500 px-3 py-1.5 rounded border border-transparent hover:border-gray-200 focus:border-blue-400 outline-none resize-y" placeholder="描述" /> : <span className="text-sm text-gray-500">{item.description || '-'}</span>}</td>
                <td className="px-3 py-2">{editMode ? <select value={item.evidenceType} onChange={e => updateItem(idx, 'evidenceType', e.target.value)} className="w-full text-xs px-1.5 py-1.5 rounded border border-gray-200"><option value="text">文字</option><option value="screenshot">截图</option><option value="log">日志</option><option value="config">配置</option></select> : <span className="text-xs text-gray-600">{item.evidenceType === 'text' ? '文字' : item.evidenceType === 'screenshot' ? '截图' : item.evidenceType === 'log' ? '日志' : '配置'}</span>}</td>
                <td className="px-3 py-2">{editMode ? <select value={item.defaultExecutorId || ''} onChange={e => updateItem(idx, 'defaultExecutorId', e.target.value)} className="w-full text-xs px-1.5 py-1.5 rounded border border-gray-200"><option value="">未指定</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select> : <span className="text-xs text-gray-600">{users.find(u => u.id === item.defaultExecutorId)?.name || '-'}</span>}</td>
                <td className="px-3 py-2 text-center">{editMode ? <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 text-sm">✕</button> : <span className="text-xs text-gray-400">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t">{editMode ? <button onClick={addItem} className="text-sm text-blue-600 hover:underline">+ 添加检查项</button> : <div className="text-sm text-gray-400">点击右上角编辑按钮修改</div>}</div>
    </div>
  )
}
