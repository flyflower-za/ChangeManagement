'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { classNames } from '@/lib/utils'

type Tab = 'departments' | 'products' | 'templates' | 'smtp'

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
    { key: 'smtp', label: '邮件配置', icon: '📧' },
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
      {tab === 'smtp' && <SmtpPanel currentUser={currentUser} />}
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

// ============ 邮件配置 ============
function SmtpPanel({ currentUser }: { currentUser: any }) {
  const [config, setConfig] = useState({ host: '', port: 587, user: '', pass: '', encryption: 'none', enabled: false })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/smtp').then(r => r.json()).then(d => {
      if (d) setConfig({ host: d.host || '', port: d.port || 587, user: d.user || '', pass: '', encryption: d.encryption || 'none', enabled: d.enabled || false })
    })
  }, [])

  const save = async () => {
    setSaving(true); setMessage(null)
    const res = await fetch('/api/smtp', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    const data = await res.json()
    setMessage(data.error ? { type: 'error', text: data.error } : { type: 'success', text: '配置已保存' })
    setSaving(false)
  }

  const testEmail = async () => {
    setTesting(true); setMessage(null)
    const res = await fetch('/api/smtp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    const data = await res.json()
    setMessage(data.error ? { type: 'error', text: data.error } : { type: 'success', text: data.message || '测试邮件已发送' })
    setTesting(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">SMTP 邮件配置</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="rounded" />
            {config.enabled ? <span className="text-green-600">已启用</span> : <span className="text-gray-400">已禁用</span>}
          </label>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium mb-1">SMTP 服务器</label><input value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="smtp.example.com" /></div>
          <div><label className="block text-xs font-medium mb-1">端口</label><input type="number" value={config.port} onChange={e => setConfig({ ...config, port: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-xs font-medium mb-1">加密方式</label><select value={config.encryption} onChange={e => setConfig({ ...config, encryption: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none"><option value="none">无加密</option><option value="tls">STARTTLS</option><option value="ssl">SSL/TLS</option></select></div>
          <div><label className="block text-xs font-medium mb-1">密码（可选）</label><input type="password" value={config.pass} onChange={e => setConfig({ ...config, pass: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="无需密码则留空" /></div>
          <div className="col-span-2"><label className="block text-xs font-medium mb-1">发件人邮箱</label><input type="email" value={config.user} onChange={e => setConfig({ ...config, user: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="noreply@company.com" /></div>
        </div>
        {message && <div className={classNames('text-sm p-3 rounded-lg', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>{message.text}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving} className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">{saving ? '保存中...' : '保存配置'}</button>
          <button onClick={testEmail} disabled={testing} className="px-6 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">{testing ? '发送中...' : '发送测试邮件'}</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-1">📬 邮件模板</h3>
        <p className="text-xs text-gray-400 mb-3">点击查看各通知类型的邮件模板，包含完整样式和内容预览</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon:'📋', color:'hover:bg-blue-50 border-blue-200', title:'创建变更通知', desc:'发起人+审批人', subject:'【变更通知】#1 产品A产线改造', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#1a73e8;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">📋 新变更项目已创建</h2></div><div style="padding:24px"><p style="color:#333;margin:0 0 16px">您好，以下变更项目已创建，请关注：</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">编号</td><td style="padding:10px 12px;font-weight:600;color:#1a73e8">#1</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">标题</td><td style="padding:10px 12px;font-weight:600">产品A产线改造</td></tr><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888">描述</td><td style="padding:10px 12px;color:#555">产品A装配线自动化改造项目</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">优先级</td><td style="padding:10px 12px"><span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:4px;font-size:12px">🔴 紧急</span></td></tr><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888">发起人</td><td style="padding:10px 12px">李四</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">涉及部门</td><td style="padding:10px 12px">设备部门、工艺部门、生产1</td></tr><tr><td style="padding:10px 12px;color:#888">截止时间</td><td style="padding:10px 12px">2026年6月30日</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">查看变更详情 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送，请勿回复</div></div>' },
            { icon:'⏳', color:'hover:bg-orange-50 border-orange-200', title:'审批提醒', desc:'部门检查项完成', subject:'【审批提醒】设备部门检查项已完成', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#e67e22;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">⏳ 等待您的审批</h2></div><div style="padding:24px"><p style="color:#333;margin:0 0 16px">「<b>设备部门</b>」的所有检查项已执行完毕，请尽快审批。</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">变更项目</td><td style="padding:10px 12px;font-weight:600">产品A产线改造</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">审批部门</td><td style="padding:10px 12px">设备部门</td></tr><tr><td style="padding:10px 12px;color:#888">检查项</td><td style="padding:10px 12px">8 项全部完成</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#e67e22;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">前往审批 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'✅', color:'hover:bg-green-50 border-green-200', title:'审批结果', desc:'通过/驳回通知发起人', subject:'【审批通过】设备部门 - 产品A产线改造', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#27ae60;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">✅ 审批已通过</h2></div><div style="padding:24px"><p style="color:#333;margin:0 0 16px">您发起的变更「<b>产品A产线改造</b>」中的模块已通过审批。</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">审批模块</td><td style="padding:10px 12px;font-weight:600">设备部门</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">审批人</td><td style="padding:10px 12px">王五</td></tr><tr><td style="padding:10px 12px;color:#888">审批时间</td><td style="padding:10px 12px">2026/06/27 15:30</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">查看审批详情 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'⏰', color:'hover:bg-red-50 border-red-200', title:'到期提醒', desc:'7天/3天到期预警', subject:'【⏰ 即将到期】剩余3天 - 产品A产线改造', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#e74c3c;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">⏰ 截止日期临近</h2></div><div style="padding:24px"><div style="background:#fff3e0;border-left:4px solid #e65100;padding:12px 16px;margin:0 0 16px;font-size:14px">变更「<b>产品A产线改造</b>」将在 <b style="color:#e74c3c;font-size:18px">3天</b> 后到期，请尽快处理！</div><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">当前进度</td><td style="padding:10px 12px"><div style="background:#eee;border-radius:4px;height:8px;width:100%"><div style="background:#e74c3c;width:40%;height:8px;border-radius:4px"></div></div><span style="font-size:12px;color:#e74c3c;margin-left:8px">5/8 项</span></td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">截止时间</td><td style="padding:10px 12px;font-weight:600;color:#e74c3c">2026年6月30日</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#e74c3c;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">立即处理 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'❌', color:'hover:bg-pink-50 border-pink-200', title:'检查项驳回', desc:'通知执行人重做', subject:'【❌ 检查项需重做】设备运行状态检查', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#e74c3c;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">❌ 检查项被驳回，需重新执行</h2></div><div style="padding:24px"><div style="background:#fdf2f2;border-left:4px solid #e74c3c;padding:12px 16px;margin:0 0 16px"><p style="margin:0 0 4px;font-size:12px;color:#e74c3c">驳回理由</p><p style="margin:0;font-size:14px;color:#c0392b">执行证据不足，请补充设备运行状态的截图和日志文件</p></div><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">驳回项</td><td style="padding:10px 12px;font-weight:600">设备运行状态检查</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">所属部门</td><td style="padding:10px 12px">设备部门</td></tr><tr><td style="padding:10px 12px;color:#888">变更项目</td><td style="padding:10px 12px">产品A产线改造</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#e74c3c;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">重新执行 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'👤', color:'hover:bg-indigo-50 border-indigo-200', title:'任务分配', desc:'通知执行人', subject:'【📋 新任务】设备运行状态检查', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#1a73e8;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">📋 您有新的检查任务</h2></div><div style="padding:24px"><p style="color:#333;margin:0 0 16px">您被分配了以下检查项，请及时执行：</p><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">检查项</td><td style="padding:10px 12px;font-weight:600">设备运行状态检查</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">所属部门</td><td style="padding:10px 12px">设备部门</td></tr><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888">变更项目</td><td style="padding:10px 12px">产品A产线改造</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">要求</td><td style="padding:10px 12px;color:#555">确认设备当前运行状态正常，无异常报警</td></tr><tr><td style="padding:10px 12px;color:#888">截止时间</td><td style="padding:10px 12px">2026年6月30日</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">开始执行 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'🏁', color:'hover:bg-teal-50 border-teal-200', title:'变更完成', desc:'全员通知', subject:'【✅ 变更完成】#1 产品A产线改造', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#27ae60;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">🎉 变更项目已完成</h2></div><div style="padding:24px"><div style="background:#f0faf4;border-left:4px solid #27ae60;padding:12px 16px;margin:0 0 16px"><p style="margin:0;font-size:14px;color:#27ae60">所有模块已审批通过，变更项目顺利完成！</p></div><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888;width:72px">项目编号</td><td style="padding:10px 12px;font-weight:600;color:#1a73e8">#1</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">项目名称</td><td style="padding:10px 12px;font-weight:600">产品A产线改造</td></tr><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px;color:#888">完成时间</td><td style="padding:10px 12px">2026年6月27日 18:30</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px;color:#888">参与部门</td><td style="padding:10px 12px">设备部门、工艺部门、生产1、质量部门</td></tr></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#27ae60;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">查看完成报告 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
            { icon:'📊', color:'hover:bg-purple-50 border-purple-200', title:'待办汇总', desc:'每日/每周摘要', subject:'【📊 每日汇总】您有 3 个待处理事项', body:'<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)"><div style="background:#1a73e8;padding:24px"><h2 style="color:#fff;margin:0;font-size:18px">📊 每日待办汇总</h2></div><div style="padding:24px"><p style="color:#333;margin:0 0 16px">王五，您好！以下是与您相关的待处理事项：</p><table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr style="background:#f8f9fa;text-align:left"><th style="padding:10px 12px;border-bottom:2px solid #e0e0e0;font-size:13px;color:#666">变更项目</th><th style="padding:10px 12px;border-bottom:2px solid #e0e0e0;font-size:13px;color:#666">部门</th><th style="padding:10px 12px;border-bottom:2px solid #e0e0e0;font-size:13px;color:#666">状态</th><th style="padding:10px 12px;border-bottom:2px solid #e0e0e0;font-size:13px;color:#666">截止</th></tr></thead><tbody><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px">产品A产线改造</td><td style="padding:10px 12px">设备部门</td><td style="padding:10px 12px;color:#e67e22;font-weight:600">待审批</td><td style="padding:10px 12px">06/30</td></tr><tr style="border-bottom:1px solid #eee;background:#f8f9fa"><td style="padding:10px 12px">工艺参数优化</td><td style="padding:10px 12px">质量部门</td><td style="padding:10px 12px;color:#e67e22;font-weight:600">待审批</td><td style="padding:10px 12px">07/05</td></tr><tr style="border-bottom:1px solid #eee"><td style="padding:10px 12px">物流系统升级</td><td style="padding:10px 12px">物流部门</td><td style="padding:10px 12px;color:#3498db">待执行(2/8)</td><td style="padding:10px 12px">07/10</td></tr></tbody></table><div style="margin-top:24px;text-align:center"><a href="#" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">查看我的待办 →</a></div></div><div style="background:#f8f9fa;padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center">此邮件由变更管理系统自动发送</div></div>' },
          ].map((tpl, i) => (
            <SmptTemplateCard key={i} templateKey={['change_created','approval_reminder','approval_result','deadline_warning','item_rejected','item_assigned','change_completed','digest'][i]} {...tpl} />
          ))}
        </div>
      </div>
    </div>
  )
}

function SmptTemplateCard({ icon, color, title, desc, templateKey, subject: defaultSubject, body: defaultBody }: { icon: string; color: string; title: string; desc: string; templateKey: string; subject: string; body: string }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [htmlBody, setHtmlBody] = useState(defaultBody)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch('/api/email-templates', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: templateKey, name: title, subject, body: htmlBody }),
    })
    setSaving(false); setEditing(false)
  }

  const reset = () => {
    setSubject(defaultSubject); setHtmlBody(defaultBody); setEditing(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={classNames('flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition text-left', color)}>
        <span className="text-lg">{icon}</span>
        <div><div className="font-medium text-gray-700">{title}</div><div className="text-xs text-gray-400">{desc}</div></div>
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold">{icon} {title}</h3>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
                    <button onClick={reset} className="px-4 py-1.5 border rounded-lg text-sm hover:bg-gray-50">取消</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">✏️ 编辑HTML</button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl ml-2">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex">
              {editing ? (
                <>
                  <div className="flex-1 flex flex-col border-r">
                    <div className="p-3 border-b bg-gray-50">
                      <label className="text-xs text-gray-500">邮件主题</label>
                      <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-1.5 mt-1 rounded border text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <textarea value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
                      className="flex-1 p-4 font-mono text-xs border-none outline-none resize-none"
                      style={{ fontFamily:'monospace', fontSize:'12px', lineHeight:'1.5' }} />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <div className="text-xs text-gray-400 mb-2">实时预览</div>
                    <div className="bg-white border rounded-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                  </div>
                </>
              ) : (
                <div className="p-6 space-y-3 overflow-y-auto flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-400">收件人：</span><span className="text-sm text-gray-700">根据触发规则自动匹配</span><br/>
                    <span className="text-xs text-gray-400">邮件主题：</span><span className="text-sm text-gray-700 font-medium">{subject}</span>
                  </div>
                  <div className="text-xs text-gray-400">邮件正文预览：</div>
                  <div className="border rounded-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: htmlBody }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
