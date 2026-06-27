import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canEditModule, getPermissionError } from '@/lib/permissions'

export async function GET() {
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    include: {
      factory: true,
      manager: true,
      templates: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
      contacts: { orderBy: { sortOrder: 'asc' } },
      productionLines: {
        orderBy: { sortOrder: 'asc' },
        include: { product: true },
      },
      productAssignments: {
        include: { product: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(modules)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '部门名称为必填项' }, { status: 400 })
  }

  const factory = await prisma.factory.findFirst()
  const mod = await prisma.module.create({
    data: {
      factoryId: body.factoryId || factory?.id || '',
      name: body.name,
      description: body.description || '',
      managerId: body.managerId || null,
    },
  })

  // Handle production lines
  if (body.productLines?.length > 0) {
    for (let i = 0; i < body.productLines.length; i++) {
      const pl = body.productLines[i]
      if (pl.name?.trim()) {
        await prisma.productionLine.create({
          data: { moduleId: mod.id, name: pl.name, code: pl.code || null, sortOrder: i + 1 }
        })
      }
    }
  }

  const full = await prisma.module.findUnique({
    where: { id: mod.id },
    include: { factory: true, manager: true, productionLines: true }
  })
  return NextResponse.json(full, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { id, name, description, managerId, currentManagerId } = body

  const hasPermission = await canEditModule(user.id, id)
  if (!hasPermission) return NextResponse.json({ error: getPermissionError('edit_module') }, { status: 403 })

  if (managerId && managerId !== currentManagerId && user.role !== 'admin') {
    return NextResponse.json({ error: getPermissionError('assign_manager') }, { status: 403 })
  }

  const updated = await prisma.module.update({
    where: { id },
    data: { name, description, managerId: managerId || null },
    include: { manager: true, factory: true }
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '只有管理员可以删除部门' }, { status: 403 })
  }
  const { id } = await req.json()
  await prisma.productAssignment.deleteMany({ where: { moduleId: id } })
  await prisma.productionLine.deleteMany({ where: { moduleId: id } })
  await prisma.departmentContact.deleteMany({ where: { moduleId: id } })
  const tpls = await prisma.checklistTemplate.findMany({ where: { moduleId: id } })
  for (const t of tpls) { await prisma.checklistItemDef.deleteMany({ where: { templateId: t.id } }) }
  await prisma.checklistTemplate.deleteMany({ where: { moduleId: id } })
  await prisma.module.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
