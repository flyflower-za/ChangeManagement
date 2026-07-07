import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, departmentId: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: '只有管理员可以创建用户' }, { status: 403 })
  }

  const body = await req.json()
  const { username, name, email, password, role, departmentId } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: '姓名、邮箱和密码为必填项' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username: username || null, name, email, password: hashedPassword, role: role || 'executor', departmentId: departmentId || null },
    select: { id: true, username: true, name: true, email: true, role: true, departmentId: true, createdAt: true },
  })

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: '只有管理员可以编辑用户' }, { status: 403 })
  }

  const body = await req.json()
  const { id, username, name, email, password, role, departmentId } = body

  if (!id || !name || !email) {
    return NextResponse.json({ error: 'ID、姓名和邮箱为必填项' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: { email, id: { not: id } }
  })
  if (existing) {
    return NextResponse.json({ error: '该邮箱已被其他用户占用' }, { status: 400 })
  }

  const updateData: any = { username: username || null, name, email, role, departmentId: departmentId || null }
  if (password) {
    updateData.password = await bcrypt.hash(password, 10)
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, email: true, role: true, departmentId: true, createdAt: true },
  })

  return NextResponse.json(user)
}
