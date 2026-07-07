export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string | null) {
  if (!date) return '-'
  const d = new Date(date)

  // 手动格式化以确保服务端和客户端一致
  const pad = (n: number) => n.toString().padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hour = pad(d.getHours())
  const minute = pad(d.getMinutes())

  return `${year}/${month}/${day} ${hour}:${minute}`
}

export function priorityConfig(priority: string) {
  switch (priority) {
    case 'critical': return { label: '紧急', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' }
    case 'high': return { label: '高', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' }
    case 'medium': return { label: '中', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
    case 'low': return { label: '低', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' }
    default: return { label: priority, color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' }
  }
}

export function statusConfig(status: string) {
  switch (status) {
    // ChangeProject 状态
    case 'DRAFT': return { label: '草稿', color: 'bg-gray-100 text-gray-600' }
    case 'PENDING': return { label: '待执行', color: 'bg-blue-100 text-blue-700' }
    case 'EXECUTING': return { label: '执行中', color: 'bg-amber-100 text-amber-700' }
    case 'APPROVING': return { label: '待审批', color: 'bg-purple-100 text-purple-700' }
    case 'COMPLETED': return { label: '已完成', color: 'bg-green-100 text-green-700' }
    case 'CANCELLED': return { label: '已取消', color: 'bg-gray-100 text-gray-500' }
    // ChangeModule 状态
    case 'REVIEWING': return { label: '待审批', color: 'bg-purple-100 text-purple-700' }
    case 'APPROVED': return { label: '已通过', color: 'bg-green-100 text-green-700' }
    case 'REJECTED': return { label: '已驳回', color: 'bg-red-100 text-red-700' }
    // ChecklistItem 状态
    case 'IN_PROGRESS': return { label: '进行中', color: 'bg-amber-100 text-amber-700' }
    case 'DONE': return { label: '已完成', color: 'bg-green-100 text-green-700' }
    case 'NOT_APPLICABLE': return { label: '不涉及', color: 'bg-gray-300 text-gray-600' }
    // 兼容旧状态
    case 'draft': return { label: '草稿', color: 'bg-gray-100 text-gray-600' }
    case 'active': return { label: '待执行', color: 'bg-blue-100 text-blue-700' }
    case 'executing': return { label: '执行中', color: 'bg-amber-100 text-amber-700' }
    case 'reviewing': return { label: '审批中', color: 'bg-purple-100 text-purple-700' }
    case 'completed': return { label: '已完成', color: 'bg-green-100 text-green-700' }
    case 'rejected': return { label: '已驳回', color: 'bg-red-100 text-red-700' }
    case 'pending': return { label: '待执行', color: 'bg-gray-100 text-gray-600' }
    case 'in_progress': return { label: '进行中', color: 'bg-amber-100 text-amber-700' }
    case 'done': return { label: '已完成', color: 'bg-green-100 text-green-700' }
    case 'not_applicable': return { label: '不涉及', color: 'bg-gray-300 text-gray-600' }
    case 'approved': return { label: '已通过', color: 'bg-green-100 text-green-700' }
    default: return { label: status, color: 'bg-gray-100 text-gray-600' }
  }
}

export function evidenceTypeLabel(type: string) {
  switch (type) {
    case 'screenshot': return '截图'
    case 'log': return '日志'
    case 'config': return '配置文件'
    default: return '文字说明'
  }
}
