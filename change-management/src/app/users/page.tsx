'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { classNames } from '@/lib/utils'

type UserTab = 'users' | 'groups' | 'ldap'

const ROLES = [
  { key: 'admin', label: '管理员', color: 'bg-red-100 text-red-700' },
  { key: 'approver', label: '审批人', color: 'bg-blue-100 text-blue-700' },
  { key: 'executor', label: '执行人', color: 'bg-gray-100 text-gray-700' },
]

export default function UsersPage() {
  const router = useRouter()
  const [tab, setTab] = useState<UserTab>('users')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(u => { setCurrentUser(u); setLoading(false) })
  }, [])

  if (loading) return <div className="text-gray-400">加载中...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理系统用户、权限组和LDAP集成</p>
      </div>

      <div className="flex gap-2 border-b">
        {[{ key: 'users', label: '用户列表' }, { key: 'groups', label: '权限组' }, { key: 'ldap', label: 'LDAP配置' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as UserTab)}
            className={classNames('px-4 py-2 border-b-2 transition-colors text-sm font-medium',
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel currentUser={currentUser} router={router} />}
      {tab === 'groups' && <GroupsPanel currentUser={currentUser} />}
      {tab === 'ldap' && <LdapPanel currentUser={currentUser} />}
    </div>
  )
}

