'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewChangePage() {
  const [modules, setModules] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch('/api/modules').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([mods, prods, us]) => {
      setModules(mods)
      setProducts(prods)
      setUsers(us)
      // 默认选择所有激活的模块
      const activeIds = mods.filter((m: any) => m.isActive).map((m: any) => m.id)
      setForm(f => ({ ...f, moduleIds: activeIds }))
    })
  }, [])

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    plannedStart: '',
    plannedEnd: '',
    moduleIds: [] as string[],
    productId: '',
  })

  const toggleModule = (id: string) => {
    setForm(f => ({
      ...f,
      moduleIds: f.moduleIds.includes(id)
        ? f.moduleIds.filter(x => x !== id)
        : [...f.moduleIds, id],
    }))
  }

  // When product is selected, auto-select its related modules
  const handleProductSelect = (productId: string) => {
    if (!productId) {
      setSelectedProduct('')
      setForm(f => ({ ...f, productId: '' }))
      return
    }
    setSelectedProduct(productId)
    setForm(f => ({ ...f, productId }))
    // Auto-select modules assigned to this product
    const product = products.find((p: any) => p.id === productId)
    if (product?.assignments) {
      const productModuleIds = product.assignments.map((a: any) => a.moduleId)
      setForm(f => ({
        ...f,
        productId,
        moduleIds: [...new Set([...f.moduleIds, ...productModuleIds])],
      }))
    }
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
            <label className="block text-sm font-medium text-gray-700 mb-2">选择产品（可选）</label>
            <select
              value={selectedProduct}
              onChange={e => handleProductSelect(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition mb-3"
            >
              <option value="">不选择产品（手动选择部门）</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ''} - {p.assignments?.length || 0}个部门
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg text-xs">
                <span className="text-blue-700 font-medium">已选产品的部门负责人：</span>
                {products.find((p: any) => p.id === selectedProduct)?.assignments?.map((a: any) => (
                  <span key={a.moduleId} className="ml-2 text-blue-600">{a.module?.name}→{a.person}</span>
                ))}
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-2">关联部门 *</label>
            <div className="space-y-4">
              {modules.map(m => {
                const productionLines = m.productionLines || []
                return (
                <div key={m.id} className={`rounded-lg border ${!m.isActive ? 'opacity-50 bg-gray-100' : ''}`}>
                  {/* Department Header */}
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50/50 transition rounded-t-lg">
                    <input
                      type="checkbox"
                      checked={form.moduleIds.includes(m.id)}
                      onChange={() => toggleModule(m.id)}
                      disabled={!m.isActive}
                      className="w-4 h-4 rounded"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {m.manager && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{m.manager.name}</span>
                        )}
                        <span className="text-xs text-gray-400">{m.templates?.[0]?.name}</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{m.templates?.[0]?.items.length || 0}项</span>
                  </label>

                  {/* Product Lines */}
                  {productionLines.length > 0 && (
                    <div className="border-t px-4 py-2 bg-gray-50/50 rounded-b-lg">
                      <div className="text-xs text-gray-400 mb-1.5">产线：</div>
                      <div className="flex flex-wrap gap-1.5">
                        {productionLines.map((pl: any) => (
                          <span key={pl.id} className="px-2 py-0.5 rounded-full text-xs bg-white border">
                            {pl.code ? `${pl.code} ` : ''}{pl.name}
                            {pl.product && <span className="text-blue-500 ml-1">→{pl.product.name}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
