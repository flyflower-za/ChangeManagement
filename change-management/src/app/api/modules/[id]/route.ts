import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canEditModule, getPermissionError } from '@/lib/permissions'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUser()

  const module = await prisma.module.findUnique({
    where: { id },
    include: {
      manager: true,
      templates: {
        include: { items: { orderBy: { sortOrder: 'asc' } } }
      }
    }
  })

  if (!module) {
    return NextResponse.json({ error: '模块不存在' }, { status: 404 })
  }

  // 添加权限信息供UI使用
  const canEdit = user ? await canEditModule(user.id, id) : false
  const cannotChangeManager = user?.role !== 'admin'

  return NextResponse.json({
    ...module,
    _permissions: {
      canEdit,
      cannotChangeManager
    }
  })
}
