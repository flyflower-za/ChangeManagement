import { prisma } from '@/lib/db'
import nodemailer from 'nodemailer'

let transporter: any = null
let lastConfigId: string | null = null

// Get custom template if exists, otherwise use default
async function getTemplate(key: string, defaultSubject: string, defaultBody: string) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { key } })
  return {
    subject: tpl?.subject || defaultSubject,
    body: tpl?.body || defaultBody,
  }
}

async function getTransporter() {
  const config = await prisma.smtpConfig.findFirst()
  if (!config || !config.enabled) return null

  // Reuse transporter if config hasn't changed
  if (transporter && lastConfigId === config.id) return transporter

  const auth: any = { user: config.user }
  if (config.pass) auth.pass = config.pass

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.encryption === 'ssl',
    requireTLS: config.encryption === 'tls',
    auth: config.pass ? auth : undefined,
  })
  lastConfigId = config.id
  return transporter
}

export async function sendEmail(to: string[], subject: string, html: string) {
  try {
    const t = await getTransporter()
    if (!t) { console.log('[Notify] SMTP not configured, skip:', subject); return }
    const config = await prisma.smtpConfig.findFirst()
    const from = config?.user || 'noreply@company.com'
    await t.sendMail({ from, to: to.join(','), subject, html })
    console.log('[Notify] Sent:', subject, '→', to.join(', '))
  } catch (e) {
    console.error('[Notify] Failed:', subject, e)
  }
}

// ====== Notification Functions ======

/** 变更创建 - 通知所有相关人员 */
export async function notifyChangeCreated(changeId: string) {
  const change = await prisma.changeProject.findUnique({
    where: { id: changeId },
    include: {
      initiator: true,
      modules: { include: { approver: true, module: true } },
    },
  })
  if (!change) return

  const recipients = new Set<string>()
  // Notify initiator
  if (change.initiator?.email) recipients.add(change.initiator.email)
  // Notify all approvers
  for (const cm of change.modules) {
    if (cm.approver?.email) recipients.add(cm.approver.email)
  }

  const to = [...recipients]
  if (to.length === 0) return

  const deptList = change.modules.map(m => m.module.name).join('、')
  const deadline = change.plannedEnd ? new Date(change.plannedEnd).toLocaleDateString('zh-CN') : '未设置'
  const serial = (change as any).serial || change.id.slice(-6)
  const appUrl = process.env.APP_URL || 'http://localhost:3000'

  const defaultSubject = `【变更通知】#${serial} ${change.title}`
  const defaultBody = `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#1a73e8">📋 新变更项目已创建</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;color:#666;width:80px">编号</td><td style="padding:8px">#${serial}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">标题</td><td style="padding:8px;font-weight:bold">${change.title}</td></tr>
        <tr><td style="padding:8px;color:#666">描述</td><td style="padding:8px">${change.description || '-'}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">发起人</td><td style="padding:8px">${change.initiator?.name}</td></tr>
        <tr><td style="padding:8px;color:#666">涉及部门</td><td style="padding:8px">${deptList}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">截止时间</td><td style="padding:8px">${deadline}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${appUrl}/changes/${change.id}" style="background:#1a73e8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">查看详情 →</a></p>
    </div>`

  const tpl = await getTemplate('change_created', defaultSubject, defaultBody)
  await sendEmail(to, tpl.subject, tpl.body)
}

/** 模块审批提醒 - 部门所有检查项完成时通知审批人 */
export async function notifyModuleReadyForApproval(changeModuleId: string) {
  const cm = await prisma.changeModule.findUnique({
    where: { id: changeModuleId },
    include: {
      approver: true,
      module: true,
      changeProject: { include: { initiator: true } },
      items: true,
    },
  })
  if (!cm || !cm.approver?.email) return

  await sendEmail([cm.approver.email],
    `【审批提醒】${cm.module.name} 检查项已完成 - ${cm.changeProject.title}`,
    `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#e67e22">⏳ 等待审批</h2>
      <p>「${cm.module.name}」的所有检查项已执行完毕，请审批。</p>
      <p style="color:#666">变更: ${cm.changeProject.title}</p>
      <p style="color:#666">检查项: ${cm.items.length} 项</p>
      <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${cm.changeProject.id}" style="background:#e67e22;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">去审批 →</a></p>
    </div>`)
}

