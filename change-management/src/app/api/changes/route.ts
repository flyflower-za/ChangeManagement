import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const changes = await prisma.changeProject.findMany({
    where: status && status !== 'all' ? { status } : {},
    include: {
      initiator: true,
      modules: {
        include: {
          module: true,
          approver: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = changes.map(c => ({
    ...c,
    progress: {
      total: c.modules.reduce((sum, m) => sum + m.items.length, 0),
      done: c.modules.reduce((sum, m) => sum + m.items.filter(i => i.status === 'done').length, 0),
    },
    moduleProgress: c.modules.map(m => ({
      id: m.id,
      name: m.module.name,
      status: m.status,
      total: m.items.length,
      done: m.items.filter(i => i.status === 'done').length,
    })),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const body = await req.json()
  const { title, description, priority, plannedStart, plannedEnd, moduleIds } = body

  // Create the change project
  const change = await prisma.changeProject.create({
    data: {
      title,
      description,
      priority: priority || 'medium',
      status: 'PENDING',
      plannedStart: plannedStart ? new Date(plannedStart) : null,
      plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
      createdById: user.id,
    },
  })

  // For each selected module, find its template and instantiate checklist items
  for (const moduleId of moduleIds || []) {
    const template = await prisma.checklistTemplate.findFirst({
      where: { moduleId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })

    const module_ = await prisma.module.findUnique({ where: { id: moduleId } })

    const changeModule = await prisma.changeModule.create({
      data: {
        changeProjectId: change.id,
        moduleId,
        approverId: module_?.managerId || null,
        status: 'PENDING',
      },
    })

    if (template) {
      for (const def of template.items) {
        await prisma.checklistItem.create({
          data: {
            changeModuleId: changeModule.id,
            title: def.title,
            description: def.description,
            expectedResult: def.expectedResult,
            evidenceType: def.evidenceType,
            isRequired: def.isRequired,
            executorId: def.defaultExecutorId,
            sortOrder: def.sortOrder,
          }
        })
      }
    }
  }

  // Update status to executing
  await prisma.changeProject.update({
    where: { id: change.id },
    data: { status: 'EXECUTING' },
  })

  return NextResponse.json(change, { status: 201 })
}
