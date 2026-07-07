import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json(templates)
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { key, name, subject, body: htmlBody } = body

  if (!key) return NextResponse.json({ error: '模板标识不可为空' }, { status: 400 })

  const existing = await prisma.emailTemplate.findUnique({ where: { key } })
  let tpl
  if (existing) {
    tpl = await prisma.emailTemplate.update({
      where: { key },
      data: { name, subject, body: htmlBody },
    })
  } else {
    tpl = await prisma.emailTemplate.create({
      data: { key, name, subject, body: htmlBody },
    })
  }
  return NextResponse.json(tpl)
}

export async function POST(req: NextRequest) {
  // Reset to default
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { key } = body
  if (!key) return NextResponse.json({ error: '缺少key' }, { status: 400 })

  await prisma.emailTemplate.deleteMany({ where: { key } })
  return NextResponse.json({ ok: true })
}
