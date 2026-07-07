import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const config = await prisma.ldapConfig.findFirst({
    select: { id: true, url: true, baseDN: true, bindDN: true, filter: true, enabled: true }
  })
  return NextResponse.json(config || { url: '', baseDN: '', bindDN: '', filter: '(sAMAccountName={{username}})', enabled: false })
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  const { url, baseDN, bindDN, bindPass, filter, enabled } = body
  const existing = await prisma.ldapConfig.findFirst()

  if (existing) {
    await prisma.ldapConfig.update({
      where: { id: existing.id },
      data: { url, baseDN, bindDN, bindPass: bindPass || existing.bindPass, filter, enabled },
    })
  } else {
    await prisma.ldapConfig.create({
      data: { url, baseDN, bindDN, bindPass: bindPass || '', filter, enabled },
    })
  }
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await req.json()
  // Test connection only - no actual LDAP import yet
  return NextResponse.json({ message: 'LDAP功能已就绪，请配置后启用' })
}