// ========== 用户列表 ==========
function UsersPanel({ currentUser, router }: any) {
  const [users, setUsers] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])

  const load = () => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/modules').then(r => r.json()),
      fetch('/api/permission-groups').then(r => r.json()),
    ]).then(([u, m, g]) => { setUsers(u); setModules(m); setGroups(g) })
  }

  useEffect(() => { load() }, [])

  const getDept = (id: string | null) => id ? modules.find((m: any) => m.id === id)?.name || '-' : '-'
  const getGroup = (id: string | null) => id ? groups.find((g: any) => g.id === id)?.name || '-' : '-'
  const getRoleLabel = (role: string) => ROLES.find(r => r.key === role)?.label || role
  const getRoleColor = (role: string) => ROLES.find(r => r.key === role)?.color || 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {currentUser?.role === 'admin' && (
          <button onClick={() => router.push('/users/new/edit')} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">+ 新建用户</button>
        )}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr className="text-xs font-medium text-gray-500">
            <th className="pl-4 pr-2 py-2.5 text-left">用户名</th>
            <th className="px-2 py-2.5 text-left">姓名</th>
            <th className="px-2 py-2.5 text-left">邮箱</th>
            <th className="px-2 py-2.5 text-left">部门</th>
            <th className="px-2 py-2.5 text-left">权限组</th>
            <th className="px-2 py-2.5 text-left">角色</th>
            <th className="pr-4 pl-2 py-2.5 text-right">操作</th>
          </tr></thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="pl-4 pr-2 py-2.5 text-sm font-medium text-gray-700">{u.username || '-'}</td>
                <td className="px-2 py-2.5 text-sm">{u.name}</td>
                <td className="px-2 py-2.5 text-sm text-gray-500">{u.email}</td>
                <td className="px-2 py-2.5 text-sm text-gray-500">{getDept(u.departmentId)}</td>
                <td className="px-2 py-2.5 text-sm text-gray-500">{getGroup(u.groupId)}</td>
                <td className="px-2 py-2.5"><span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getRoleColor(u.role))}>{getRoleLabel(u.role)}</span></td>
                <td className="pr-4 pl-2 py-2.5 text-right">
                  {currentUser?.role === 'admin' && (
                    <button onClick={() => router.push(`/users/${u.id}/edit`)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition">编辑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========== 权限组 ==========
function GroupsPanel({ currentUser }: any) {
  const [groups, setGroups] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', role: 'executor' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch('/api/permission-groups').then(r => r.json()).then(setGroups) }, [])

  const load = () => fetch('/api/permission-groups').then(r => r.json()).then(setGroups)

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/permission-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setShowForm(false); setForm({ name: '', description: '', role: 'executor' }); load()
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`删除权限组「${name}」？`)) return
    await fetch('/api/permission-groups', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const getRoleColor = (role: string) => ROLES.find(r => r.key === role)?.color || ''

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {currentUser?.role === 'admin' && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">+ 新建权限组</button>
        )}
      </div>

      {showForm && (
        <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3 flex-wrap">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-blue-200 text-sm w-32" placeholder="组名" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="px-3 py-2 rounded-lg border border-blue-200 text-sm flex-1" placeholder="描述" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="px-3 py-2 rounded-lg border border-blue-200 text-sm">
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
          <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr className="text-xs font-medium text-gray-500">
            <th className="pl-4 pr-2 py-2.5 text-left">组名</th>
            <th className="px-2 py-2.5 text-left">描述</th>
            <th className="px-2 py-2.5 text-left">关联角色</th>
            <th className="pr-4 pl-2 py-2.5 text-right">操作</th>
          </tr></thead>
          <tbody className="divide-y">
            {groups.map((g: any) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="pl-4 pr-2 py-2.5 text-sm font-medium">{g.name}</td>
                <td className="px-2 py-2.5 text-sm text-gray-500">{g.description || '-'}</td>
                <td className="px-2 py-2.5"><span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', getRoleColor(g.role))}>{ROLES.find(r => r.key === g.role)?.label || g.role}</span></td>
                <td className="pr-4 pl-2 py-2.5 text-right">
                  {currentUser?.role === 'admin' && (
                    <button onClick={() => del(g.id, g.name)} className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition">删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ========== LDAP配置 ==========
function LdapPanel({ currentUser }: any) {
  const [config, setConfig] = useState({ url: '', baseDN: '', bindDN: '', bindPass: '', filter: '(sAMAccountName={{username}})', enabled: false })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/ldap').then(r => r.json()).then(d => {
      if (d && d.url) setConfig({ url: d.url, baseDN: d.baseDN, bindDN: d.bindDN || '', bindPass: '', filter: d.filter || '(sAMAccountName={{username}})', enabled: d.enabled })
    })
  }, [])

  const save = async () => {
    setSaving(true); setMessage(null)
    const res = await fetch('/api/ldap', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
    const data = await res.json()
    setMessage(data.error ? { type: 'error', text: data.error } : { type: 'success', text: '配置已保存' })
    setSaving(false)
  }

  const test = async () => {
    setTesting(true); setMessage(null)
    const res = await fetch('/api/ldap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', ...config }) })
    const data = await res.json()
    setMessage(data.error ? { type: 'error', text: data.error } : { type: 'success', text: data.message || '连接成功' })
    setTesting(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">LDAP 目录服务配置</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} className="rounded" />
            {config.enabled ? <span className="text-green-600">已启用</span> : <span className="text-gray-400">已禁用</span>}
          </label>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2"><label className="block text-xs font-medium mb-1">LDAP 服务器地址</label><input value={config.url} onChange={e => setConfig({ ...config, url: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ldap://ad.company.com:389" /></div>
          <div className="col-span-2"><label className="block text-xs font-medium mb-1">Base DN（搜索起点）</label><input value={config.baseDN} onChange={e => setConfig({ ...config, baseDN: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="dc=company,dc=com" /></div>
          <div><label className="block text-xs font-medium mb-1">绑定DN（可选）</label><input value={config.bindDN} onChange={e => setConfig({ ...config, bindDN: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="cn=admin,dc=company,dc=com" /></div>
          <div><label className="block text-xs font-medium mb-1">绑定密码</label><input type="password" value={config.bindPass} onChange={e => setConfig({ ...config, bindPass: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="留空不修改" /></div>
          <div className="col-span-2"><label className="block text-xs font-medium mb-1">用户搜索过滤器</label><input value={config.filter} onChange={e => setConfig({ ...config, filter: e.target.value })} className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="(sAMAccountName={{username}})" /></div>
        </div>
        {message && <div className={classNames('text-sm p-3 rounded-lg', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>{message.text}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving} className="px-8 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">{saving ? '保存中...' : '保存配置'}</button>
          <button onClick={test} disabled={testing} className="px-8 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">{testing ? '测试中...' : '测试连接'}</button>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📖 LDAP 配置帮助</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm text-blue-800">
          <div>
            <div className="font-medium mb-1">LDAP 服务器地址</div>
            <p className="text-xs text-blue-600">格式：<code>ldap://主机名:端口</code> 或 <code>ldaps://主机名:636</code>。Active Directory 默认端口 389，LDAPS 端口 636。</p>
          </div>
          <div>
            <div className="font-medium mb-1">Base DN</div>
            <p className="text-xs text-blue-600">LDAP 目录的搜索起点。例如 <code>dc=company,dc=com</code> 或 <code>ou=Users,dc=company,dc=com</code>。</p>
          </div>
          <div>
            <div className="font-medium mb-1">绑定DN</div>
            <p className="text-xs text-blue-600">用于连接 LDAP 的管理账号。格式如 <code>cn=admin,dc=company,dc=com</code>。如果 LDAP 允许匿名查询，可留空。</p>
          </div>
          <div>
            <div className="font-medium mb-1">用户搜索过滤器</div>
            <p className="text-xs text-blue-600">用于查找用户的 LDAP 过滤器。<code>{`{{username}}`}</code> 会被替换为登录用户名。Active Directory 常用：<code>(sAMAccountName={'{{username}}'})</code>，OpenLDAP 常用：<code>(uid={'{{username}}'})</code>。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
