import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const lines = await prisma.productLine.findMany({
    include: {
      module: { select: { id: true, name: true } },
      contacts: { orderBy: { sortOrder: 'asc' } },
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
  const { moduleId, name, person } = body

  if (!moduleId || !name?.trim()) {
    return NextResponse.json({ error: '部门ID和产品线名称为必填项' }, { status: 400 })
  }

  const pl = await prisma.productLine.create({
    data: {
      moduleId,
      name: name.trim(),
      description: '',
      sortOrder: await prisma.productLine.count({ where: { moduleId } }) + 1,
    }
  })

  if (person?.trim()) {
    await prisma.productLineContact.create({
      data: { productLineId: pl.id, name: person.trim(), title: '负责人', sortOrder: 1 }
    })
  }

  const full = await prisma.productLine.findUnique({
    where: { id: pl.id },
    include: { module: { select: { id: true, name: true } }, contacts: true }
  })

  return NextResponse.json(full, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { id, name, person } = body

  if (!id || !name?.trim()) {
    return NextResponse.json({ error: '产品线ID和名称为必填项' }, { status: 400 })
  }

  await prisma.productLine.update({
    where: { id },
    data: { name: name.trim() }
  })

  // Update or create contact
  if (person?.trim()) {
    const existing = await prisma.productLineContact.findFirst({ where: { productLineId: id } })
    if (existing) {
      await prisma.productLineContact.update({
        where: { id: existing.id },
        data: { name: person.trim() }
      })
    } else {
      await prisma.productLineContact.create({
        data: { productLineId: id, name: person.trim(), title: '负责人', sortOrder: 1 }
      })
    }
  }

  const full = await prisma.productLine.findUnique({
    where: { id },
    include: { module: { select: { id: true, name: true } }, contacts: true }
  })

  return NextResponse.json(full)
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const { id } = body

  await prisma.productLineContact.deleteMany({ where: { productLineId: id } })
  await prisma.productLine.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