/** 截止日期提醒 - 7天/3天 */
export async function notifyDeadlineApproaching(daysLeft: number) {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + daysLeft)
  const dayStart = new Date(deadline)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(deadline)
  dayEnd.setHours(23, 59, 59, 999)

  // Find changes ending on the target date, not yet completed/cancelled
  const changes = await prisma.changeProject.findMany({
    where: {
      plannedEnd: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
    include: {
      initiator: true,
      modules: { include: { approver: true, items: true } },
    },
  })

  for (const c of changes) {
    const recipients = new Set<string>()
    if (c.initiator?.email) recipients.add(c.initiator.email)
    for (const cm of c.modules) {
      const hasPending = cm.items.some(i => i.status !== 'DONE' && i.status !== 'NOT_APPLICABLE')
      if (hasPending && cm.approver?.email) recipients.add(cm.approver.email)
    }
    const to = [...recipients]
    if (to.length === 0) continue

    const doneCount = c.modules.reduce((s, m) => s + m.items.filter(i => i.status === 'DONE').length, 0)
    const allCount = c.modules.reduce((s, m) => s + m.items.length, 0)

    await sendEmail(to,
      `【⏰ 即将到期】#${(c as any).serial || c.id.slice(-6)} ${c.title} - 剩余${daysLeft}天`,
      `<div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:${daysLeft <= 3 ? '#e74c3c' : '#e67e22'}">⏰ 截止日期提醒</h2>
        <p>变更「${c.title}」将在 <b>${daysLeft}天</b>后到期。</p>
        <p style="color:#666">进度: ${doneCount}/${allCount} 项已完成</p>
        <p style="color:#666">截止: ${new Date(c.plannedEnd!).toLocaleDateString('zh-CN')}</p>
        <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${c.id}" style="background:${daysLeft <= 3 ? '#e74c3c' : '#e67e22'};color:white;padding:10px 20px;border-radius:6px;text-decoration:none">查看详情 →</a></p>
      </div>`)
  }
}

/** 变更审批通过/驳回通知发起人 */
export async function notifyApprovalResult(changeId: string, moduleName: string, approved: boolean) {
  const change = await prisma.changeProject.findUnique({
    where: { id: changeId },
    include: { initiator: true },
  })
  if (!change?.initiator?.email) return

  await sendEmail([change.initiator.email],
    `【${approved ? '审批通过' : '审批驳回'}】${moduleName} - ${change.title}`,
    `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:${approved ? '#27ae60' : '#e74c3c'}">${approved ? '✅ 审批通过' : '❌ 审批驳回'}</h2>
      <p>变更「${change.title}」的模块「${moduleName}」已被${approved ? '通过' : '驳回'}。</p>
      <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${change.id}" style="background:#1a73e8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">查看详情 →</a></p>
    </div>`)
}

/** 检查项被单项驳回 - 通知执行人 */
export async function notifyItemRejected(itemId: string, rejectReason: string) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: {
      executor: true,
      changeModule: { include: { module: true, changeProject: true } },
    },
  })
  if (!item?.executor?.email) return

  await sendEmail([item.executor.email],
    `【❌ 检查项驳回】${item.title} - ${item.changeModule.changeProject.title}`,
    `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#e74c3c">❌ 检查项需重做</h2>
      <p>您在「${item.changeModule.module.name}」中负责的检查项被驳回：</p>
      <table style="border-collapse:collapse;width:100%">
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666;width:60px">检查项</td><td style="padding:8px;font-weight:bold">${item.title}</td></tr>
        <tr><td style="padding:8px;color:#666">驳回理由</td><td style="padding:8px;color:#e74c3c">${rejectReason}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">变更项目</td><td style="padding:8px">${item.changeModule.changeProject.title}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${item.changeModule.changeProject.id}" style="background:#e74c3c;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">去重新执行 →</a></p>
    </div>`)
}

