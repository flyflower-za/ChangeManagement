import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const groups = await prisma.permissionGroup.findMany({
    include: { members: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: '组名为必填' }, { status: 400 })

  const g = await prisma.permissionGroup.create({
    data: { name: body.name, description: body.description || '', role: body.role || 'executor' },
  })
  return NextResponse.json(g, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const { id } = await req.json()
  await prisma.user.updateMany({ where: { groupId: id }, data: { groupId: null } })
  await prisma.permissionGroup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
