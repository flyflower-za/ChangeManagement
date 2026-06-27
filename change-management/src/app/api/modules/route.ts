import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canEditModule, getPermissionError } from '@/lib/permissions'

export async function GET() {
  const modules = await prisma.module.findMany({
    where: { isActive: true },
    include: {
      manager: true,
      templates: { include: { items: { orderBy: { sortOrder: 'asc' } } } },
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
  const mod = await prisma.module.create({
    data: {
      name: body.name,
      description: body.description,
      managerId: body.managerId || null,
    },
  })
  return NextResponse.json(mod, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: getPermissionError('login_required') }, { status: 401 })
  }

  const body = await req.json()
  const { id, name, description, managerId, currentManagerId } = body

  // 检查用户是否可以编辑此模块
  const hasPermission = await canEditModule(user.id, id)
  if (!hasPermission) {
    return NextResponse.json({
      error: getPermissionError('edit_module')
    }, { status: 403 })
  }

  // 只有管理员可以更改负责人分配
  if (managerId && managerId !== currentManagerId) {
    if (user.role !== 'admin') {
      return NextResponse.json({
        error: getPermissionError('assign_manager')
      }, { status: 403 })
    }
  }

  const updated = await prisma.module.update({
    where: { id },
    data: {
      name,
      description,
      managerId: managerId || null
    },
    include: { manager: true }
  })

  return NextResponse.json(updated)
}
