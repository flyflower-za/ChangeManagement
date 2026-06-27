import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      assignments: { include: { module: { select: { id: true, name: true } } } },
      lines: { include: { module: { select: { id: true, name: true } } } },
    },
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: '产品名称为必填项' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      name: body.name, code: body.code || null,
      description: body.description || '',
      sortOrder: await prisma.product.count() + 1,
    }
  })

  // Create department assignments
  if (body.assignments?.length > 0) {
    for (const a of body.assignments) {
      if (a.moduleId && a.person?.trim()) {
        await prisma.productAssignment.create({
          data: { productId: product.id, moduleId: a.moduleId, person: a.person.trim() }
        })
      }
    }
  }

  const full = await prisma.product.findUnique({
    where: { id: product.id },
    include: { assignments: { include: { module: { select: { id: true, name: true } } } } }
  })
  return NextResponse.json(full, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const body = await req.json()
  const { id, name, code, description, assignments } = body

  await prisma.product.update({ where: { id }, data: { name, code, description } })

  if (assignments) {
    await prisma.productAssignment.deleteMany({ where: { productId: id } })
    for (const a of assignments) {
      if (a.moduleId && a.person?.trim()) {
        await prisma.productAssignment.create({
          data: { productId: id, moduleId: a.moduleId, person: a.person.trim() }
        })
      }
    }
  }

  const full = await prisma.product.findUnique({
    where: { id },
    include: { assignments: { include: { module: { select: { id: true, name: true } } } } }
  })
  return NextResponse.json(full)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const { id } = await req.json()
  await prisma.productAssignment.deleteMany({ where: { productId: id } })
  await prisma.productionLine.updateMany({ where: { productId: id }, data: { productId: null } })
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
