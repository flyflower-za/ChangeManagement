import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const lines = await prisma.productionLine.findMany({
    include: {
      module: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: [{ module: { name: 'asc' } }, { sortOrder: 'asc' }],
  })
  return NextResponse.json(lines)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.moduleId || !body.name?.trim()) {
    return NextResponse.json({ error: '部门和名称为必填项' }, { status: 400 })
  }

  const line = await prisma.productionLine.create({
    data: {
      moduleId: body.moduleId, name: body.name,
      code: body.code || null,
      productId: body.productId || null,
      sortOrder: await prisma.productionLine.count({ where: { moduleId: body.moduleId } }) + 1,
    }
  })

  const full = await prisma.productionLine.findUnique({
    where: { id: line.id },
    include: { module: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } }
  })
  return NextResponse.json(full, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { id, name, code, moduleId, productId } = body

  await prisma.productionLine.update({
    where: { id },
    data: { name, code, moduleId, productId: productId || null }
  })

  const full = await prisma.productionLine.findUnique({
    where: { id },
    include: { module: { select: { id: true, name: true } }, product: { select: { id: true, name: true } } }
  })
  return NextResponse.json(full)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })
  const { id } = await req.json()
  await prisma.productionLine.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
