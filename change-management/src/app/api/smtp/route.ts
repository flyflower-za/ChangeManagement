import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const config = await prisma.smtpConfig.findFirst({
    select: { id: true, host: true, port: true, user: true, encryption: true, enabled: true }
  })
  return NextResponse.json(config || { host: '', port: 587, user: '', encryption: 'none', enabled: false })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { host, port, user: smtpUser, pass, encryption, enabled } = body

  const existing = await prisma.smtpConfig.findFirst()
  let config
  if (existing) {
    config = await prisma.smtpConfig.update({
      where: { id: existing.id },
      data: { host, port: Number(port), user: smtpUser, pass: pass || existing.pass, encryption, enabled },
    })
  } else {
    config = await prisma.smtpConfig.create({
      data: { host, port: Number(port), user: smtpUser, pass: pass || '', encryption, enabled },
    })
  }
  return NextResponse.json({ ok: true, host: config.host, port: config.port, user: config.user, encryption: config.encryption, enabled: config.enabled })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { host, port, user: smtpUser, pass, encryption } = body

  try {
    const auth: any = { user: smtpUser }
    if (pass) auth.pass = pass
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      host, port: Number(port),
      secure: encryption === 'ssl',
      requireTLS: encryption === 'tls',
      auth: pass ? auth : undefined,
    })
    await transporter.sendMail({
      from: smtpUser,
      to: smtpUser,
      subject: '【变更管理系统】SMTP 测试邮件',
      html: '<p>如果您收到此邮件，说明 SMTP 配置成功！</p>',
    })
    return NextResponse.json({ ok: true, message: '测试邮件发送成功' })
  } catch (e: any) {
    return NextResponse.json({ error: `发送失败: ${e.message}` }, { status: 500 })
  }
}
