import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { getAppSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    return NextResponse.json({ error: '用户不存在或密码错误' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return NextResponse.json({ error: '用户不存在或密码错误' }, { status: 401 })
  }

  const session = await getAppSession()
  session.id = user.id
  session.name = user.name
  session.email = user.email
  session.role = user.role
  await session.save()

  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role })
}

export async function DELETE() {
  const session = await getAppSession()
  session.destroy()
  return NextResponse.json({ ok: true })
}
