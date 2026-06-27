import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canManageTemplates, getPermissionError } from '@/lib/permissions'

export async function GET() {
  const templates = await prisma.checklistTemplate.findMany({
    include: {
      module: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: getPermissionError('login_required') }, { status: 401 })
  }

  const body = await req.json()
  const { moduleId, name, description, items, createdBy } = body

  // 检查用户是否可以管理此模块的模板
  const hasPermission = await canManageTemplates(user.id, moduleId)
  if (!hasPermission) {
    return NextResponse.json({
      error: getPermissionError('manage_templates')
    }, { status: 403 })
  }

  const template = await prisma.checklistTemplate.create({
    data: {
      moduleId,
      name,
      description,
      createdBy: createdBy || null,
      items: {
        create: (items || []).map((item: any, idx: number) => ({
          title: item.title,
          description: item.description || '',
          expectedResult: item.expectedResult || '',
          evidenceType: item.evidenceType || 'text',
          isRequired: item.isRequired ?? true,
          defaultExecutorId: item.defaultExecutorId || null,
          sortOrder: item.sortOrder ?? idx + 1,
        })),
      },
    },
    include: { items: true },
  })

  return NextResponse.json(template, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: getPermissionError('login_required') }, { status: 401 })
  }

  const body = await req.json()
  const { id, name, description, items } = body

  // 首先获取模板以检查它属于哪个模块
  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    select: { moduleId: true }
  })

  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 })
  }

  // 检查权限
  const hasPermission = await canManageTemplates(user.id, template.moduleId)
  if (!hasPermission) {
    return NextResponse.json({
      error: getPermissionError('manage_templates')
    }, { status: 403 })
  }

  // 删除现有项目并重新创建
  await prisma.checklistItemDef.deleteMany({ where: { templateId: id } })

  const updatedTemplate = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      name,
      description,
      items: {
        create: (items || []).map((item: any, idx: number) => ({
          title: item.title,
          description: item.description || '',
          expectedResult: item.expectedResult || '',
          evidenceType: item.evidenceType || 'text',
          isRequired: item.isRequired ?? true,
          defaultExecutorId: item.defaultExecutorId || null,
          sortOrder: item.sortOrder ?? idx + 1,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })

  return NextResponse.json(updatedTemplate)
}
