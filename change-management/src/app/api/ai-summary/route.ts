import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { changeModuleId } = await req.json()
  if (!changeModuleId) return NextResponse.json({ error: '缺少模块ID' }, { status: 400 })

  // Get AI config
  const aiConfig = await prisma.aiConfig.findFirst()
  if (!aiConfig?.enabled || !aiConfig.apiKey) {
    return NextResponse.json({ error: 'AI未配置或未启用' }, { status: 400 })
  }

  // Gather data for the summary
  const cm = await prisma.changeModule.findUnique({
    where: { id: changeModuleId },
    include: {
      module: true,
      changeProject: { include: { initiator: true } },
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { executor: true, attachments: true },
      },
    },
  })
  if (!cm) return NextResponse.json({ error: '模块不存在' }, { status: 404 })

  // Build context for AI
  const itemsList = cm.items.map((item, i) => {
    const status = item.status === 'DONE' ? '已完成' :
      item.status === 'NOT_APPLICABLE' ? '不涉及' :
      item.status === 'REJECTED' ? '已驳回' : '待执行'
    const evidence = item.evidenceNotes || (item.attachments?.length > 0 ? `(有${item.attachments.length}个附件)` : '无')
    const executor = item.executor?.name || '未分配'
    return `${i + 1}. [${status}] ${item.title}\n   描述: ${item.description || '无'}\n   证据: ${evidence}\n   执行人: ${executor}${item.rejectReason ? `\n   驳回理由: ${item.rejectReason}` : ''}`
  }).join('\n\n')

  const summary = `变更项目: ${cm.changeProject.title}
发起人: ${cm.changeProject.initiator?.name || '未知'}
部门模块: ${cm.module.name}
检查项总数: ${cm.items.length}
已完成: ${cm.items.filter(i => i.status === 'DONE').length}
不涉及: ${cm.items.filter(i => i.status === 'NOT_APPLICABLE').length}
已驳回: ${cm.items.filter(i => i.status === 'REJECTED').length}
待执行: ${cm.items.filter(i => i.status === 'PENDING').length}

检查项详情:
${itemsList}`

  const prompt = `你是一个变更管理系统的审批助手。请根据以下变更检查项的执行结果，生成一份简洁的审批前摘要（200字以内），包括：
1. 整体执行情况概述
2. 需要审批人关注的风险点（如有驳回项、未完成项等）
3. 审批建议（建议通过/需关注/建议驳回）

注意：只需1句话的标题+2-3句话的关键信息，不要长篇大论。保持客观，只说事实。\n\n${summary}`

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    if (data.error) {
      console.error('AI API error:', data.error)
      return NextResponse.json({ error: `AI调用失败: ${data.error.message || '未知错误'}` }, { status: 500 })
    }

    const result = data.choices?.[0]?.message?.content || 'AI未能生成摘要'
    return NextResponse.json({ summary: result })
  } catch (e: any) {
    console.error('AI summary error:', e)
    return NextResponse.json({ error: `请求失败: ${e.message}` }, { status: 500 })
  }
}
