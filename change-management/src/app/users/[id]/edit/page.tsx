'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function UserEditPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modules, setModules] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const id = params.id as string
    fetch('/api/modules').then(r => r.json()).then(setModules)

    if (id === 'new') {
      setUser({
        id: null, username: '', name: '', email: '', password: '', role: 'executor', departmentId: '',
      })
      setLoading(false)
    } else {
      Promise.all([
        fetch(`/api/users`).then(r => r.json()),
        fetch('/api/me').then(r => r.json())
      ]).then(([users, me]) => {
        const found = users.find((u: any) => u.id === id)
        if (found) {
          setUser({ ...found, password: '' })
        } else {
          setError('用户不存在')
        }
        setCurrentUser(me)
        setLoading(false)
      })
    }
  }, [params.id])

  const handleSave = async () => {
    if (!user.name || !user.email) {
      setError('姓名和邮箱为必填项')
      return
    }
    if (!user.id && !user.password) {
      setError('新建用户需要设置密码')
      return
    }

    setSaving(true)
    setError(null)

    const isNew = user.id === null
    const res = await fetch('/api/users', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        username: user.username || null,
        name: user.name,
        email: user.email,
        password: user.password || undefined,
        role: user.role,
        departmentId: user.departmentId || null,
      }),
    })

    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setSaving(false)
    } else {
      router.push('/users')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">加载中...</div></div>
  if (!user || (error && !user.name)) return <div className="flex items-center justify-center h-64"><div className="text-red-500">{error}</div></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold">{user.id ? '编辑用户' : '新建用户'}</h1>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">用户名</label>
          <input
            value={user.username || ''}
            onChange={e => setUser({ ...user, username: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="登录用户名（如工号）"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">姓名 *</label>
          <input
            value={user.name}
            onChange={e => setUser({ ...user, name: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="输入用户姓名"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">邮箱 *</label>
          <input
            type="email"
            value={user.email}
            onChange={e => setUser({ ...user, email: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="输入邮箱地址"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            密码 {!user.id && '*'}
            {user.id && <span className="text-gray-400 font-normal">（留空则不修改）</span>}
          </label>
          <input
            type="password"
            value={user.password || ''}
            onChange={e => setUser({ ...user, password: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder={user.id ? '留空则不修改密码' : '设置登录密码'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">所属部门</label>
          <select
            value={user.departmentId || ''}
            onChange={e => setUser({ ...user, departmentId: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
          >
            <option value="">未指定</option>
            {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">角色</label>
          <select
            value={user.role}
            onChange={e => setUser({ ...user, role: e.target.value })}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition"
            disabled={currentUser?.role !== 'admin'}
          >
            <option value="admin">管理员</option>
            <option value="approver">审批人</option>
            <option value="executor">执行人</option>
          </select>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <span className={classNames(
              'text-xs px-2 py-1 rounded text-center',
              user.role === 'admin' ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-50 text-gray-500'
            )}>管理员</span>
            <span className={classNames(
              'text-xs px-2 py-1 rounded text-center',
              user.role === 'approver' ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-500'
            )}>审批人</span>
            <span className={classNames(
              'text-xs px-2 py-1 rounded text-center',
              user.role === 'executor' ? 'bg-gray-100 text-gray-700 font-medium' : 'bg-gray-50 text-gray-500'
            )}>执行人</span>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