/** 检查项分配 - 通知执行人 */
export async function notifyItemAssigned(itemId: string) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: {
      executor: true,
      changeModule: { include: { module: true, changeProject: true } },
    },
  })
  if (!item?.executor?.email) return

  await sendEmail([item.executor.email],
    `【📋 新任务分配】${item.title} - ${item.changeModule.changeProject.title}`,
    `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#1a73e8">📋 您有新任务</h2>
      <p>您被分配了「${item.changeModule.module.name}」中的一个检查项：</p>
      <table style="border-collapse:collapse;width:100%">
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666;width:60px">检查项</td><td style="padding:8px;font-weight:bold">${item.title}</td></tr>
        <tr><td style="padding:8px;color:#666">部门</td><td style="padding:8px">${item.changeModule.module.name}</td></tr>
        <tr style="background:#f5f5f5"><td style="padding:8px;color:#666">变更项目</td><td style="padding:8px">${item.changeModule.changeProject.title}</td></tr>
      </table>
      <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${item.changeModule.changeProject.id}" style="background:#1a73e8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">去执行 →</a></p>
    </div>`)
}

/** 变更全部完成 - 通知所有参与人员 */
export async function notifyChangeCompleted(changeId: string) {
  const change = await prisma.changeProject.findUnique({
    where: { id: changeId },
    include: {
      initiator: true,
      modules: { include: { approver: true, items: { include: { executor: true } } } },
    },
  })
  if (!change) return

  const recipients = new Set<string>()
  if (change.initiator?.email) recipients.add(change.initiator.email)
  for (const cm of change.modules) {
    if (cm.approver?.email) recipients.add(cm.approver.email)
    for (const item of cm.items) {
      if (item.executor?.email) recipients.add(item.executor.email)
    }
  }
  const to = [...recipients]
  if (to.length === 0) return

  await sendEmail(to,
    `【✅ 变更完成】#${(change as any).serial || change.id.slice(-6)} ${change.title}`,
    `<div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#27ae60">✅ 变更项目已完成</h2>
      <p>变更「${change.title}」所有模块已审批通过，项目顺利完成。</p>
      <p style="color:#666">完成时间: ${new Date(change.completedAt!).toLocaleString('zh-CN')}</p>
      <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/changes/${change.id}" style="background:#27ae60;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">查看详情 →</a></p>
    </div>`)
}

/** 每日/每周汇总 */
export async function notifyDigest(period: 'daily' | 'weekly') {
  const changes = await prisma.changeProject.findMany({
    where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] } },
    include: { initiator: true, modules: { include: { approver: true, items: true, module: true } } },
  })

  const approverMap = new Map<string, { email: string; name: string; modules: any[] }>()
  for (const c of changes) {
    for (const cm of c.modules) {
      if (!cm.approver?.email) continue
      const key = cm.approver.email
      if (!approverMap.has(key)) approverMap.set(key, { email: key, name: cm.approver.name, modules: [] })
      const pendingItems = cm.items.filter(i => i.status !== 'DONE' && i.status !== 'NOT_APPLICABLE')
      if (pendingItems.length > 0 || cm.status === 'REVIEWING') {
        approverMap.get(key)!.modules.push({
          projectTitle: c.title, projectId: c.id, moduleName: cm.module.name,
          status: cm.status, pendingCount: pendingItems.length, totalCount: cm.items.length, deadline: c.plannedEnd,
        })
      }
    }
  }

  const label = period === 'daily' ? '每日' : '每周'
  for (const [email, info] of approverMap) {
    if (info.modules.length === 0) continue
    const rows = info.modules.map(m => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${m.projectTitle}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${m.moduleName}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;color:${m.status === 'REVIEWING' ? '#e67e22' : '#3498db'}">${m.status === 'REVIEWING' ? '待审批' : '待执行(' + m.pendingCount + '/' + m.totalCount + ')'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${m.deadline ? new Date(m.deadline).toLocaleDateString('zh-CN') : '-'}</td>
    </tr>`).join('')

    await sendEmail([email],
      `【📊 ${label}汇总】您有 ${info.modules.length} 个待处理事项`,
      `<div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#1a73e8">📊 ${label}待办汇总</h2>
        <p>${info.name}，以下是与您相关的待处理事项：</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <thead><tr style="background:#f5f5f5;text-align:left">
            <th style="padding:8px">变更项目</th><th style="padding:8px">部门</th><th style="padding:8px">状态</th><th style="padding:8px">截止</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px"><a href="${process.env.APP_URL || 'http://localhost:3000'}/my-tasks" style="background:#1a73e8;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">查看我的待办 →</a></p>
      </div>`)
  }
}
